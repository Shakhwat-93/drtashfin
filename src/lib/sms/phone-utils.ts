import crypto from "crypto";

export interface PhoneNormalizationResult {
  isValid: boolean;
  normalized?: string; // Standard E.164: +8801XXXXXXXXX
  nationalFormat?: string; // 01XXXXXXXXX
  operator?: string;
  error?: string;
}

// Bangladesh mobile operators prefixes (after 0 or +880)
// 13: GP, 14: BL, 15: Teletalk, 16: Robi/Airtel, 17: GP, 18: Robi, 19: BL
const BD_MOBILE_OPERATOR_PREFIXES: Record<string, string> = {
  "13": "Grameenphone",
  "14": "Banglalink",
  "15": "Teletalk",
  "16": "Robi / Airtel",
  "17": "Grameenphone",
  "18": "Robi",
  "19": "Banglalink",
};

/**
 * Normalizes and validates a recipient phone number for Bangladesh SMS delivery.
 * Supports inputs like:
 * - "+8801711223344"
 * - "8801711223344"
 * - "01711223344"
 * - "01711-223344"
 * - "+880 1711 223 344"
 *
 * Strict Bangladesh mobile criteria:
 * - Must be an 11-digit national number starting with 01[3-9]
 * - Standardized to E.164 format: +8801XXXXXXXXX
 */
export function normalizeBdPhoneNumber(rawPhone?: string | null): PhoneNormalizationResult {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      error: "Phone number is empty or missing.",
    };
  }

  // 1. Strip all non-digit characters except leading plus
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");

  // 2. Handle country code prefix variations
  if (cleaned.startsWith("+880")) {
    cleaned = cleaned.substring(4); // Remove "+880"
  } else if (cleaned.startsWith("880")) {
    cleaned = cleaned.substring(3); // Remove "880"
  } else if (cleaned.startsWith("00880")) {
    cleaned = cleaned.substring(5); // Remove "00880"
  }

  // 3. Ensure national prefix starts with "0"
  if (!cleaned.startsWith("0")) {
    cleaned = "0" + cleaned;
  }

  // 4. Validate national format length: exactly 11 digits
  if (!/^\d{11}$/.test(cleaned)) {
    return {
      isValid: false,
      error: `Invalid phone number length. Expected 11 digits for Bangladesh mobile, got ${cleaned.length} digits.`,
    };
  }

  // 5. Validate mobile operator prefix: 01[3-9]
  const prefix = cleaned.substring(1, 3); // 2 digits after leading 0
  const operator = BD_MOBILE_OPERATOR_PREFIXES[prefix];
  if (!operator) {
    return {
      isValid: false,
      error: `Invalid Bangladesh mobile operator prefix '0${prefix}'. Only 013-019 mobile numbers support SMS.`,
    };
  }

  const normalized = `+880${cleaned.substring(1)}`; // +8801XXXXXXXXX

  return {
    isValid: true,
    normalized,
    nationalFormat: cleaned,
    operator,
  };
}

/**
 * Returns normalized E.164 string (+8801XXXXXXXXX) or null if invalid.
 */
export function getNormalizedBdPhoneNumber(rawPhone?: string | null): string | null {
  const res = normalizeBdPhoneNumber(rawPhone);
  return res.isValid && res.normalized ? res.normalized : null;
}

/**
 * Masks a phone number for safe display in UI and audit logs without exposing PII.
 * Example: "+8801711223344" -> "+88017****3344"
 */
export function maskPhoneNumber(phone?: unknown): string {
  if (!phone || typeof phone !== "string") return "—";
  const cleaned = phone.trim();
  if (cleaned.length < 8) return "***";

  // If normalized +88017XXXXXXXXX (14 chars)
  if (cleaned.startsWith("+880") && cleaned.length === 14) {
    return `${cleaned.substring(0, 6)}****${cleaned.substring(10)}`;
  }

  // If national 11-digit format 01XXXXXXXXX
  if (cleaned.startsWith("01") && cleaned.length === 11) {
    return `${cleaned.substring(0, 4)}****${cleaned.substring(7)}`;
  }

  // Generic fallback: keep first 4 and last 3 characters
  const start = cleaned.substring(0, 4);
  const end = cleaned.substring(cleaned.length - 3);
  return `${start}****${end}`;
}

/**
 * Computes a secure, reproducible SHA-256 hash of the normalized phone number.
 * Used for database deduplication and auditing without persisting raw PII in SMS logs.
 */
export function hashPhoneNumber(phone?: unknown): string {
  if (!phone || typeof phone !== "string") {
    return crypto.createHash("sha256").update("").digest("hex");
  }
  const norm = normalizeBdPhoneNumber(phone);
  const target = norm.isValid && norm.normalized ? norm.normalized : phone.trim();
  return crypto.createHash("sha256").update(target).digest("hex");
}
