import { NextRequest, NextResponse } from "next/server";
import { PrescriptionArchiveService } from "@/lib/services/prescription-archive-service";
import {
  isValidUUID,
  sanitizeFilename,
  CLINICAL_API_SECURITY_HEADERS,
} from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
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

    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") === "1";
    const allowDraftPreview = searchParams.get("preview") === "1";
    const versionParam = searchParams.get("version");
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    if (version !== undefined && (isNaN(version) || version < 1)) {
      return NextResponse.json(
        { error: "Invalid version parameter. Must be a positive integer." },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const result = await PrescriptionArchiveService.getPdfBuffer(
      prescriptionId,
      { version, allowDraftPreview }
    );

    const disposition = download ? "attachment" : "inline";
    const safeFilename = sanitizeFilename(result.filename);

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        ...CLINICAL_API_SECURITY_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
        "Content-Length": String(result.buffer.length),
        "X-Content-Hash": result.contentHash,
        "X-Prescription-Version": String(result.version),
        "X-Is-Archived": String(result.isArchived),
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to generate or retrieve PDF.";
    console.error("Prescription PDF route error:", err);
    return NextResponse.json(
      { error: message },
      { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
