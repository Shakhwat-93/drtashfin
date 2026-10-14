import { NextRequest, NextResponse } from "next/server";
import { verifyDoctorSession } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsReminderService } from "@/lib/sms/sms-reminder-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Authorize: check either CRON Secret header OR Doctor session
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("x-cron-secret");
    let isAuthorized = false;

    if (cronSecret && authHeader && authHeader === cronSecret) {
      isAuthorized = true;
    } else {
      const session = await verifyDoctorSession(request);
      if (session.authenticated) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Valid doctor session or cron secret required." },
        { status: 401, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 25;

    const smsService = getSmsReminderService();
    const result = await smsService.processPendingReminders({
      now: new Date(),
      limit: Math.min(100, Math.max(1, isNaN(limit) ? 25 : limit)),
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        status: 200,
        headers: CLINICAL_API_SECURITY_HEADERS,
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process SMS reminder queue";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
