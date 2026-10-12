import { NextRequest, NextResponse } from "next/server";
import { PrescriptionArchiveService } from "@/lib/services/prescription-archive-service";
import { getClinicalDocumentRepository, getPrescriptionRepository } from "@/lib/data";
import {
  isValidUUID,
  CLINICAL_API_SECURITY_HEADERS,
} from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function POST(
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

    let forceNewVersion = false;
    try {
      const body = await request.json();
      forceNewVersion = Boolean(body?.forceNewVersion);
    } catch {
      // Body is optional
    }

    const result = await PrescriptionArchiveService.archivePrescription(
      prescriptionId,
      { forceNewVersion }
    );

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to archive prescription to R2.";
    console.error("Prescription archive route error:", err);
    return NextResponse.json(
      { error: message },
      { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}

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

    const rxRepo = getPrescriptionRepository();
    const docRepo = getClinicalDocumentRepository();

    const [prescription, latestDoc] = await Promise.all([
      rxRepo.getPrescriptionById(prescriptionId),
      docRepo.getLatestDocumentByPrescriptionId(prescriptionId),
    ]);

    if (!prescription) {
      return NextResponse.json(
        { error: `Prescription "${prescriptionId}" not found.` },
        { status: 404, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          prescriptionId: prescription.id,
          prescriptionCode: prescription.prescriptionCode,
          status: prescription.status,
          isArchived: Boolean(latestDoc),
          latestDocument: latestDoc,
        },
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch archive status.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
