import { NextRequest, NextResponse } from "next/server";
import { PrescriptionArchiveService } from "@/lib/services/prescription-archive-service";
import { requireDoctorAuth, applySessionCookies } from "@/lib/auth/session";
import {
  isValidUUID,
  CLINICAL_API_SECURITY_HEADERS,
} from "@/lib/security/api-security";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ prescriptionId: string }> }
) {
  try {
    const auth = await requireDoctorAuth(request);
    if (!auth.authorized) {
      return auth.response;
    }

    const { prescriptionId } = await params;

    if (!isValidUUID(prescriptionId)) {
      return NextResponse.json(
        { error: "Invalid prescription identifier. Must be a valid UUID." },
        { status: 400, headers: CLINICAL_API_SECURITY_HEADERS }
      );
    }

    const verification =
      await PrescriptionArchiveService.verifyPrescriptionArchive(
        prescriptionId,
        { client: auth.supabaseClient }
      );

    const response = NextResponse.json(
      {
        success: true,
        data: verification,
      },
      { status: 200, headers: CLINICAL_API_SECURITY_HEADERS }
    );

    if (auth.refreshed) {
      applySessionCookies(response, request, {
        accessToken: auth.accessToken,
        refreshToken: auth.refreshToken,
      });
    }

    return response;
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to verify prescription integrity.";
    console.error("Prescription verify route error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CLINICAL_API_SECURITY_HEADERS }
    );
  }
}
