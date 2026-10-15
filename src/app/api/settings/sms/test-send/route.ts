import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsProvider } from "@/lib/sms/providers";
import { getSmsGatewaySettingsRepository } from "@/lib/data";
import { sendTestSmsSchema } from "@/schemas/sms-gateway";
import { maskPhoneNumber } from "@/lib/sms/phone-utils";

export const runtime = "nodejs";

/**
 * POST /api/settings/sms/test-send
 * Dispatches an explicit test SMS to a doctor-specified mobile number.
 * Strict safeguards:
 * - Requires explicit confirmation.
 * - Never uses stored patient records.
 * - Does not include clinical information.
 */
export async function POST(request: NextRequest) {
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

    const validation = sendTestSmsSchema.safeParse(bodyJson);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        },
        { status: 422, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const { recipientPhone } = validation.data;
    const provider = getSmsProvider();
    const repo = getSmsGatewaySettingsRepository(auth.supabaseClient);

    // Prepare non-clinical practice test message
    const timestampStr = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
    });
    const testMessage = `Dr. Tashfin Practice: Gateway integration test SMS sent at ${timestampStr} (Dhaka). System operational.`;

    const sendResult = await provider.sendSms({
      recipientPhone,
      message: testMessage,
      idempotencyKey: `test_sms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      reminderType: "24h_before",
    });

    const masked = maskPhoneNumber(recipientPhone);

    // Record test outcome
    await repo.recordTestResult({
      status: sendResult.success ? "Test SMS accepted by provider" : "Test SMS Failed",
      error: sendResult.error,
    });

    if (sendResult.success) {
      return NextResponse.json(
        {
          success: true,
          deliveryStatus: sendResult.deliveryStatus,
          providerMessageId: sendResult.providerMessageId,
          recipientPhoneMasked: masked,
          message: "Test SMS accepted by provider for delivery.",
        },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: false,
        deliveryStatus: sendResult.deliveryStatus,
        recipientPhoneMasked: masked,
        error: sendResult.error || "Provider rejected the test SMS",
        isRetryable: sendResult.isRetryable,
      },
      { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to execute test SMS dispatch";
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
