import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsProviderConfigStatus } from "@/lib/sms/providers";
import { getSmsGatewaySettingsRepository } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const settingsRepo = getSmsGatewaySettingsRepository();
    const publicConfig = await settingsRepo.getPublicConfig();
    const configStatus = getSmsProviderConfigStatus();

    const isLive = publicConfig.isEnabled && publicConfig.hasApiKey;

    return NextResponse.json(
      {
        ...configStatus,
        isLiveEnabled: isLive,
        configured: publicConfig.hasApiKey,
        senderId: publicConfig.callerId,
        providerType: publicConfig.providerName,
        supportedTimezone: "Asia/Dhaka",
        message: isLive
          ? "Live SMS dispatch active via Bulk SMS Dhaka."
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
