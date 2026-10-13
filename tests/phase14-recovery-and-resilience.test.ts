import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { NextRequest } from "next/server";
import { POST as passwordPost } from "../src/app/api/auth/password/route";
import { GET as mfaGet, POST as mfaPost } from "../src/app/api/auth/mfa/route";
import {
  clearAllRateLimits,
  getRateLimitKey,
  recordFailedAttempt,
} from "../src/lib/security/rate-limiter";

function makeRequest(
  path: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  }
): NextRequest {
  const url = `https://portal.drtashfin.example.com${path}`;
  const method = options?.method || "GET";
  const headers = new Headers(options?.headers || {});
  let bodyStr: string | undefined;
  if (options?.body !== undefined) {
    bodyStr = JSON.stringify(options.body);
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
  }
  return new NextRequest(url, {
    method,
    headers,
    body: bodyStr,
  });
}

describe("Phase 14: Disaster Recovery, Account Recovery & Operational Reliability Suite", () => {
  beforeEach(() => {
    clearAllRateLimits();
  });

  describe("1. Password Recovery & Rotation Hardening (/api/auth/password)", () => {
    it("blocks unauthenticated password change requests with 401", async () => {
      const req = makeRequest("/api/auth/password", {
        method: "POST",
        body: {
          action: "change",
          currentPassword: "OldPassword123",
          newPassword: "NewStrongPassword123",
        },
      });
      const res = await passwordPost(req);
      assert.equal(res.status, 401);
    });

    it("enforces rate limiting (3 requests / 15m) on password reset requests", async () => {
      const ip = "203.0.113.77";
      const email = "drtashfinahmed@gmail.com";

      for (let i = 1; i <= 3; i++) {
        const req = makeRequest("/api/auth/password", {
          method: "POST",
          headers: { "x-forwarded-for": ip },
          body: { action: "request_reset", email },
        });
        const res = await passwordPost(req);
        assert.equal(res.status, 200);
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(typeof body.smtpDeliveryDispatched, "boolean");
      }

      // 4th request within 15 minutes must be rate-limited (429)
      const blockedReq = makeRequest("/api/auth/password", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: { action: "request_reset", email },
      });
      const blockedRes = await passwordPost(blockedReq);
      assert.equal(blockedRes.status, 429);
    });

    it("rejects weak passwords on recovery token confirmation before upstream call", async () => {
      const req = makeRequest("/api/auth/password", {
        method: "POST",
        body: {
          action: "confirm_reset",
          tokenHash: "sample_recovery_token_hash",
          newPassword: "weak",
        },
      });
      const res = await passwordPost(req);
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.error, /at least 10 characters/i);
    });

    it("enforces brute-force lockout on recovery token confirmation after 5 failures", async () => {
      const ip = "203.0.113.88";
      const rateKey = getRateLimitKey(ip, "password_reset_confirm");
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
      }

      const req = makeRequest("/api/auth/password", {
        method: "POST",
        headers: { "x-forwarded-for": ip },
        body: {
          action: "confirm_reset",
          tokenHash: "forged_recovery_token_hash",
          newPassword: "StrongRecoveryPassword2026",
        },
      });
      const res = await passwordPost(req);
      assert.equal(res.status, 429);
    });
  });

  describe("2. TOTP MFA Route Protection & Rate Limiting (/api/auth/mfa)", () => {
    it("rejects unauthenticated GET and POST requests to /api/auth/mfa", async () => {
      const getRes = await mfaGet(makeRequest("/api/auth/mfa"));
      assert.equal(getRes.status, 401);

      const postRes = await mfaPost(
        makeRequest("/api/auth/mfa", {
          method: "POST",
          body: { action: "enroll" },
        })
      );
      assert.equal(postRes.status, 401);
    });
  });

  describe("3. DRTBKP02 (AES-256-GCM) Authenticated Backup Envelope & Tamper Detection", () => {
    function encryptEnvelopeV2(
      plaintext: Buffer,
      passphrase: string,
      kid = "k1-primary"
    ): Buffer {
      const salt = crypto.randomBytes(32);
      const nonce = crypto.randomBytes(12);
      const iter = 600_000;
      const key = crypto.pbkdf2Sync(passphrase, salt, iter, 32, "sha256");

      const headerObj = {
        alg: "AES-256-GCM",
        created_at: new Date().toISOString(),
        iter,
        kdf: "PBKDF2-HMAC-SHA256",
        kid,
        nonce_b64: nonce.toString("base64"),
        plaintext_sha256: crypto
          .createHash("sha256")
          .update(plaintext)
          .digest("hex"),
        plaintext_size: plaintext.length,
        salt_b64: salt.toString("base64"),
        tag_bits: 128,
        v: 2,
      };

      const headerBytes = Buffer.from(JSON.stringify(headerObj), "utf-8");
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(headerBytes.length, 0);
      const aad = Buffer.concat([
        Buffer.from("DRTBKP02", "ascii"),
        lenBuf,
        headerBytes,
      ]);

      const cipher = crypto.createCipheriv("aes-256-gcm", key, nonce);
      cipher.setAAD(aad);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();

      return Buffer.concat([aad, ciphertext, tag]);
    }

    function decryptEnvelopeV2(envelope: Buffer, passphrase: string): Buffer {
      assert.equal(envelope.subarray(0, 8).toString("ascii"), "DRTBKP02");
      const headerLen = envelope.readUInt32BE(8);
      const headerEnd = 12 + headerLen;
      const aad = envelope.subarray(0, headerEnd);
      const header = JSON.parse(
        envelope.subarray(12, headerEnd).toString("utf-8")
      );
      const ciphertextAndTag = envelope.subarray(headerEnd);
      const ciphertext = ciphertextAndTag.subarray(
        0,
        ciphertextAndTag.length - 16
      );
      const tag = ciphertextAndTag.subarray(ciphertextAndTag.length - 16);

      const salt = Buffer.from(header.salt_b64, "base64");
      const nonce = Buffer.from(header.nonce_b64, "base64");
      const key = crypto.pbkdf2Sync(
        passphrase,
        salt,
        Number(header.iter),
        32,
        "sha256"
      );

      const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAAD(aad);
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      const actualHash = crypto
        .createHash("sha256")
        .update(plaintext)
        .digest("hex");
      assert.equal(actualHash, header.plaintext_sha256);
      assert.equal(plaintext.length, header.plaintext_size);
      return plaintext;
    }

    it("generates unique nonces and salts for every backup and round-trips cleanly", () => {
      const payload = Buffer.from(
        "-- Synthetic PostgreSQL dump for DRTBKP02 verification\nSELECT 1;\n",
        "utf-8"
      );
      const secret = "test-master-backup-key-2026-drtashfin";

      const env1 = encryptEnvelopeV2(payload, secret, "k1-primary");
      const env2 = encryptEnvelopeV2(payload, secret, "k1-primary");

      // Identical plaintext must produce completely distinct ciphertexts due to CSPRNG salt + nonce
      assert.notDeepEqual(env1, env2);

      const dec1 = decryptEnvelopeV2(env1, secret);
      const dec2 = decryptEnvelopeV2(env2, secret);
      assert.deepEqual(dec1, payload);
      assert.deepEqual(dec2, payload);
    });

    it("rejects tampering in AAD envelope header, ciphertext, or 128-bit GCM auth tag before outputting plaintext", () => {
      const payload = Buffer.from("CONFIDENTIAL CLINICAL BACKUP PAYLOAD");
      const secret = "test-master-backup-key-2026-drtashfin";
      const env = encryptEnvelopeV2(payload, secret, "k1-primary");

      // 1. Tamper 1 bit in AAD header
      const tamperedAad = Buffer.from(env);
      tamperedAad[16] ^= 0x01;
      assert.throws(() => decryptEnvelopeV2(tamperedAad, secret));

      // 2. Tamper 1 bit in Ciphertext
      const tamperedCt = Buffer.from(env);
      tamperedCt[tamperedCt.length - 20] ^= 0x01;
      assert.throws(() => decryptEnvelopeV2(tamperedCt, secret));

      // 3. Tamper 1 bit in 128-bit GCM Auth Tag
      const tamperedTag = Buffer.from(env);
      tamperedTag[tamperedTag.length - 1] ^= 0x01;
      assert.throws(() => decryptEnvelopeV2(tamperedTag, secret));
    });
  });
});
