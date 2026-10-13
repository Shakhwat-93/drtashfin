import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseAnonClient,
  createAuthenticatedSupabaseClient,
  applySessionCookies,
} from "@/lib/auth/session";
import {
  getRateLimitKey,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/security/rate-limiter";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const totpCode =
      typeof body?.totpCode === "string" ? body.totpCode.trim() : "";

    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown-ip";
    const rateKey = getRateLimitKey(
      clientIp,
      "doctor_login",
      email || "unknown"
    );

    // 1. Check brute-force rate limit (5 attempts / 15 minutes)
    const rateStatus = checkRateLimit(rateKey, 5, 15 * 60 * 1000);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed sign-in attempts. Please wait ${Math.ceil(
            rateStatus.retryAfterSeconds / 60
          )} minutes before trying again.`,
          retryAfterSeconds: rateStatus.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            ...CLINICAL_API_SECURITY_HEADERS,
            "Retry-After": String(rateStatus.retryAfterSeconds),
          },
        }
      );
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Both email address and password are required." },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const anonClient = createServerSupabaseAnonClient();
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data?.session || !data?.user) {
      const updatedRate = recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
      return NextResponse.json(
        {
          error:
            "Invalid clinician credentials. Please verify your email and password.",
          remainingAttempts: updatedRate.remainingAttempts,
        },
        { status: 401, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    let activeSession = data.session;
    const authenticatedClient = createAuthenticatedSupabaseClient(
      activeSession.access_token
    );

    // 2. Verify single-doctor authorization in registry
    const { data: doctorRecord, error: doctorError } = await authenticatedClient
      .from("authorized_doctors")
      .select("user_id, doctor_code, email, full_name, specialty, is_active")
      .eq("user_id", data.user.id)
      .eq("is_active", true)
      .maybeSingle();

    const isAuthorized =
      Boolean(!doctorError && doctorRecord?.is_active) ||
      data.user.app_metadata?.role === "doctor";

    if (!isAuthorized) {
      await authenticatedClient.auth.signOut();
      recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
      return NextResponse.json(
        {
          error:
            "Access denied. This account is not authorized to access clinical records.",
        },
        { status: 403, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    // 3. Check if TOTP Multi-Factor Authentication (MFA) is enrolled and required
    const { data: aalData } =
      await authenticatedClient.auth.mfa.getAuthenticatorAssuranceLevel();

    if (
      aalData &&
      aalData.nextLevel === "aal2" &&
      aalData.currentLevel !== "aal2"
    ) {
      const { data: factorsData } =
        await authenticatedClient.auth.mfa.listFactors();
      const verifiedTotpFactor = factorsData?.totp?.find(
        (f) => f.status === "verified"
      );

      if (verifiedTotpFactor) {
        if (!totpCode) {
          return NextResponse.json(
            {
              mfaRequired: true,
              factorId: verifiedTotpFactor.id,
              message:
                "Multi-factor authentication is enabled. Enter your 6-digit authenticator code.",
            },
            { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
          );
        }

        const { data: mfaData, error: mfaError } =
          await authenticatedClient.auth.mfa.challengeAndVerify({
            factorId: verifiedTotpFactor.id,
            code: totpCode,
          });

        if (mfaError || !mfaData?.access_token) {
          const updatedRate = recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
          return NextResponse.json(
            {
              error: "Invalid 6-digit authenticator verification code.",
              mfaRequired: true,
              remainingAttempts: updatedRate.remainingAttempts,
            },
            { status: 401, headers: CLINICAL_API_SECURITY_HEADERS }
          );
        }

        activeSession = {
          ...activeSession,
          access_token: mfaData.access_token,
          refresh_token: mfaData.refresh_token || activeSession.refresh_token,
          expires_in: mfaData.expires_in || activeSession.expires_in,
        };
      }
    }

    // 4. Reset rate limiter on successful authentication
    resetRateLimit(rateKey);

    const userMeta = (data.user.user_metadata || {}) as Record<string, unknown>;
    const doctorProfile = {
      id: data.user.id,
      email: String(doctorRecord?.email || data.user.email || email),
      doctorCode: String(
        doctorRecord?.doctor_code ||
          data.user.app_metadata?.doctor_code ||
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
      role: "doctor" as const,
    };

    const response = NextResponse.json(
      {
        success: true,
        user: doctorProfile,
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );

    applySessionCookies(response, request, {
      accessToken: activeSession.access_token,
      refreshToken: activeSession.refresh_token,
      expiresIn: activeSession.expires_in,
    });

    return response;
  } catch (err: unknown) {
    console.error("[Doctor Login Route Error]", err);
    return NextResponse.json(
      { error: "An unexpected authentication error occurred." },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
