import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth, applySessionCookies } from "@/lib/auth/session";
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

  return NextResponse.json(
    {
      success: true,
      totp: data?.totp || [],
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

    const body = await request.json().catch(() => null);
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "enroll") {
      const friendlyName =
        typeof body?.friendlyName === "string" && body.friendlyName.trim()
          ? body.friendlyName.trim()
          : "Dr. Tashfin Authenticator";

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
        return NextResponse.json(
          { error: "Invalid verification code. Please try again." },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      const response = NextResponse.json(
        {
          success: true,
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
        return NextResponse.json(
          { error: `Failed to unenroll MFA factor: ${error.message}` },
          { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Authenticator factor removed.",
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );
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
