import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsReminderService } from "@/lib/sms/sms-reminder-service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reminderId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { reminderId } = await params;
    if (!reminderId) {
      return NextResponse.json(
        { error: "Missing reminderId parameter." },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const smsService = getSmsReminderService();
    const updatedReminder = await smsService.retryReminder(reminderId);

    return NextResponse.json(
      {
        success: true,
        reminder: updatedReminder,
        message:
          updatedReminder.status === "sent"
            ? "SMS reminder dispatched successfully."
            : `SMS reminder failed: ${updatedReminder.failureReason || "unknown reason"}`,
      },
      {
        status: 200,
        headers: CLINICAL_API_SECURITY_HEADERS,
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to retry SMS reminder";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
