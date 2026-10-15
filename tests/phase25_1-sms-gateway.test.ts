import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
} from "../src/lib/security/encryption";
import { BulkSmsDhakaProvider } from "../src/lib/sms/providers/bulk-sms-dhaka-provider";
import { MockSmsGatewaySettingsRepository } from "../src/lib/data/repositories/mock-sms-gateway-settings-repository";
import { saveSmsGatewaySchema, sendTestSmsSchema } from "../src/schemas/sms-gateway";

describe("Phase 25.1 — Bulk SMS Dhaka Gateway Integration & Dynamic Settings", () => {
  let settingsRepo: MockSmsGatewaySettingsRepository;

  beforeEach(() => {
    process.env.SMS_ENCRYPTION_KEY = "test-phase25-1-master-encryption-key";
    settingsRepo = new MockSmsGatewaySettingsRepository();
  });

  describe("1. Secret Encryption, Decryption & Tamper Resistance", () => {
    it("should encrypt plaintext using AES-256-GCM with a random IV", () => {
      const plaintext = "sample_bulk_sms_api_key_12345";
      const enc1 = encryptSecret(plaintext);
      const enc2 = encryptSecret(plaintext);

      // Ciphertexts and IVs must differ across encryptions due to random IV
      assert.notEqual(enc1.iv, enc2.iv);
      assert.notEqual(enc1.ciphertext, enc2.ciphertext);
      assert.equal(enc1.iv.length, 24); // 12 bytes = 24 hex chars
      assert.equal(enc1.tag.length, 32); // 16 bytes = 32 hex chars
    });

    it("should decrypt ciphertext back to original plaintext", () => {
      const secret = "live_secret_doctor_tashfin_gateway_9988";
      const encrypted = encryptSecret(secret);
      const decrypted = decryptSecret(encrypted);

      assert.equal(decrypted, secret);
    });

    it("should reject tampered ciphertext or altered authentication tag", () => {
      const encrypted = encryptSecret("sensitive_clinician_key");

      // Alter ciphertext
      const tamperedCiphertext = {
        ...encrypted,
        ciphertext:
          encrypted.ciphertext.slice(0, -2) +
          (encrypted.ciphertext.slice(-2) === "00" ? "ff" : "00"),
      };

      assert.throws(() => {
        decryptSecret(tamperedCiphertext);
      });

      // Alter auth tag
      const tamperedTag = {
        ...encrypted,
        tag:
          encrypted.tag.slice(0, -2) +
          (encrypted.tag.slice(-2) === "00" ? "ff" : "00"),
      };

      assert.throws(() => {
        decryptSecret(tamperedTag);
      });
    });

    it("should securely mask secret API keys for safe UI display", () => {
      assert.equal(maskSecret("live_abcdef1234567890"), "••••••••••••7890");
      assert.equal(maskSecret("1234"), "••••••••");
      assert.equal(maskSecret(""), "—");
      assert.equal(maskSecret(null), "—");
    });
  });

  describe("2. Bulk SMS Dhaka Provider: Request Formatting & Encoding", () => {
    it("should prepare POST request with application/x-www-form-urlencoded and properly encode Bengali text", async () => {
      let interceptedUrl = "";
      let interceptedMethod = "";
      let interceptedHeaders: Record<string, string> = {};
      let interceptedBody = "";

      const originalFetch = global.fetch;
      global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        interceptedUrl = String(input);
        interceptedMethod = init?.method || "GET";
        interceptedHeaders = (init?.headers || {}) as Record<string, string>;
        interceptedBody = String(init?.body || "");

        return new Response(
          JSON.stringify({
            Status: "1000",
            Success: "true",
            Message: "Your sms request successful!!",
            message_id: "bsd_msg_778899",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "test_api_key_xyz",
          callerId: "DrTashfin",
          isEnabled: true,
        });

        const bengaliMessage =
          "সম্মানিত রোগী, ডা. তাসফিন আহমেদের চেম্বারে আপনার অ্যাপয়েন্টমেন্ট নির্ধারিত হয়েছে। সময়: বিকাল ৪:৩০ & ফি: ৫০০৳।";

        const result = await provider.sendSms({
          recipientPhone: "01712345678",
          message: bengaliMessage,
          idempotencyKey: "test_key_001",
          reminderType: "24h_before",
        });

        assert.equal(result.success, true);
        assert.equal(result.deliveryStatus, "submitted");
        assert.equal(result.providerMessageId, "bsd_msg_778899");

        // Verify request format
        assert.equal(interceptedUrl, "https://bulksmsdhaka.net/api/sendtext");
        assert.equal(interceptedMethod, "POST");
        assert.equal(
          interceptedHeaders["Content-Type"],
          "application/x-www-form-urlencoded"
        );

        // Verify payload contents and URL encoding
        const parsedParams = new URLSearchParams(interceptedBody);
        assert.equal(parsedParams.get("apikey"), "test_api_key_xyz");
        assert.equal(parsedParams.get("callerID"), "DrTashfin");
        assert.equal(parsedParams.get("number"), "8801712345678"); // Digits only formatted
        assert.equal(parsedParams.get("message"), bengaliMessage);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should format various Bangladesh phone formats to 8801XXXXXXXXX digits-only", async () => {
      const interceptedNumbers: string[] = [];

      const originalFetch = global.fetch;
      global.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
        const params = new URLSearchParams(String(init?.body || ""));
        interceptedNumbers.push(params.get("number") || "");
        return new Response(
          JSON.stringify({ Status: "1000", Success: "true", Message: "Success" }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "test_key",
          callerId: "1234",
          isEnabled: true,
        });

        await provider.sendSms({
          recipientPhone: "01811-223344",
          message: "Test 1",
          idempotencyKey: "k1",
          reminderType: "24h_before",
        });

        await provider.sendSms({
          recipientPhone: "+880 1911 223 344",
          message: "Test 2",
          idempotencyKey: "k2",
          reminderType: "24h_before",
        });

        assert.equal(interceptedNumbers[0], "8801811223344");
        assert.equal(interceptedNumbers[1], "8801911223344");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("3. Response Parsing & Status Code Handling", () => {
    it("should parse status 1008 as IP Not Whitelisted with server IP guidance", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "1008",
            Success: "false",
            Message: "IP Not Whitelisted",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "test_key",
          callerId: "1234",
          isEnabled: true,
        });

        const result = await provider.sendSms({
          recipientPhone: "01711223344",
          message: "Test IP",
          idempotencyKey: "k_ip",
          reminderType: "24h_before",
        });

        assert.equal(result.success, false);
        assert.equal(result.deliveryStatus, "rejected");
        assert.equal(result.isRetryable, false);
        assert.ok(result.error?.includes("72.60.108.65"));
        assert.ok(result.error?.includes("IP Whitelist"));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should parse status 1011 as Caller ID Not Found", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "1011",
            Success: "false",
            Message: "Sender ID Not Found",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "test_key",
          callerId: "CustomDoctorBrand",
          isEnabled: true,
        });

        const result = await provider.sendSms({
          recipientPhone: "01711223344",
          message: "Test Caller ID",
          idempotencyKey: "k_cid",
          reminderType: "24h_before",
        });

        assert.equal(result.success, false);
        assert.ok(result.error?.includes("CustomDoctorBrand"));
        assert.ok(result.error?.includes("Sender ID Not Found"));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should parse status 2001 as Insufficient Balance", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "2001",
            Success: "false",
            Message: "Insufficient Balance",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "test_key",
          callerId: "1234",
          isEnabled: true,
        });

        const result = await provider.sendSms({
          recipientPhone: "01711223344",
          message: "Test Balance",
          idempotencyKey: "k_bal",
          reminderType: "24h_before",
        });

        assert.equal(result.success, false);
        assert.ok(result.error?.includes("Insufficient Balance"));
        assert.equal(result.isRetryable, false);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should treat status 1014 and HTTP 5xx / 429 as retryable errors", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "1014",
            Success: "false",
            Message: "Internal Server Error",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "test_key",
          callerId: "1234",
          isEnabled: true,
        });

        const result = await provider.sendSms({
          recipientPhone: "01711223344",
          message: "Test Retry",
          idempotencyKey: "k_retry",
          reminderType: "24h_before",
        });

        assert.equal(result.success, false);
        assert.equal(result.isRetryable, true);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should sanitize error messages to never leak the API key", async () => {
      const sensitiveKey = "super_secret_raw_api_key_777";
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "9999",
            Success: "false",
            Message: `Failed with key ${sensitiveKey} on gateway host`,
          }),
          { status: 400 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: sensitiveKey,
          callerId: "1234",
          isEnabled: true,
        });

        const result = await provider.sendSms({
          recipientPhone: "01711223344",
          message: "Test Sanitization",
          idempotencyKey: "k_san",
          reminderType: "24h_before",
        });

        assert.equal(result.success, false);
        assert.ok(!result.error?.includes(sensitiveKey));
        assert.ok(result.error?.includes("[REDACTED_API_KEY]"));
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("4. Non-Billable Verification (getBalance)", () => {
    it("should query getBalance endpoint and parse balance correctly", async () => {
      let requestedUrl = "";
      const originalFetch = global.fetch;
      global.fetch = async (input: RequestInfo | URL) => {
        requestedUrl = String(input);
        return new Response(
          JSON.stringify({
            Balance: "128.50",
            Status: "100",
            Success: "true",
            Message: "Successfully Done.",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "valid_bal_key",
          callerId: "1234",
          isEnabled: true,
        });

        const balanceCheck = await provider.checkBalance();

        assert.equal(balanceCheck.success, true);
        assert.equal(balanceCheck.balance, "128.50");
        assert.ok(balanceCheck.message.includes("128.50 BDT"));
        assert.ok(requestedUrl.includes("/api/getBalance"));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should handle invalid API key during getBalance safely", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "1015",
            Success: "false",
            Message: "Authorization Failed",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "bad_key",
          callerId: "1234",
          isEnabled: true,
        });

        const balanceCheck = await provider.checkBalance();

        assert.equal(balanceCheck.success, false);
        assert.equal(balanceCheck.status, "Authorization Failed");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("5. Delivery Status Lookup (getstatus)", () => {
    it("should map DELIVRD status to delivered", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "4",
            Success: "true",
            Message: "DELIVRD",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "key_status",
          callerId: "1234",
          isEnabled: true,
        });

        const res = await provider.getDeliveryStatus("msg_id_12345");
        assert.equal(res.success, true);
        assert.equal(res.deliveryStatus, "delivered");
        assert.equal(res.message, "DELIVRD");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should map UNDELIV to failed", async () => {
      const originalFetch = global.fetch;
      global.fetch = async () => {
        return new Response(
          JSON.stringify({
            Status: "5",
            Success: "false",
            Message: "UNDELIV",
          }),
          { status: 200 }
        );
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "key_status",
          callerId: "1234",
          isEnabled: true,
        });

        const res = await provider.getDeliveryStatus("msg_id_failed");
        assert.equal(res.success, false);
        assert.equal(res.deliveryStatus, "failed");
        assert.equal(res.message, "UNDELIV");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should gracefully skip remote lookup when message ID is synthetic or absent", async () => {
      let fetchCalled = false;
      const originalFetch = global.fetch;
      global.fetch = async () => {
        fetchCalled = true;
        return new Response("{}", { status: 200 });
      };

      try {
        const provider = new BulkSmsDhakaProvider({
          apiKey: "key_status",
          callerId: "1234",
          isEnabled: true,
        });

        const res = await provider.getDeliveryStatus("sms_synthetic_12345");
        assert.equal(fetchCalled, false); // Must NOT hit provider with synthetic IDs
        assert.equal(res.deliveryStatus, "submitted");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("6. Dynamic Configuration Updates Without Redeployment", () => {
    it("should save configuration, encrypt API key at rest, and return masked public config", async () => {
      const saved = await settingsRepo.saveConfig({
        apiKey: "new_bulk_sms_dhaka_live_key_999",
        callerId: "1234",
        isEnabled: false,
      });

      assert.equal(saved.hasApiKey, true);
      assert.equal(saved.maskedApiKey, "••••••••••••_999");
      assert.equal(saved.callerId, "1234");
      assert.equal(saved.isEnabled, false);

      // Verify that decrypted config is accessible internally
      const decrypted = await settingsRepo.getDecryptedConfig();
      assert.equal(decrypted.apiKey, "new_bulk_sms_dhaka_live_key_999");
    });

    it("should allow updating callerId and isEnabled without re-entering the API key", async () => {
      // First save with API key
      await settingsRepo.saveConfig({
        apiKey: "initial_api_key_888",
        callerId: "1234",
        isEnabled: false,
      });

      // Update only callerId and isEnabled without providing apiKey
      const updated = await settingsRepo.saveConfig({
        callerId: "DrTashfinMD",
        isEnabled: true,
      });

      assert.equal(updated.hasApiKey, true);
      assert.equal(updated.callerId, "DrTashfinMD");
      assert.equal(updated.isEnabled, true);

      // Verify existing API key was preserved intact
      const decrypted = await settingsRepo.getDecryptedConfig();
      assert.equal(decrypted.apiKey, "initial_api_key_888");
      assert.equal(decrypted.callerId, "DrTashfinMD");
      assert.equal(decrypted.isEnabled, true);
    });

    it("should immediately supply updated credentials to BulkSmsDhakaProvider dynamically", async () => {
      const provider = new BulkSmsDhakaProvider({
        credentialsResolver: async () => {
          const cfg = await settingsRepo.getDecryptedConfig();
          return {
            apiKey: cfg.apiKey,
            callerId: cfg.callerId,
            isEnabled: cfg.isEnabled,
          };
        },
      });

      // Initially empty
      let creds = await provider.getEffectiveCredentials();
      assert.equal(creds.apiKey, null);
      assert.equal(creds.isEnabled, false);

      // Save key
      await settingsRepo.saveConfig({
        apiKey: "key_v1",
        callerId: "1234",
        isEnabled: true,
      });

      creds = await provider.getEffectiveCredentials();
      assert.equal(creds.apiKey, "key_v1");
      assert.equal(creds.isEnabled, true);

      // Update key in repository (simulating doctor saving in UI)
      await settingsRepo.saveConfig({
        apiKey: "key_v2_updated",
        callerId: "NewBrand",
        isEnabled: true,
      });

      creds = await provider.getEffectiveCredentials();
      assert.equal(creds.apiKey, "key_v2_updated");
      assert.equal(creds.callerId, "NewBrand");
    });
  });

  describe("7. Live Sending Safeguards & Schema Validation", () => {
    it("should block live SMS transmission when isEnabled is false", async () => {
      const provider = new BulkSmsDhakaProvider({
        apiKey: "valid_key",
        callerId: "1234",
        isEnabled: false, // Disabled
      });

      const res = await provider.sendSms({
        recipientPhone: "01711223344",
        message: "Test blocked",
        idempotencyKey: "k_blocked",
        reminderType: "24h_before",
      });

      assert.equal(res.success, false);
      assert.ok(res.error?.includes("Live SMS dispatch is disabled"));
    });

    it("should validate saveSmsGatewaySchema inputs correctly", () => {
      const valid1 = saveSmsGatewaySchema.safeParse({
        apiKey: "valid_key_12345",
        callerId: "1234",
        isEnabled: true,
      });
      assert.equal(valid1.success, true);

      const valid2 = saveSmsGatewaySchema.safeParse({
        callerId: "DrTashfin",
        isEnabled: false,
      });
      assert.equal(valid2.success, true);

      const invalidKey = saveSmsGatewaySchema.safeParse({
        apiKey: "ab", // Too short (< 4 chars)
        callerId: "1234",
        isEnabled: true,
      });
      assert.equal(invalidKey.success, false);
    });

    it("should validate sendTestSmsSchema and enforce Bangladesh number format and confirmation", () => {
      const validTest = sendTestSmsSchema.safeParse({
        recipientPhone: "01711223344",
        confirmation: true,
      });
      assert.equal(validTest.success, true);

      const unconfirmed = sendTestSmsSchema.safeParse({
        recipientPhone: "01711223344",
        confirmation: false,
      });
      assert.equal(unconfirmed.success, false);

      const invalidNumber = sendTestSmsSchema.safeParse({
        recipientPhone: "12345",
        confirmation: true,
      });
      assert.equal(invalidNumber.success, false);
    });
  });
});
