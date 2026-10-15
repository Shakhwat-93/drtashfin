import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getReportRepository } from "@/lib/data";
import { resolveDateRange } from "@/lib/reports/date-range-utils";
import { generateReportCsv } from "@/lib/reports/csv-export-utils";
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const rawType = searchParams.get("type");
    const type = rawType as ReportType;

    if (!type || !VALID_REPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Missing or invalid 'type' parameter. Valid types are: ${VALID_REPORT_TYPES.join(", ")}` },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const chamberId = searchParams.get("chamberId") || "all";
    const preset = (searchParams.get("preset") as DateRangePreset) || "last30days";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const searchQuery = searchParams.get("searchQuery") || undefined;
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const procedureOrDiagnostic = (searchParams.get("recordType") as "all" | "diagnostic" | "procedure") || undefined;

    const dateRange = resolveDateRange({ preset, startDate, endDate });

    // Fetch up to 5,000 records for CSV export
    const queryParams: ReportQueryParams = {
      chamberId,
      dateRange,
      searchQuery,
      page: 1,
      pageSize: 5000,
      status,
      category,
      type: procedureOrDiagnostic,
    };

    const repo = getReportRepository(auth.supabaseClient);

    let rows: unknown[] = [];
    switch (type) {
      case "patient-activity":
        rows = (await repo.getPatientActivityReport(queryParams)).data;
        break;
      case "consultations":
        rows = (await repo.getConsultationReport(queryParams)).data;
        break;
      case "prescriptions":
        rows = (await repo.getPrescriptionReport(queryParams)).data;
        break;
      case "follow-ups":
        rows = (await repo.getFollowUpReport(queryParams)).data;
        break;
      case "diagnostics-procedures":
        rows = (await repo.getDiagnosticProcedureReport(queryParams)).data;
        break;
      case "discharges":
        rows = (await repo.getDischargeReport(queryParams)).data;
        break;
      case "sms-delivery":
        rows = (await repo.getSmsDeliveryReport(queryParams)).data;
        break;
    }

    const { filename, csv } = generateReportCsv(type, rows);

    return new Response(csv, {
      status: 200,
      headers: {
        ...CLINICAL_API_SECURITY_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to generate report export";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
