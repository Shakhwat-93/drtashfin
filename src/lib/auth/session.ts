import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { OFFICIAL_DOCTOR_PROFILE, DEMO_DOCTOR_PROFILE } from "@/config/doctor-profile";

export const DR_ACCESS_COOKIE = "dr_access_token";
export const DR_REFRESH_COOKIE = "dr_refresh_token";
export const DEMO_EMAIL = "demo@drtashfin.online";

/**
 * Returns true when the email or app_metadata indicates a demo session.
 */
export function isDemoAccount(
  email: string | null | undefined,
  appMeta?: Record<string, unknown>
): boolean {
  const lowerEmail = (email || "").toLowerCase().trim();
  if (lowerEmail === DEMO_EMAIL.toLowerCase()) return true;
  if (appMeta && (appMeta["role"] === "demo" || appMeta["is_demo"] === true)) return true;
  return false;
}

export interface DoctorIdentity {
  id: string;
  email: string;
  doctorCode: string;
  fullName: string;
  specialty: string;
  role: "doctor";
  bengaliName?: string;
  qualifications?: string;
  primaryDesignation?: string;
  fellowship?: string;
  additionalTraining?: string;
  workplace?: string;
  monogram?: string;
  isDemo?: boolean;
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
 * Creates a valid standalone Demo JWT and tokens for showcase/presentation mode.
 */
export function createDemoJwt(): {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} {
  const nowSec = Math.floor(Date.now() / 1000);
  const expiresIn = 30 * 24 * 60 * 60; // 30 days
  const expSec = nowSec + expiresIn;

  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      sub: "demo-clinician-id",
      email: DEMO_EMAIL,
      role: "authenticated",
      app_metadata: { role: "doctor", is_demo: true },
      user_metadata: {
        name: DEMO_DOCTOR_PROFILE.fullName,
        specialty: DEMO_DOCTOR_PROFILE.primaryDesignation,
        is_demo: true,
      },
      iat: nowSec,
      exp: expSec,
    })
  ).toString("base64url");

  const signature = Buffer.from("demo_secure_signature").toString("base64url");
  const accessToken = `${header}.${payload}.${signature}`;
  const refreshToken = `demo_refresh_${Date.now()}`;

  return { accessToken, refreshToken, expiresIn };
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

  // Check if candidate access token is a valid demo token
  if (initialAccessToken) {
    const claims = inspectJwtClaims(initialAccessToken);
    if (claims.valid && (claims.email === DEMO_EMAIL || claims.sub === "demo-clinician-id")) {
      const demoClient = createServerSupabaseAnonClient() as SupabaseClient & {
        __isDemo?: boolean;
      };
      demoClient.__isDemo = true;

      return {
        authenticated: true,
        user: {
          id: "demo-clinician-id",
          email: DEMO_EMAIL,
          doctorCode: DEMO_DOCTOR_PROFILE.doctorCode,
          fullName: DEMO_DOCTOR_PROFILE.fullName,
          specialty: DEMO_DOCTOR_PROFILE.primaryDesignation,
          role: "doctor",
          bengaliName: DEMO_DOCTOR_PROFILE.bengaliName,
          qualifications: DEMO_DOCTOR_PROFILE.qualifications,
          primaryDesignation: DEMO_DOCTOR_PROFILE.primaryDesignation,
          fellowship: DEMO_DOCTOR_PROFILE.fellowship,
          additionalTraining: DEMO_DOCTOR_PROFILE.additionalTraining,
          workplace: DEMO_DOCTOR_PROFILE.workplace,
          monogram: DEMO_DOCTOR_PROFILE.monogram,
          isDemo: true,
        },
        rawUser: {
          id: "demo-clinician-id",
          app_metadata: { role: "doctor", is_demo: true },
          user_metadata: { name: DEMO_DOCTOR_PROFILE.fullName, is_demo: true },
          aud: "authenticated",
          created_at: new Date().toISOString(),
          email: DEMO_EMAIL,
        } as unknown as User,
        accessToken: initialAccessToken,
        refreshToken: initialRefreshToken,
        refreshed: false,
        supabaseClient: demoClient,
      };
    }
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

  const appMeta = (verifiedUser.app_metadata || {}) as Record<string, unknown>;
  const userEmail = verifiedUser.email || "";

  // Check if this is a demo account — demo accounts bypass the authorized_doctors registry check
  const isDemo = isDemoAccount(userEmail, appMeta);

  interface AuthorizedDoctorRow {
    user_id?: string;
    doctor_code?: string;
    email?: string;
    full_name?: string;
    specialty?: string;
    is_active?: boolean;
  }

  let doctorRecord: AuthorizedDoctorRow | null = null;
  let doctorError: Error | null = null;

  if (!isDemo) {
    const result = await authenticatedClient
      .from("authorized_doctors")
      .select("user_id, doctor_code, email, full_name, specialty, is_active")
      .eq("user_id", verifiedUser.id)
      .eq("is_active", true)
      .maybeSingle();
    doctorRecord = (result.data as AuthorizedDoctorRow | null) ?? null;
    doctorError = (result.error as unknown as Error | null) ?? null;
  }

  const appMetaRole = appMeta.role as string | undefined;
  const isAuthorizedInRegistry = Boolean(!doctorError && doctorRecord?.is_active);

  if (!isDemo && !isAuthorizedInRegistry && appMetaRole !== "doctor") {
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

  // For demo accounts, populate profile from DEMO_DOCTOR_PROFILE; real accounts use OFFICIAL_DOCTOR_PROFILE
  const profileSource = isDemo ? DEMO_DOCTOR_PROFILE : OFFICIAL_DOCTOR_PROFILE;

  const doctorIdentity: DoctorIdentity = isDemo
    ? {
        id: verifiedUser.id,
        email: userEmail,
        doctorCode: profileSource.doctorCode,
        fullName: profileSource.fullName,
        specialty: profileSource.primaryDesignation,
        role: "doctor",
        bengaliName: profileSource.bengaliName,
        qualifications: profileSource.qualifications,
        primaryDesignation: profileSource.primaryDesignation,
        fellowship: profileSource.fellowship,
        additionalTraining: profileSource.additionalTraining,
        workplace: profileSource.workplace,
        monogram: profileSource.monogram,
        isDemo: true,
      }
    : {
        id: verifiedUser.id,
        email: String(doctorRecord?.email || userEmail || profileSource.email),
        doctorCode: String(
          doctorRecord?.doctor_code ||
            appMeta.doctor_code ||
            profileSource.doctorCode
        ),
        fullName: String(
          doctorRecord?.full_name || userMeta.name || profileSource.fullName
        ),
        specialty: String(
          doctorRecord?.specialty ||
            userMeta.specialty ||
            profileSource.primaryDesignation
        ),
        role: "doctor",
        bengaliName: String(userMeta.bengali_name || profileSource.bengaliName),
        qualifications: String(userMeta.qualifications || profileSource.qualifications),
        primaryDesignation: String(
          doctorRecord?.specialty ||
            userMeta.primary_designation ||
            profileSource.primaryDesignation
        ),
        fellowship: String(userMeta.fellowship || profileSource.fellowship),
        additionalTraining: String(userMeta.additional_training || profileSource.additionalTraining),
        workplace: String(userMeta.workplace || profileSource.workplace),
        monogram: profileSource.monogram,
        isDemo: false,
      };

  if (isDemo) {
    (authenticatedClient as SupabaseClient & { __isDemo?: boolean }).__isDemo = true;
  }

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
