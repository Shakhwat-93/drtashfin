import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsGatewaySettingsRepository } from "@/lib/data";
import { saveSmsGatewaySchema } from "@/schemas/sms-gateway";

export const runtime = "nodejs";

/**
 * GET /api/settings/sms
 * Returns safe public SMS gateway configuration metadata.
 * Strictly avoids returning raw API keys or decryption tokens.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const repo = getSmsGatewaySettingsRepository(auth.supabaseClient);
    const config = await repo.getPublicConfig();

    return NextResponse.json(config, {
      status: 200,
      headers: CLINICAL_API_SECURITY_HEADERS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load SMS gateway settings";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

/**
 * PUT /api/settings/sms
 * Updates SMS gateway settings (API Key, Caller ID, and live dispatch toggle).
 * Encrypts API Key at rest using AES-256-GCM.
 */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    let bodyJson: unknown;
    try {
      bodyJson = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const validation = saveSmsGatewaySchema.safeParse(bodyJson);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const repo = getSmsGatewaySettingsRepository(auth.supabaseClient);
    const updated = await repo.saveConfig(validation.data);

    return NextResponse.json(
      {
        message: "SMS gateway settings saved successfully.",
        config: updated,
      },
      {
        status: 200,
        headers: CLINICAL_API_SECURITY_HEADERS,
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save SMS gateway settings";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
