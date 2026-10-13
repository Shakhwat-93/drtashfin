import { NextRequest, NextResponse } from "next/server";
import {
  requireDoctorAuth,
  applySessionCookies,
  createServerSupabaseAnonClient,
} from "@/lib/auth/session";
import {
  getRateLimitKey,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/security/rate-limiter";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireDoctorAuth(request);
  if (!auth.authorized) {
    return auth.response;
  }

  const { data, error } = await auth.supabaseClient.auth.mfa.listFactors();
  if (error) {
    return NextResponse.json(
      { error: `Failed to list MFA factors: ${error.message}` },
      { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }

  const { data: aalData } =
    await auth.supabaseClient.auth.mfa.getAuthenticatorAssuranceLevel();

  return NextResponse.json(
    {
      success: true,
      totp: data?.totp || [],
      currentLevel: aalData?.currentLevel || "aal1",
      nextLevel: aalData?.nextLevel || "aal1",
    },
    { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
  );
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown-ip";
    const rateKey = getRateLimitKey(clientIp, "doctor_mfa", auth.user.email);

    const rateStatus = checkRateLimit(rateKey, 5, 15 * 60 * 1000);
    if (!rateStatus.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed MFA attempts. Please wait ${Math.ceil(
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

    const body = await request.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "enroll") {
      const friendlyName =
        typeof body?.friendlyName === "string" && body.friendlyName.trim()
          ? body.friendlyName.trim()
          : "Dr. Tashfin Authenticator";

      // Clean up any stale unverified TOTP factors so repeated modal opens never collide
      const { data: existingFactors } =
        await auth.supabaseClient.auth.mfa.listFactors();
      const allTotp = existingFactors?.totp || [];
      const alreadyVerified = allTotp.find((f) => f.status === "verified");
      if (alreadyVerified) {
        return NextResponse.json(
          {
            error:
              "An active TOTP authenticator is already enrolled. Remove it first before enrolling a new device.",
          },
          { status: 409, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      for (const factor of allTotp) {
        if (factor.status !== "verified") {
          await auth.supabaseClient.auth.mfa
            .unenroll({ factorId: factor.id })
            .catch(() => null);
        }
      }

      const { data, error } = await auth.supabaseClient.auth.mfa.enroll({
        factorType: "totp",
        friendlyName,
      });

      if (error || !data) {
        return NextResponse.json(
          { error: `Failed to enroll TOTP factor: ${error?.message}` },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      return NextResponse.json(
        {
          success: true,
          factorId: data.id,
          totp: data.totp,
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    if (action === "verify") {
      const factorId =
        typeof body?.factorId === "string" ? body.factorId.trim() : "";
      const code = typeof body?.code === "string" ? body.code.trim() : "";

      if (!factorId || !code) {
        return NextResponse.json(
          { error: "factorId and 6-digit code are required." },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const { data, error } =
        await auth.supabaseClient.auth.mfa.challengeAndVerify({
          factorId,
          code,
        });

      if (error || !data) {
        const updatedRate = recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
        return NextResponse.json(
          {
            error: "Invalid verification code. Please try again.",
            remainingAttempts: updatedRate.remainingAttempts,
          },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      resetRateLimit(rateKey);

      const response = NextResponse.json(
        {
          success: true,
          assuranceLevel: "aal2",
          message: "Multi-factor authentication (TOTP) activated.",
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );

      applySessionCookies(response, request, {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      });

      return response;
    }

    if (action === "unenroll") {
      const factorId =
        typeof body?.factorId === "string" ? body.factorId.trim() : "";
      if (!factorId) {
        return NextResponse.json(
          { error: "factorId is required." },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const { error } = await auth.supabaseClient.auth.mfa.unenroll({
        factorId,
      });

      if (error) {
        recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
        return NextResponse.json(
          { error: `Failed to unenroll MFA factor: ${error.message}` },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      resetRateLimit(rateKey);

      const response = NextResponse.json(
        {
          success: true,
          assuranceLevel: "aal1",
          message: "Authenticator factor removed.",
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );

      if (auth.refreshToken) {
        const anonClient = createServerSupabaseAnonClient();
        const { data: refreshed } = await anonClient.auth.refreshSession({
          refresh_token: auth.refreshToken,
        });
        if (refreshed?.session?.access_token) {
          applySessionCookies(response, request, {
            accessToken: refreshed.session.access_token,
            refreshToken: refreshed.session.refresh_token,
            expiresIn: refreshed.session.expires_in,
          });
        }
      }

      return response;
    }

    return NextResponse.json(
      { error: "Unsupported MFA action." },
      { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    console.error("[Doctor MFA Route Error]", err);
    return NextResponse.json(
      { error: "Failed to process MFA request." },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
