import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsProviderConfigStatus } from "@/lib/sms/providers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const configStatus = getSmsProviderConfigStatus();

    return NextResponse.json(
      {
        ...configStatus,
        supportedTimezone: "Asia/Dhaka",
        message: configStatus.isLiveEnabled
          ? "Live SMS dispatch active."
          : "SMS operating in safe simulation (mock) mode. No real SMS messages will be billed or sent.",
      },
      {
        status: 200,
        headers: CLINICAL_API_SECURITY_HEADERS,
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retrieve SMS configuration";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
