import crypto from "crypto";

const KDF_SALT = "dr-tashfin-sms-gateway-v1-salt";

export interface EncryptedPayload {
  ciphertext: string; // hex
  iv: string; // hex
  tag: string; // hex
}

/**
 * Derives a deterministic 256-bit encryption key from a master secret.
 * Priority:
 * 1. Explicit secretOverride
 * 2. process.env.SMS_ENCRYPTION_KEY
 * 3. process.env.APP_ENCRYPTION_KEY
 * 4. process.env.SUPABASE_SERVICE_ROLE_KEY
 */
export function getDerivedEncryptionKey(secretOverride?: string): Buffer {
  const secret =
    secretOverride ||
    process.env.SMS_ENCRYPTION_KEY ||
    process.env.APP_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.npm_lifecycle_event === "test" ||
      !process.env.NODE_ENV
    ) {
      return crypto.scryptSync("test-encryption-master-secret", KDF_SALT, 32);
    }
    throw new Error(
      "Missing encryption secret. Configure SMS_ENCRYPTION_KEY or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  // Derive 32 bytes (256 bits) for AES-256-GCM using scrypt
  return crypto.scryptSync(secret, KDF_SALT, 32);
}

/**
 * Encrypts a plaintext secret using AES-256-GCM.
 * A cryptographically random 96-bit (12-byte) IV is generated for every encryption.
 */
export function encryptSecret(
  plaintext: string,
  keyOverride?: Buffer
): EncryptedPayload {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    throw new Error("Cannot encrypt empty or non-string plaintext");
  }

  const key = keyOverride || getDerivedEncryptionKey();
  const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return {
    ciphertext,
    iv: iv.toString("hex"),
    tag,
  };
}

/**
 * Decrypts an AES-256-GCM payload.
 * Throws an error if the payload has been tampered with or if the key is incorrect.
 */
export function decryptSecret(
  payload: EncryptedPayload,
  keyOverride?: Buffer
): string {
  if (!payload || !payload.ciphertext || !payload.iv || !payload.tag) {
    throw new Error("Invalid encrypted payload: missing ciphertext, iv, or tag");
  }

  const key = keyOverride || getDerivedEncryptionKey();
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Safely masks a secret string (e.g. API key) for UI display and logs without leaking plaintext.
 * Example: "live_abcd1234efgh5678" -> "••••••••••••5678"
 */
export function maskSecret(secret?: string | null): string {
  if (!secret || typeof secret !== "string") {
    return "—";
  }
  const trimmed = secret.trim();
  if (trimmed.length <= 4) {
    return "••••••••";
  }
  const lastFour = trimmed.slice(-4);
  return `••••••••••••${lastFour}`;
}
