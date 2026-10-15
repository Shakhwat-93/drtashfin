/**
 * Strict HTTPS Publication & Research URL Validator
 * Phase 29: Doctor Lifetime Achievements & Evidence Management
 *
 * Implements strict HTTPS URL validation for external medical research,
 * journal publications, DOIs, PubMed, conferences, and institutional links.
 * Prohibits insecure HTTP, private/internal network addresses, credentials in URLs,
 * and malicious URI schemes (javascript:, data:, file:, etc.).
 */

export interface PublicationUrlValidationResult {
  isValid: boolean;
  normalizedUrl: string | null;
  error?: string;
}

// Private / loopback IPv4 patterns
const PRIVATE_IPV4_REGEX =
  /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|0\.)/;

/**
 * Validates and normalizes an external publication or research link.
 * Allows valid public internet HTTPS URLs (e.g. doi.org, pubmed.ncbi.nlm.nih.gov, nature.com, thelancet.com).
 * Rejects insecure HTTP, localhost, private IP ranges, and malformed inputs.
 */
export function validateAndNormalizePublicationUrl(
  rawUrl: string | null | undefined
): PublicationUrlValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      isValid: true,
      normalizedUrl: null,
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: true,
      normalizedUrl: null,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      normalizedUrl: null,
      error: "Malformed publication URL format",
    };
  }

  // 1. Strictly enforce HTTPS protocol
  if (parsed.protocol !== "https:") {
    return {
      isValid: false,
      normalizedUrl: null,
      error: "Only secure HTTPS publication URLs are accepted (http:// is prohibited)",
    };
  }

  // 2. Prohibit user credentials in URL (e.g. https://user:pass@domain.com)
  if (parsed.username || parsed.password) {
    return {
      isValid: false,
      normalizedUrl: null,
      error: "Publication URL must not contain embedded user credentials",
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Prohibit localhost and single-label hosts
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    !hostname.includes(".")
  ) {
    return {
      isValid: false,
      normalizedUrl: null,
      error: "Localhost and internal local domain names are not permitted",
    };
  }

  // 4. Prohibit private and loopback IPv4/IPv6 addresses (SSRF mitigation)
  if (
    PRIVATE_IPV4_REGEX.test(hostname) ||
    hostname === "::1" ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc00:")
  ) {
    return {
      isValid: false,
      normalizedUrl: null,
      error: "Private and internal IP addresses are not permitted",
    };
  }

  return {
    isValid: true,
    normalizedUrl: parsed.toString(),
  };
}
