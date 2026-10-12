import crypto from "crypto";
import { Readable } from "stream";
import {
  getPrescriptionRepository,
  getPatientRepository,
  getClinicalDocumentRepository,
  ValidationError,
  DataError,
} from "@/lib/data";
import {
  uploadToR2,
  getFromR2,
  checkObjectExistsR2,
  getPresignedDownloadUrl,
} from "@/lib/storage/r2-client";
import { generatePrescriptionPdf } from "@/lib/pdf/prescription-pdf-generator";
import {
  ArchivePrescriptionResult,
  DocumentIntegrityVerification,
  ClinicalDocument,
} from "@/types/clinical-document";

/**
 * Helper to convert Node/AWS Readable stream into a complete Buffer
 */
async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) {
    return stream;
  }
  if (stream instanceof Uint8Array) {
    return Buffer.from(stream);
  }
  if (!stream || typeof (stream as Readable)[Symbol.asyncIterator] !== "function") {
    throw new Error("Invalid or empty stream returned from storage.");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export class PrescriptionArchiveService {
  /**
   * Idempotently archives an official finalized prescription to Cloudflare R2.
   *
   * Enforces:
   * 1. Prescription must be finalized (drafts cannot be officially archived)
   * 2. SHA-256 cryptographic content digest calculated from official record
   * 3. Collision-resistant private R2 storage key
   * 4. Audit trail preserved in clinical_documents and prescriptions
   * 5. Retry safety and duplicate prevention
   */
  public static async archivePrescription(
    prescriptionId: string,
    options?: { forceNewVersion?: boolean }
  ): Promise<ArchivePrescriptionResult> {
    const rxRepo = getPrescriptionRepository();
    const patientRepo = getPatientRepository();
    const docRepo = getClinicalDocumentRepository();

    const prescription = await rxRepo.getPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new DataError(`Prescription "${prescriptionId}" not found.`);
    }

    if (prescription.status !== "finalized") {
      throw new ValidationError(
        "Cannot officially archive a draft prescription. Prescriptions must be finalized by the clinician first."
      );
    }

    const patient = await patientRepo.getPatientById(prescription.patientId);
    if (!patient) {
      throw new DataError(`Patient "${prescription.patientId}" not found.`);
    }

    // Check existing documents for this prescription
    const existingDocs = await docRepo.getDocumentsByPrescriptionId(prescriptionId);
    const latestDoc = existingDocs.length > 0 ? existingDocs[0] : null;

    let targetVersion = 1;
    if (latestDoc) {
      targetVersion = options?.forceNewVersion
        ? latestDoc.version + 1
        : latestDoc.version;
    }

    // If an archive already exists and forceNewVersion is not requested, check idempotency
    if (latestDoc && !options?.forceNewVersion) {
      const existsInR2 = await checkObjectExistsR2(latestDoc.r2Key);
      if (existsInR2) {
        return {
          document: latestDoc,
          contentHash: latestDoc.contentHash,
          version: latestDoc.version,
          isExisting: true,
        };
      }
    }

    // Step 1: Generate official PDF buffer
    const finalPdf = await generatePrescriptionPdf({
      prescription,
      patient,
      version: targetVersion,
    });

    // Step 2: Compute authoritative SHA-256 hash of the exact file uploaded
    const contentHash = crypto
      .createHash("sha256")
      .update(finalPdf)
      .digest("hex");

    // Stable, collision-resistant object key
    const r2Key = `prescriptions/${patient.patientId}/${prescription.id}/v${targetVersion}_${prescription.prescriptionCode}.pdf`;

    // Step 3: Upload to Cloudflare R2 private bucket
    await uploadToR2({
      key: r2Key,
      body: finalPdf,
      contentType: "application/pdf",
      metadata: {
        prescriptionId: prescription.id,
        prescriptionCode: prescription.prescriptionCode,
        patientId: patient.id,
        patientCode: patient.patientId,
        version: String(targetVersion),
        contentHash,
        archivedAt: new Date().toISOString(),
      },
    });

    // Step 4: Persist metadata in clinical_documents table
    const docTitle = `Prescription - ${prescription.prescriptionCode} (v${targetVersion})`;
    const doc = await docRepo.createDocument({
      patientId: patient.id,
      consultationId: prescription.consultationId,
      prescriptionId: prescription.id,
      title: docTitle,
      category: "prescription",
      r2Key,
      fileSizeBytes: finalPdf.length,
      mimeType: "application/pdf",
      version: targetVersion,
      contentHash,
      archivedAt: new Date().toISOString(),
      archivedBy: "dr-tashfin",
    });

    // Step 5: Update prescription with latest archive pointer
    await rxRepo.attachArchivedDocument(prescription.id, {
      archivedDocumentId: doc.id,
      archivedPdfKey: r2Key,
      archivedPdfHash: contentHash,
      archivedPdfSize: finalPdf.length,
      archiveVersion: targetVersion,
      archivedAt: doc.archivedAt,
    });

    return {
      document: doc,
      contentHash,
      version: targetVersion,
      isExisting: false,
    };
  }

  /**
   * Cryptographically verifies the stored R2 PDF against the database content hash.
   */
  public static async verifyPrescriptionArchive(
    prescriptionId: string
  ): Promise<DocumentIntegrityVerification> {
    const rxRepo = getPrescriptionRepository();
    const docRepo = getClinicalDocumentRepository();

    const prescription = await rxRepo.getPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new DataError(`Prescription "${prescriptionId}" not found.`);
    }

    const latestDoc = await docRepo.getLatestDocumentByPrescriptionId(prescriptionId);
    const nowIso = new Date().toISOString();

    if (!latestDoc) {
      return {
        prescriptionId,
        prescriptionCode: prescription.prescriptionCode,
        version: 0,
        expectedHash: "",
        actualHash: "",
        matches: false,
        archivedAt: "",
        fileSizeBytes: 0,
        r2Key: "",
        verifiedAt: nowIso,
        status: "not_archived",
        details: "Prescription has not been archived to Cloudflare R2 yet.",
      };
    }

    try {
      const exists = await checkObjectExistsR2(latestDoc.r2Key);
      if (!exists) {
        return {
          prescriptionId,
          prescriptionCode: prescription.prescriptionCode,
          version: latestDoc.version,
          expectedHash: latestDoc.contentHash,
          actualHash: "",
          matches: false,
          archivedAt: latestDoc.archivedAt,
          fileSizeBytes: latestDoc.fileSizeBytes || 0,
          r2Key: latestDoc.r2Key,
          verifiedAt: nowIso,
          status: "missing_in_storage",
          details: `Object "${latestDoc.r2Key}" was not found in Cloudflare R2 bucket.`,
        };
      }

      const r2Object = await getFromR2(latestDoc.r2Key);
      const fileBuffer = await streamToBuffer(r2Object.Body);

      const actualHash = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

      const matches =
        actualHash.toLowerCase() === latestDoc.contentHash.toLowerCase();

      return {
        prescriptionId,
        prescriptionCode: prescription.prescriptionCode,
        version: latestDoc.version,
        expectedHash: latestDoc.contentHash,
        actualHash,
        matches,
        archivedAt: latestDoc.archivedAt,
        fileSizeBytes: fileBuffer.length,
        r2Key: latestDoc.r2Key,
        verifiedAt: nowIso,
        status: matches ? "verified" : "mismatch",
        details: matches
          ? "SHA-256 cryptographic integrity verified. File matches recorded database digest exactly."
          : "Integrity alert: Stored file digest does not match database record.",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        prescriptionId,
        prescriptionCode: prescription.prescriptionCode,
        version: latestDoc.version,
        expectedHash: latestDoc.contentHash,
        actualHash: "",
        matches: false,
        archivedAt: latestDoc.archivedAt,
        fileSizeBytes: 0,
        r2Key: latestDoc.r2Key,
        verifiedAt: nowIso,
        status: "missing_in_storage",
        details: `Storage verification error: ${msg}`,
      };
    }
  }

  /**
   * Retrieves or generates the PDF buffer for streaming/download.
   */
  public static async getPdfBuffer(
    prescriptionId: string,
    options?: { version?: number; allowDraftPreview?: boolean }
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentHash: string;
    version: number;
    isArchived: boolean;
  }> {
    const rxRepo = getPrescriptionRepository();
    const patientRepo = getPatientRepository();
    const docRepo = getClinicalDocumentRepository();

    const prescription = await rxRepo.getPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new DataError(`Prescription "${prescriptionId}" not found.`);
    }

    const patient = await patientRepo.getPatientById(prescription.patientId);
    if (!patient) {
      throw new DataError(`Patient "${prescription.patientId}" not found.`);
    }

    const filename = `Prescription-${prescription.prescriptionCode}.pdf`;

    // If draft and draft preview is permitted:
    if (prescription.status === "draft") {
      if (!options?.allowDraftPreview) {
        throw new ValidationError(
          "Draft prescriptions cannot be officially retrieved. Please finalize the prescription first."
        );
      }
      const draftPdf = await generatePrescriptionPdf({
        prescription,
        patient,
        version: 0,
      });
      const draftHash = crypto
        .createHash("sha256")
        .update(draftPdf)
        .digest("hex");

      return {
        buffer: draftPdf,
        filename: `Draft-${prescription.prescriptionCode}.pdf`,
        contentHash: draftHash,
        version: 0,
        isArchived: false,
      };
    }

    // Finalized prescription: check R2 archive
    const docs = await docRepo.getDocumentsByPrescriptionId(prescriptionId);
    let targetDoc: ClinicalDocument | null = null;

    if (options?.version) {
      targetDoc = docs.find((d) => d.version === options.version) || null;
    } else {
      targetDoc = docs.length > 0 ? docs[0] : null;
    }

    if (targetDoc) {
      try {
        const r2Obj = await getFromR2(targetDoc.r2Key);
        const buffer = await streamToBuffer(r2Obj.Body);
        return {
          buffer,
          filename: `Prescription-${prescription.prescriptionCode}-v${targetDoc.version}.pdf`,
          contentHash: targetDoc.contentHash,
          version: targetDoc.version,
          isArchived: true,
        };
      } catch (err) {
        console.warn(
          `Failed to retrieve from R2 for ${targetDoc.r2Key}, regenerating dynamically:`,
          err
        );
      }
    }

    // If not yet archived in R2, generate dynamically
    const buffer = await generatePrescriptionPdf({
      prescription,
      patient,
      version: 1,
    });
    const contentHash = crypto
      .createHash("sha256")
      .update(buffer)
      .digest("hex");

    return {
      buffer,
      filename,
      contentHash,
      version: 1,
      isArchived: false,
    };
  }

  /**
   * Generates a temporary presigned download URL (with strict 15-minute expiry)
   */
  public static async getSignedDownloadUrl(
    prescriptionId: string
  ): Promise<string> {
    const docRepo = getClinicalDocumentRepository();
    const latestDoc = await docRepo.getLatestDocumentByPrescriptionId(prescriptionId);
    if (!latestDoc) {
      throw new DataError("Prescription has not been archived to Cloudflare R2 yet.");
    }

    // Short-lived: 900 seconds (15 minutes)
    return await getPresignedDownloadUrl(latestDoc.r2Key, 900);
  }
}
