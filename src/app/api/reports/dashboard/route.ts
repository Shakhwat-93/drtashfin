import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getReportRepository } from "@/lib/data";
import { resolveDateRange } from "@/lib/reports/date-range-utils";
import { DateRangePreset } from "@/types/reports";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const chamberId = searchParams.get("chamberId") || "all";
    const preset = (searchParams.get("preset") as DateRangePreset) || "last30days";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const resolvedRange = resolveDateRange({ preset, startDate, endDate });

    // Use authenticated client if available
    const repo = getReportRepository(auth.supabaseClient);
    const data = await repo.getClinicalDashboardData(chamberId, resolvedRange);

    return NextResponse.json(
      { success: true, data },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate clinical dashboard metrics";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
