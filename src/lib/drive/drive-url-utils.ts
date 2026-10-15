/**
 * Google Drive URL Validation, Normalization and Security Utilities
 * Phase 26: Diagnostic Test Reports & Google Drive Link-Only Management
 */

export interface GoogleDriveValidationResult {
  isValid: boolean;
  normalizedUrl: string | null;
  resourceType: "file" | "folder" | "document" | "spreadsheet" | "presentation" | "other" | null;
  resourceId: string | null;
  error?: string;
}

const ALLOWED_HOSTNAMES = new Set(["drive.google.com", "docs.google.com"]);

// Base64URL-compatible resource ID regex
const RESOURCE_ID_REGEX = /^[a-zA-Z0-9_-]{10,120}$/;

/**
 * Validates and normalizes Google Drive file, folder, and document URLs.
 * Strictly requires HTTPS and whitelisted Google domains (drive.google.com / docs.google.com).
 * Rejects non-Google domains, unencrypted HTTP, and malicious inputs.
 */
export function validateAndNormalizeGoogleDriveUrl(
  rawUrl: string | null | undefined
): GoogleDriveValidationResult {
  if (!rawUrl || typeof rawUrl !== "string") {
    return {
      isValid: false,
      normalizedUrl: null,
      resourceType: null,
      resourceId: null,
      error: "Google Drive URL is required",
    };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return {
      isValid: false,
      normalizedUrl: null,
      resourceType: null,
      resourceId: null,
      error: "Google Drive URL cannot be empty",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      isValid: false,
      normalizedUrl: null,
      resourceType: null,
      resourceId: null,
      error: "Malformed URL format",
    };
  }

  // 1. Enforce HTTPS strictly
  if (parsed.protocol !== "https:") {
    return {
      isValid: false,
      normalizedUrl: null,
      resourceType: null,
      resourceId: null,
      error: "Only secure HTTPS Google Drive URLs are accepted",
    };
  }

  // 2. Enforce exact hostname whitelist (protect against subdomain spoofing)
  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTNAMES.has(hostname)) {
    return {
      isValid: false,
      normalizedUrl: null,
      resourceType: null,
      resourceId: null,
      error: "Only Google Drive or Google Docs domains are allowed (drive.google.com or docs.google.com)",
    };
  }

  const pathname = parsed.pathname;

  // Pattern 1: drive.google.com/file/d/{id}/...
  const fileMatch = pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch && fileMatch[1]) {
    const id = fileMatch[1];
    if (!RESOURCE_ID_REGEX.test(id)) {
      return {
        isValid: false,
        normalizedUrl: null,
        resourceType: null,
        resourceId: null,
        error: "Invalid Google Drive file ID",
      };
    }
    return {
      isValid: true,
      normalizedUrl: `https://drive.google.com/file/d/${id}/view`,
      resourceType: "file",
      resourceId: id,
    };
  }

  // Pattern 2: drive.google.com/drive/folders/{id} or /drive/u/{user}/folders/{id}
  const folderMatch = pathname.match(/(?:\/drive)?(?:\/u\/\d+)?\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) {
    const id = folderMatch[1];
    if (!RESOURCE_ID_REGEX.test(id)) {
      return {
        isValid: false,
        normalizedUrl: null,
        resourceType: null,
        resourceId: null,
        error: "Invalid Google Drive folder ID",
      };
    }
    return {
      isValid: true,
      normalizedUrl: `https://drive.google.com/drive/folders/${id}`,
      resourceType: "folder",
      resourceId: id,
    };
  }

  // Pattern 3: drive.google.com/open?id={id} or /uc?id={id}
  if (hostname === "drive.google.com" && (pathname === "/open" || pathname === "/uc")) {
    const id = parsed.searchParams.get("id");
    if (id && RESOURCE_ID_REGEX.test(id)) {
      return {
        isValid: true,
        normalizedUrl: `https://drive.google.com/file/d/${id}/view`,
        resourceType: "file",
        resourceId: id,
      };
    }
  }

  // Pattern 4: docs.google.com/document/d/{id}/...
  const docMatch = pathname.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch && docMatch[1]) {
    const id = docMatch[1];
    if (RESOURCE_ID_REGEX.test(id)) {
      return {
        isValid: true,
        normalizedUrl: `https://docs.google.com/document/d/${id}/edit`,
        resourceType: "document",
        resourceId: id,
      };
    }
  }

  // Pattern 5: docs.google.com/spreadsheets/d/{id}/...
  const sheetMatch = pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch && sheetMatch[1]) {
    const id = sheetMatch[1];
    if (RESOURCE_ID_REGEX.test(id)) {
      return {
        isValid: true,
        normalizedUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
        resourceType: "spreadsheet",
        resourceId: id,
      };
    }
  }

  // Pattern 6: docs.google.com/presentation/d/{id}/...
  const presentationMatch = pathname.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (presentationMatch && presentationMatch[1]) {
    const id = presentationMatch[1];
    if (RESOURCE_ID_REGEX.test(id)) {
      return {
        isValid: true,
        normalizedUrl: `https://docs.google.com/presentation/d/${id}/edit`,
        resourceType: "presentation",
        resourceId: id,
      };
    }
  }

  return {
    isValid: false,
    normalizedUrl: null,
    resourceType: null,
    resourceId: null,
    error: "URL is not a recognized Google Drive file, folder, or document link",
  };
}

/**
 * Masks a Google Drive URL for safe logging and telemetry
 * Obscures the middle portion of the resource identifier to prevent leaking private sharing keys.
 */
export function maskGoogleDriveUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "—";
  const result = validateAndNormalizeGoogleDriveUrl(url);
  if (!result.isValid || !result.resourceId) {
    return "[invalid-url]";
  }

  const id = result.resourceId;
  const maskedId =
    id.length > 8
      ? `${id.slice(0, 4)}****${id.slice(-4)}`
      : `${id.slice(0, 2)}****`;

  if (result.resourceType === "folder") {
    return `https://drive.google.com/drive/folders/${maskedId}`;
  }
  return `https://drive.google.com/file/d/${maskedId}/view`;
}
