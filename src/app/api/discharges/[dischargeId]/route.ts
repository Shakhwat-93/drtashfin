import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getDischargeRepository } from "@/lib/data";
import { updateDischargeSchema } from "@/schemas/discharge";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dischargeId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { dischargeId } = await params;
    const repo = getDischargeRepository();
    const discharge = await repo.getDischargeById(dischargeId);

    if (!discharge) {
      return NextResponse.json(
        { error: "Discharge record not found" },
        { status: 404, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { discharge },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch discharge";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ dischargeId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { dischargeId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON request payload" },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const validation = updateDischargeSchema.safeParse(body);
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
    const updated = await repo.updateDischarge(dischargeId, validation.data);

    return NextResponse.json(
      {
        discharge: updated,
        message: "Discharge draft updated successfully",
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update discharge record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ dischargeId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { dischargeId } = await params;
    const repo = getDischargeRepository();
    const deleted = await repo.deleteDraftDischarge(dischargeId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Discharge draft not found or already removed" },
        { status: 404, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Draft discharge record deleted successfully",
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete discharge record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
