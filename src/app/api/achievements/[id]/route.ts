import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getDoctorAchievementRepository } from "@/lib/data";
import { updateAchievementSchema } from "@/schemas/achievement";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const repo = getDoctorAchievementRepository();
    const achievement = await repo.getAchievementById(id);

    if (!achievement) {
      return NextResponse.json(
        { error: "Doctor achievement not found" },
        { status: 404, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      { achievement },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to retrieve achievement";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON request payload" },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const validation = updateAchievementSchema.safeParse(body);
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

    const repo = getDoctorAchievementRepository();
    const updated = await repo.updateAchievement(id, validation.data);

    return NextResponse.json(
      {
        achievement: updated,
        message: "Doctor achievement updated successfully",
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to update achievement";
    const status = msg.includes("not exist") ? 404 : 500;
    return NextResponse.json(
      { error: msg },
      { status, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const repo = getDoctorAchievementRepository();
    await repo.deleteAchievement(id);

    return NextResponse.json(
      {
        success: true,
        message: "Doctor achievement deleted successfully",
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to delete achievement";
    const status = msg.includes("not exist") ? 404 : 500;
    return NextResponse.json(
      { error: msg },
      { status, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
