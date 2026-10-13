import { NextRequest, NextResponse } from "next/server";
import {
  verifyDoctorSession,
  applySessionCookies,
  clearSessionCookies,
} from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await verifyDoctorSession(request);

  if (!session.authenticated) {
    const response = NextResponse.json(
      {
        authenticated: false,
        error: session.reason,
      },
      { status: session.status, headers: CLINICAL_API_SECURITY_HEADERS }
    );
    clearSessionCookies(response, request);
    return response;
  }

  let mfaEnabled = false;
  try {
    const { data: factorsData } =
      await session.supabaseClient.auth.mfa.listFactors();
    mfaEnabled = Boolean(
      factorsData?.totp?.some((f) => f.status === "verified")
    );
  } catch {
    mfaEnabled = false;
  }

  const response = NextResponse.json(
    {
      authenticated: true,
      user: session.user,
      mfaEnabled,
    },
    { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
  );

  if (session.refreshed) {
    applySessionCookies(response, request, {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
  }

  return response;
}
