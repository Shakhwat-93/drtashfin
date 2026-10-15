import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsProvider } from "@/lib/sms/providers";
import { getSmsGatewaySettingsRepository } from "@/lib/data";

export const runtime = "nodejs";

/**
 * POST /api/settings/sms/validate
 * Performs non-billable verification of Bulk SMS Dhaka credentials using the getBalance endpoint.
 * Does NOT dispatch any SMS messages.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const provider = getSmsProvider();
    const repo = getSmsGatewaySettingsRepository(auth.supabaseClient);

    if (typeof provider.checkBalance !== "function") {
      return NextResponse.json(
        {
          success: false,
          status: "Not Supported",
          message: "Current provider does not support non-billable balance verification.",
        },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const result = await provider.checkBalance();

    // Record the test result in settings record
    await repo.recordTestResult({
      status: result.status,
      balance: result.balance,
      error: result.error,
    });

    return NextResponse.json(result, {
      status: 200,
      headers: CLINICAL_API_SECURITY_HEADERS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to validate SMS gateway connection";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
