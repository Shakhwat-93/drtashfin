import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";

export const DR_ACCESS_COOKIE = "dr_access_token";
export const DR_REFRESH_COOKIE = "dr_refresh_token";

export interface DoctorIdentity {
  id: string;
  email: string;
  doctorCode: string;
  fullName: string;
  specialty: string;
  role: "doctor";
}

export interface VerifiedDoctorSession {
  authenticated: true;
  user: DoctorIdentity;
  rawUser: User;
  accessToken: string;
  refreshToken: string | null;
  refreshed: boolean;
  supabaseClient: SupabaseClient;
}

export interface UnauthenticatedSession {
  authenticated: false;
  status: 401 | 403;
  reason: string;
}

export type DoctorSessionResult =
  | VerifiedDoctorSession
  | UnauthenticatedSession;

function getInternalSupabaseConfig(): { url: string; anonKey: string } {
  const url =
    process.env.SUPABASE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://placeholder.supabase.co";
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
  return { url, anonKey };
}

/**
 * Creates a stateless server-side Supabase client using the anon key.
 */
export function createServerSupabaseAnonClient(): SupabaseClient {
  const { url, anonKey } = getInternalSupabaseConfig();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Creates a request-scoped Supabase client authenticated with the clinician's JWT.
 * All PostgREST queries made through this client execute under the `authenticated`
 * role with `auth.uid()` set to the verified doctor's user ID.
 */
export function createAuthenticatedSupabaseClient(
  accessToken: string
): SupabaseClient {
  const { url, anonKey } = getInternalSupabaseConfig();
  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Fast structural and expiry check on a JWT for Proxy redirects before full server check.
 * Does NOT replace server-side signature verification in API handlers.
 */
export function inspectJwtClaims(token: string | undefined | null): {
  valid: boolean;
  expired: boolean;
  sub?: string;
  email?: string;
  role?: string;
  appRole?: string;
} {
  if (!token || typeof token !== "string") {
    return { valid: false, expired: false };
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return { valid: false, expired: false };
  }
  try {
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    const exp = typeof payload.exp === "number" ? payload.exp : 0;
    const nowSec = Math.floor(Date.now() / 1000);

    if (exp > 0 && exp <= nowSec) {
      return { valid: false, expired: true };
    }

    const appMeta = (payload.app_metadata || {}) as Record<string, unknown>;
    return {
      valid: Boolean(payload.sub && payload.role === "authenticated"),
      expired: false,
      sub: typeof payload.sub === "string" ? payload.sub : undefined,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
      appRole: typeof appMeta.role === "string" ? appMeta.role : undefined,
    };
  } catch {
    return { valid: false, expired: false };
  }
}

/**
 * Determines whether a request was made over HTTPS (either directly or behind a TLS reverse proxy).
 */
export function isSecureRequest(request: NextRequest): boolean {
  const proto = request.headers.get("x-forwarded-proto");
  if (proto) {
    return proto.split(",")[0].trim().toLowerCase() === "https";
  }
  return request.nextUrl.protocol === "https:";
}

/**
 * Attaches HttpOnly, SameSite=Lax, Secure session cookies to a NextResponse.
 */
export function applySessionCookies(
  response: NextResponse,
  request: NextRequest,
  tokens: {
    accessToken: string;
    refreshToken?: string | null;
    expiresIn?: number;
  }
): NextResponse {
  const secure = isSecureRequest(request);
  const accessMaxAge = tokens.expiresIn || 3600; // 1 hour default

  response.cookies.set(DR_ACCESS_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });

  if (tokens.refreshToken) {
    response.cookies.set(DR_REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }

  return response;
}

/**
 * Clears clinician authentication cookies on logout or invalid session.
 */
export function clearSessionCookies(
  response: NextResponse,
  request?: NextRequest
): NextResponse {
  const secure = request ? isSecureRequest(request) : false;

  response.cookies.set(DR_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(DR_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

/**
 * Extracts access and refresh tokens from cookies or Authorization header.
 */
export function extractTokensFromRequest(request: NextRequest): {
  accessToken: string | null;
  refreshToken: string | null;
} {
  let accessToken = request.cookies.get(DR_ACCESS_COOKIE)?.value || null;
  const refreshToken = request.cookies.get(DR_REFRESH_COOKIE)?.value || null;

  if (!accessToken) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      const candidate = authHeader.slice(7).trim();
      // Ignore the public anon key if passed as a bearer token
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (candidate && candidate !== anonKey) {
        accessToken = candidate;
      }
    }
  }

  return { accessToken, refreshToken };
}

/**
 * Authoritatively verifies the clinician's session against Supabase Auth
 * and the `public.authorized_doctors` registry.
 * Transparently refreshes expired access tokens when a valid refresh token is present.
 */
export async function verifyDoctorSession(
  request: NextRequest
): Promise<DoctorSessionResult> {
  const { accessToken: initialAccessToken, refreshToken: initialRefreshToken } =
    extractTokensFromRequest(request);

  if (!initialAccessToken && !initialRefreshToken) {
    return {
      authenticated: false,
      status: 401,
      reason: "Authentication required. Valid clinician session missing.",
    };
  }

  const anonClient = createServerSupabaseAnonClient();
  let activeAccessToken = initialAccessToken;
  let activeRefreshToken = initialRefreshToken;
  let verifiedUser: User | null = null;
  let refreshed = false;

  // 1. Verify current access token if present
  if (activeAccessToken) {
    const { data, error } = await anonClient.auth.getUser(activeAccessToken);
    if (!error && data?.user) {
      verifiedUser = data.user;
    }
  }

  // 2. If access token is expired/invalid and refresh token is available, refresh session
  if (!verifiedUser && activeRefreshToken) {
    const { data: refreshData, error: refreshError } =
      await anonClient.auth.refreshSession({
        refresh_token: activeRefreshToken,
      });

    if (
      !refreshError &&
      refreshData?.session?.access_token &&
      refreshData?.user
    ) {
      activeAccessToken = refreshData.session.access_token;
      activeRefreshToken =
        refreshData.session.refresh_token || activeRefreshToken;
      verifiedUser = refreshData.user;
      refreshed = true;
    }
  }

  if (!verifiedUser || !activeAccessToken) {
    return {
      authenticated: false,
      status: 401,
      reason: "Invalid or expired clinician session. Please sign in again.",
    };
  }

  // 3. Enforce single-doctor authorization via database registry + app_metadata
  const authenticatedClient =
    createAuthenticatedSupabaseClient(activeAccessToken);

  const { data: doctorRecord, error: doctorError } = await authenticatedClient
    .from("authorized_doctors")
    .select("user_id, doctor_code, email, full_name, specialty, is_active")
    .eq("user_id", verifiedUser.id)
    .eq("is_active", true)
    .maybeSingle();

  const appMetaRole = verifiedUser.app_metadata?.role;
  const isAuthorizedInRegistry = Boolean(!doctorError && doctorRecord?.is_active);

  if (!isAuthorizedInRegistry && appMetaRole !== "doctor") {
    return {
      authenticated: false,
      status: 403,
      reason:
        "Access denied. Authenticated account is not an authorized clinician.",
    };
  }

  const userMeta = (verifiedUser.user_metadata || {}) as Record<
    string,
    unknown
  >;

  const doctorIdentity: DoctorIdentity = {
    id: verifiedUser.id,
    email: String(doctorRecord?.email || verifiedUser.email || ""),
    doctorCode: String(
      doctorRecord?.doctor_code ||
        verifiedUser.app_metadata?.doctor_code ||
        "dr-tashfin"
    ),
    fullName: String(
      doctorRecord?.full_name || userMeta.name || "Dr. Tashfin Ahmed"
    ),
    specialty: String(
      doctorRecord?.specialty ||
        userMeta.specialty ||
        "Cardiology & Medicine"
    ),
    role: "doctor",
  };

  return {
    authenticated: true,
    user: doctorIdentity,
    rawUser: verifiedUser,
    accessToken: activeAccessToken,
    refreshToken: activeRefreshToken,
    refreshed,
    supabaseClient: authenticatedClient,
  };
}

/**
 * Route-level authorization guard for protected clinical API handlers.
 */
export async function requireDoctorAuth(request: NextRequest): Promise<
  | ({
      authorized: true;
    } & VerifiedDoctorSession)
  | {
      authorized: false;
      response: NextResponse;
    }
> {
  const session = await verifyDoctorSession(request);

  if (!session.authenticated) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: session.reason },
        { status: session.status, headers: CLINICAL_API_SECURITY_HEADERS }
      ),
    };
  }

  return {
    authorized: true,
    ...session,
  };
}
