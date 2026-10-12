import { NextRequest, NextResponse } from "next/server";
import { getClinicalDocumentRepository } from "@/lib/data";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> }
) {
  try {
    const { prescriptionId } = await params;
    const docRepo = getClinicalDocumentRepository();
    const versions = await docRepo.getDocumentsByPrescriptionId(prescriptionId);

    return NextResponse.json({
      success: true,
      data: versions,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch archive versions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
