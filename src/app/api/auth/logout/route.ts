import { NextRequest, NextResponse } from "next/server";
import {
  extractTokensFromRequest,
  createAuthenticatedSupabaseClient,
  clearSessionCookies,
} from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { accessToken } = extractTokensFromRequest(request);

  if (accessToken) {
    try {
      const client = createAuthenticatedSupabaseClient(accessToken);
      await client.auth.signOut();
    } catch {
      // Proceed to clear cookies even if upstream revocation fails
    }
  }

  const response = NextResponse.json(
    {
      success: true,
      message: "Clinician session terminated securely.",
    },
    { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
  );

  clearSessionCookies(response, request);
  return response;
}
