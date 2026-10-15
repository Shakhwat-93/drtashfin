import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getDischargeRepository } from "@/lib/data";
import { finalizeDischargeSchema } from "@/schemas/discharge";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ dischargeId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { dischargeId } = await params;
    const body = await request.json().catch(() => ({}));

    const validation = finalizeDischargeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Explicit confirmation is required to finalize discharge record",
          details: validation.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 422, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const repo = getDischargeRepository();
    const finalized = await repo.finalizeDischarge(
      dischargeId,
      validation.data.finalizedBy || "Dr. Tashfin"
    );

    return NextResponse.json(
      {
        discharge: finalized,
        message: "Discharge report finalized and locked for audit integrity",
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to finalize discharge record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
