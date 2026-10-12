import { NextRequest, NextResponse } from "next/server";
import { getClinicalDocumentRepository } from "@/lib/data";
import {
  isValidUUID,
  CLINICAL_API_SECURITY_HEADERS,
} from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> }
) {
  try {
    const { prescriptionId } = await params;

    if (!isValidUUID(prescriptionId)) {
      return NextResponse.json(
        { error: "Invalid prescription identifier. Must be a valid UUID." },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const docRepo = getClinicalDocumentRepository();
    const versions = await docRepo.getDocumentsByPrescriptionId(prescriptionId);

    return NextResponse.json(
      {
        success: true,
        data: versions,
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch archive versions.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
