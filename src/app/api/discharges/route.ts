import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getDischargeRepository } from "@/lib/data";
import { createDischargeSchema } from "@/schemas/discharge";
import { DischargeStatus, DISCHARGE_STATUSES } from "@/types/discharge";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get("patientId") || undefined;
    const consultationId = searchParams.get("consultationId") || undefined;
    const rawStatus = searchParams.get("status");
    const status: DischargeStatus | "all" | undefined =
      rawStatus && (DISCHARGE_STATUSES.includes(rawStatus as DischargeStatus) || rawStatus === "all")
        ? (rawStatus as DischargeStatus | "all")
        : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const searchQuery = searchParams.get("searchQuery") || undefined;

    const repo = getDischargeRepository();
    const discharges = await repo.getDischarges({
      patientId,
      consultationId,
      status,
      startDate,
      endDate,
      searchQuery,
    });

    return NextResponse.json(
      { discharges, count: discharges.length },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch discharges";
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

    const validation = createDischargeSchema.safeParse(body);
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

    const repo = getDischargeRepository();
    const created = await repo.createDischarge({
      ...validation.data,
      followUpChamberId: validation.data.followUpChamberId || undefined,
      doctorId: validation.data.doctorId || auth.user.id,
      doctorName: validation.data.doctorName || auth.user.fullName || "Dr. Tashfin",
    });

    return NextResponse.json(
      {
        discharge: created,
        message:
          created.status === "finalized"
            ? "Discharge report finalized and saved successfully"
            : "Discharge draft saved successfully",
      },
      { status: 201, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create discharge record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
