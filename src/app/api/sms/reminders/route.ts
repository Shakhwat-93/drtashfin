import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getSmsReminderRepository } from "@/lib/data";
import { SmsReminderFilterParams, SmsReminderStatus, SmsReminderType } from "@/types/sms";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const followUpId = searchParams.get("followUpId") || undefined;
    const patientId = searchParams.get("patientId") || undefined;
    const status = searchParams.get("status") as SmsReminderStatus | "all" | undefined;
    const reminderType = searchParams.get("reminderType") as SmsReminderType | undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const filterParams: SmsReminderFilterParams = {
      followUpId,
      patientId,
      status: status || "all",
      reminderType,
      startDate,
      endDate,
      limit: Math.min(100, Math.max(1, isNaN(limit) ? 50 : limit)),
      offset: Math.max(0, isNaN(offset) ? 0 : offset),
    };

    const repo = getSmsReminderRepository();
    const result = await repo.getReminders(filterParams);
    const reminders = Array.isArray(result) ? result : result.items;
    const count = Array.isArray(result) ? result.length : result.total;

    return NextResponse.json(
      {
        reminders,
        count,
        filters: filterParams,
      },
      {
        status: 200,
        headers: CLINICAL_API_SECURITY_HEADERS,
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to load SMS reminders";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
