import { NextRequest, NextResponse } from "next/server";
import { PrescriptionArchiveService } from "@/lib/services/prescription-archive-service";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> }
) {
  try {
    const { prescriptionId } = await params;
    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "1";
    const allowDraftPreview = searchParams.get("preview") === "1";
    const versionParam = searchParams.get("version");
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    const result = await PrescriptionArchiveService.getPdfBuffer(
      prescriptionId,
      { version, allowDraftPreview }
    );

    const disposition = download ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${result.filename}"`,
        "Content-Length": String(result.buffer.length),
        "X-Content-Hash": result.contentHash,
        "X-Prescription-Version": String(result.version),
        "X-Is-Archived": String(result.isArchived),
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate or retrieve PDF.";
    console.error("Prescription PDF route error:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
