import { NextRequest, NextResponse } from "next/server";
import { requireDoctorAuth } from "@/lib/auth/session";
import { CLINICAL_API_SECURITY_HEADERS } from "@/lib/security/api-security";
import { getProcedureRepository } from "@/lib/data";
import { createProcedureSchema } from "@/schemas/procedure";
import { ProcedureCategory, PROCEDURE_CATEGORIES } from "@/types/procedure";

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
    const rawCategory = searchParams.get("category");
    const category: ProcedureCategory | "all" | undefined =
      rawCategory && (PROCEDURE_CATEGORIES.includes(rawCategory as ProcedureCategory) || rawCategory === "all")
        ? (rawCategory as ProcedureCategory | "all")
        : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const searchQuery = searchParams.get("searchQuery") || undefined;

    const repo = getProcedureRepository();
    const procedures = await repo.getProcedures({
      patientId,
      consultationId,
      category,
      startDate,
      endDate,
      searchQuery,
    });

    return NextResponse.json(
      { procedures, count: procedures.length },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch procedures";
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

    const validation = createProcedureSchema.safeParse(body);
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
    const createdProcedure = await repo.createProcedure(validation.data);

    return NextResponse.json(
      {
        procedure: createdProcedure,
        message: "Procedure record created successfully",
      },
      { status: 201, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create procedure record";
    return NextResponse.json(
      { error: msg },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
