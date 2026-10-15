import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getReportRepository } from "@/lib/data";
import { resolveDateRange } from "@/lib/reports/date-range-utils";
import { DateRangePreset, ReportQueryParams, ReportType } from "@/types/reports";

export const runtime = "nodejs";

const VALID_REPORT_TYPES: ReportType[] = [
  "patient-activity",
  "consultations",
  "prescriptions",
  "follow-ups",
  "diagnostics-procedures",
  "discharges",
  "sms-delivery",
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { type: rawType } = await params;
    const type = rawType as ReportType;

    if (!VALID_REPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid report type: '${rawType}'. Valid types are: ${VALID_REPORT_TYPES.join(", ")}` },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const chamberId = searchParams.get("chamberId") || "all";
    const preset = (searchParams.get("preset") as DateRangePreset) || "last30days";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const searchQuery = searchParams.get("searchQuery") || undefined;
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const procedureOrDiagnostic = (searchParams.get("recordType") as "all" | "diagnostic" | "procedure") || undefined;

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)));

    const dateRange = resolveDateRange({ preset, startDate, endDate });

    const queryParams: ReportQueryParams = {
      chamberId,
      dateRange,
      searchQuery,
      page,
      pageSize,
      status,
      category,
      type: procedureOrDiagnostic,
    };

    const repo = getReportRepository(auth.supabaseClient);

    let result;
    switch (type) {
      case "patient-activity":
        result = await repo.getPatientActivityReport(queryParams);
        break;
      case "consultations":
        result = await repo.getConsultationReport(queryParams);
        break;
      case "prescriptions":
        result = await repo.getPrescriptionReport(queryParams);
        break;
      case "follow-ups":
        result = await repo.getFollowUpReport(queryParams);
        break;
      case "diagnostics-procedures":
        result = await repo.getDiagnosticProcedureReport(queryParams);
        break;
      case "discharges":
        result = await repo.getDischargeReport(queryParams);
        break;
      case "sms-delivery":
        result = await repo.getSmsDeliveryReport(queryParams);
        break;
    }

    return NextResponse.json(
      {
        success: true,
        reportType: type,
        dateRange,
        chamberId,
        ...result,
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch medical report";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
