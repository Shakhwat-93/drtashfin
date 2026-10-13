import { NextRequest, NextResponse } from "next/server";
import {
  requireDoctorAuth,
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

function validateStrongPassword(password: string): string | null {
  if (!password || password.length < 10) {
    return "New password must be at least 10 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "New password must include at least one uppercase letter.";
  }
  if (!/[a-z]/.test(password)) {
    return "New password must include at least one lowercase letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "New password must include at least one number.";
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "change";

    const clientIp =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown-ip";

    // -------------------------------------------------------------------------
    // Workflow 1: Authenticated Doctor Password Change
    // -------------------------------------------------------------------------
    if (action === "change") {
      const auth = await requireDoctorAuth(request);
      if (!auth.authorized) {
        return auth.response;
      }

      const rateKey = getRateLimitKey(
        clientIp,
        "password_change",
        auth.user.email
      );
      const rateStatus = checkRateLimit(rateKey, 5, 15 * 60 * 1000);
      if (!rateStatus.allowed) {
        return NextResponse.json(
          {
            error: "Too many password change attempts. Please wait 15 minutes.",
          },
          { status: 429, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const currentPassword =
        typeof body?.currentPassword === "string" ? body.currentPassword : "";
      const newPassword =
        typeof body?.newPassword === "string" ? body.newPassword : "";

      if (!currentPassword || !newPassword) {
        return NextResponse.json(
          { error: "Current password and new password are required." },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const strengthError = validateStrongPassword(newPassword);
      if (strengthError) {
        return NextResponse.json(
          { error: strengthError },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      // Re-authenticate current password before allowing update
      const anonClient = createServerSupabaseAnonClient();
      const { data: verifyData, error: verifyError } =
        await anonClient.auth.signInWithPassword({
          email: auth.user.email,
          password: currentPassword,
        });

      if (verifyError || !verifyData?.session) {
        recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
        return NextResponse.json(
          { error: "Current password verification failed." },
          { status: 401, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const verifiedClient = createAuthenticatedSupabaseClient(
        verifyData.session.access_token
      );
      const { error: updateError } = await verifiedClient.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update password: ${updateError.message}` },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      resetRateLimit(rateKey);

      const response = NextResponse.json(
        {
          success: true,
          message: "Clinician password updated and session rotated.",
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );

      applySessionCookies(response, request, {
        accessToken: verifyData.session.access_token,
        refreshToken: verifyData.session.refresh_token,
        expiresIn: verifyData.session.expires_in,
      });

      return response;
    }

    // -------------------------------------------------------------------------
    // Workflow 2: Request Password Recovery
    // -------------------------------------------------------------------------
    if (action === "request_reset") {
      const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const rateKey = getRateLimitKey(
        clientIp,
        "password_reset_request",
        email || "unknown"
      );

      const rateStatus = checkRateLimit(rateKey, 3, 15 * 60 * 1000);
      if (!rateStatus.allowed) {
        return NextResponse.json(
          {
            error:
              "Too many recovery requests. Please wait 15 minutes before trying again.",
          },
          { status: 429, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      if (!email) {
        return NextResponse.json(
          { error: "Email address is required." },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      recordFailedAttempt(rateKey, 3, 15 * 60 * 1000);

      try {
        const anonClient = createServerSupabaseAnonClient();
        const origin = request.nextUrl.origin;
        await anonClient.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/reset-password`,
        });
      } catch {
        // Suppress upstream mailer error details to prevent account enumeration
      }

      return NextResponse.json(
        {
          success: true,
          message:
            "If the email matches the authorized clinician account and SMTP is configured, a recovery token has been dispatched.",
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    // -------------------------------------------------------------------------
    // Workflow 3: Confirm Password Recovery with Verified Token
    // -------------------------------------------------------------------------
    if (action === "confirm_reset") {
      const tokenHash =
        typeof body?.tokenHash === "string" ? body.tokenHash.trim() : "";
      const newPassword =
        typeof body?.newPassword === "string" ? body.newPassword : "";

      const rateKey = getRateLimitKey(clientIp, "password_reset_confirm");
      const rateStatus = checkRateLimit(rateKey, 5, 15 * 60 * 1000);
      if (!rateStatus.allowed) {
        return NextResponse.json(
          {
            error: "Too many token verification attempts. Please wait 15 minutes.",
          },
          { status: 429, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      if (!tokenHash || !newPassword) {
        return NextResponse.json(
          { error: "Recovery token and new password are required." },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const strengthError = validateStrongPassword(newPassword);
      if (strengthError) {
        return NextResponse.json(
          { error: strengthError },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const anonClient = createServerSupabaseAnonClient();
      const { data: otpData, error: otpError } =
        await anonClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });

      if (otpError || !otpData?.session || !otpData?.user) {
        recordFailedAttempt(rateKey, 5, 15 * 60 * 1000);
        return NextResponse.json(
          { error: "Invalid or expired password recovery token." },
          { status: 401, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const recoveryClient = createAuthenticatedSupabaseClient(
        otpData.session.access_token
      );

      // Verify user is the authorized doctor
      const { data: doctorRecord } = await recoveryClient
        .from("authorized_doctors")
        .select("user_id, is_active")
        .eq("user_id", otpData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (
        !doctorRecord?.is_active &&
        otpData.user.app_metadata?.role !== "doctor"
      ) {
        await recoveryClient.auth.signOut();
        return NextResponse.json(
          { error: "Account is not an authorized clinician." },
          { status: 403, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const { error: updateErr } = await recoveryClient.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        return NextResponse.json(
          { error: `Failed to set new password: ${updateErr.message}` },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      resetRateLimit(rateKey);

      const response = NextResponse.json(
        {
          success: true,
          message: "Password reset completed. You are now signed in.",
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );

      applySessionCookies(response, request, {
        accessToken: otpData.session.access_token,
        refreshToken: otpData.session.refresh_token,
        expiresIn: otpData.session.expires_in,
      });

      return response;
    }

    return NextResponse.json(
      { error: "Unsupported password action." },
      { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    console.error("[Doctor Password Route Error]", err);
    return NextResponse.json(
      { error: "Failed to process password request." },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
