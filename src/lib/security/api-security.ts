/**
 * Security and validation utilities for protected clinical endpoints and operations.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a string is a well-formed RFC 4122 UUID.
 */
export function isValidUUID(id: unknown): boolean {
  if (typeof id !== "string") return false;
  return UUID_REGEX.test(id.trim());
}

/**
 * Sanitizes a filename to prevent HTTP header injection or directory traversal.
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Standard HTTP security headers for clinical API routes.
 */
export const CLINICAL_API_SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "private, no-cache, no-store, must-revalidate",
};
