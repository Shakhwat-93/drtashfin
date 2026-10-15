import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getDoctorAchievementRepository } from "@/lib/data";
import {
  AchievementCategory,
  ACHIEVEMENT_CATEGORIES,
  DoctorAchievement,
} from "@/types/achievement";

export const runtime = "nodejs";

/**
 * Escapes a single CSV cell value according to RFC 4180.
 * Neutralizes potential CSV formula injection (=, +, -, @).
 */
export function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Formula injection mitigation: if cell begins with =, +, -, or @, prepend a single quote
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }

  // If contains double quote, comma, carriage return, or newline, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

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

    const repo = getDoctorAchievementRepository();
    const achievements = await repo.getAchievements({
      category,
      searchQuery,
      isPublished,
    });

    const headers = [
      "Title",
      "Category",
      "Issuing Institution",
      "Achievement Date",
      "Expiration Date",
      "Evidence Title",
      "Google Drive Evidence URL",
      "Publication URL",
      "Display Order",
      "Status",
      "Description",
      "Created At",
    ];

    const rows = achievements.map((a: DoctorAchievement) => [
      escapeCsvCell(a.title),
      escapeCsvCell(a.category),
      escapeCsvCell(a.institution || "—"),
      escapeCsvCell(a.achievementDate || "—"),
      escapeCsvCell(a.expirationDate || "—"),
      escapeCsvCell(a.evidenceTitle || "—"),
      escapeCsvCell(a.driveUrl || "—"),
      escapeCsvCell(a.publicationUrl || "—"),
      escapeCsvCell(a.displayOrder),
      escapeCsvCell(a.isPublished ? "Published" : "Draft"),
      escapeCsvCell(a.description || "—"),
      escapeCsvCell(new Date(a.createdAt).toISOString().split("T")[0]),
    ]);

    const csvContent =
      headers.join(",") + "\n" + rows.map((r: string[]) => r.join(",")).join("\n");

    const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    const filename = `dr_tashfin_achievements_${dateStr}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...CLINICAL_API_SECURITY_HEADERS,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to export achievements";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
