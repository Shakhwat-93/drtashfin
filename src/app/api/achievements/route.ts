import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getDoctorAchievementRepository } from "@/lib/data";
import { createAchievementSchema } from "@/schemas/achievement";
import { AchievementCategory, ACHIEVEMENT_CATEGORIES } from "@/types/achievement";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { searchParams } = new URL(request.url);
    const rawCategory = searchParams.get("category");
    const category =
      rawCategory &&
      rawCategory !== "all" &&
      ACHIEVEMENT_CATEGORIES.includes(rawCategory as AchievementCategory)
        ? (rawCategory as AchievementCategory)
        : undefined;

    const searchQuery =
      searchParams.get("searchQuery") || searchParams.get("q") || undefined;
    const rawPublished = searchParams.get("isPublished");
    const isPublished =
      rawPublished === "true"
        ? true
        : rawPublished === "false"
        ? false
        : "all";

    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const repo = getDoctorAchievementRepository();
    const [achievements, categoryCounts] = await Promise.all([
      repo.getAchievements({
        category,
        searchQuery,
        isPublished,
        startDate,
        endDate,
      }),
      repo.getCategoryCounts(),
    ]);

    return NextResponse.json(
      {
        achievements,
        categoryCounts,
        total: achievements.length,
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to retrieve doctor achievements";
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

    const validation = createAchievementSchema.safeParse(body);
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
    const created = await repo.createAchievement({
      ...validation.data,
      doctorId: validation.data.doctorId || auth.user.id,
    });

    return NextResponse.json(
      {
        achievement: created,
        message: "Doctor achievement record saved successfully",
      },
      { status: 201, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to create achievement record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
