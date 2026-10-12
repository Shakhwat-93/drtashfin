import { NextRequest, NextResponse } from "next/server";
import { PrescriptionArchiveService } from "@/lib/services/prescription-archive-service";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> }
) {
  try {
    const { prescriptionId } = await params;
    const verification =
      await PrescriptionArchiveService.verifyPrescriptionArchive(prescriptionId);

    return NextResponse.json({
      success: true,
      data: verification,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to verify prescription integrity.";
    console.error("Prescription verify route error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
