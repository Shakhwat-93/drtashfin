/**
 * Sliding-window rate limiter for authentication and sensitive security endpoints.
 * Protects against brute-force login attempts and password recovery abuse.
 */

export interface RateLimitEntry {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Extracts a normalized client identifier from a request (IP + optional target identifier).
 */
export function getRateLimitKey(
  ipOrHeader: string | null | undefined,
  action: string,
  identifier?: string
): string {
  const ip = (ipOrHeader || "unknown-ip").split(",")[0].trim().toLowerCase();
  const id = identifier ? identifier.trim().toLowerCase() : "global";
  return `${action}:${ip}:${id}`;
}

/**
 * Checks whether an action is currently permitted for the given key.
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS
): RateLimitCheckResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  // If currently locked out
  if (entry.lockedUntil && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // If window has expired, reset entry
  if (now - entry.firstAttemptAt > windowMs) {
    rateLimitStore.delete(key);
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  const remaining = Math.max(0, maxAttempts - entry.attempts);
  if (remaining === 0) {
    const retryAfterSeconds = Math.ceil(
      (entry.firstAttemptAt + windowMs - now) / 1000
    );
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  return {
    allowed: true,
    remainingAttempts: remaining,
    retryAfterSeconds: 0,
  };
}

/**
 * Records a failed attempt and locks the key if maxAttempts is reached.
 */
export function recordFailedAttempt(
  key: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS,
  lockoutMs: number = DEFAULT_LOCKOUT_MS
): RateLimitCheckResult {
  const now = Date.now();
  const existing = rateLimitStore.get(key);

  if (!existing || now - existing.firstAttemptAt > windowMs) {
    const attempts = 1;
    const lockedUntil = attempts >= maxAttempts ? now + lockoutMs : null;
    rateLimitStore.set(key, {
      attempts,
      firstAttemptAt: now,
      lockedUntil,
    });
    return {
      allowed: attempts < maxAttempts,
      remainingAttempts: Math.max(0, maxAttempts - attempts),
      retryAfterSeconds: lockedUntil ? Math.ceil(lockoutMs / 1000) : 0,
    };
  }

  existing.attempts += 1;
  if (existing.attempts >= maxAttempts) {
    existing.lockedUntil = now + lockoutMs;
  }
  rateLimitStore.set(key, existing);

  const remaining = Math.max(0, maxAttempts - existing.attempts);
  const retryAfterSeconds = existing.lockedUntil
    ? Math.ceil((existing.lockedUntil - now) / 1000)
    : 0;

  return {
    allowed: remaining > 0,
    remainingAttempts: remaining,
    retryAfterSeconds,
  };
}

/**
 * Clears rate-limit state upon successful authentication or for testing.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clears all rate-limit entries (used in isolated test suites).
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
