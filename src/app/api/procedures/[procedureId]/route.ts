import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getProcedureRepository } from "@/lib/data";
import { updateProcedureSchema } from "@/schemas/procedure";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ procedureId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { procedureId } = await params;
    const repo = getProcedureRepository();
    const procedure = await repo.getProcedureById(procedureId);

    if (!procedure) {
      return NextResponse.json(
        { error: "Procedure record not found" },
        { status: 404, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { procedure },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch procedure";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ procedureId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { procedureId } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON request payload" },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const validation = updateProcedureSchema.safeParse(body);
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

    const repo = getProcedureRepository();
    const updated = await repo.updateProcedure(procedureId, validation.data);

    return NextResponse.json(
      {
        procedure: updated,
        message: "Procedure record updated successfully",
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update procedure record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ procedureId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { procedureId } = await params;
    const repo = getProcedureRepository();
    const deleted = await repo.deleteProcedure(procedureId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Procedure record not found or already removed" },
        { status: 404, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "Procedure record removed from patient profile. Note: Supporting Google Drive files remain untouched in your Drive.",
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to delete procedure record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
