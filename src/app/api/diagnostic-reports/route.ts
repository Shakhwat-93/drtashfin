import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getDiagnosticReportRepository } from "@/lib/data";
import { createDiagnosticReportSchema } from "@/schemas/diagnostic-report";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId");
    const consultationId = searchParams.get("consultationId");

    const repo = getDiagnosticReportRepository();

    if (consultationId) {
      const reports = await repo.getReportsForConsultation(consultationId);
      return NextResponse.json(
        { reports, count: reports.length },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    if (patientId) {
      const reports = await repo.getReportsForPatient(patientId);
      return NextResponse.json(
        { reports, count: reports.length },
        { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { error: "Either patientId or consultationId query parameter is required" },
      { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch diagnostic reports";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON request payload" },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const validation = createDiagnosticReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 422, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const repo = getDiagnosticReportRepository();
    const createdReport = await repo.createReport(validation.data);

    return NextResponse.json(
      {
        report: createdReport,
        message: "Diagnostic report reference created successfully",
      },
      { status: 201, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create diagnostic report";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
