/**
 * Domain entity and type definitions for Clinical Documents and Prescription Archival.
 *
 * Implements strict document integrity:
 * - SHA-256 cryptographic verification hash
 * - Versioned archival tracking
 * - Secure Cloudflare R2 object reference (private bucket, no public URLs)
 */

export type DocumentCategory =
  | "lab-report"
  | "prescription"
  | "discharge-summary"
  | "consent"
  | "imaging";

export interface ClinicalDocument {
  id: string;
  patientId: string;
  consultationId?: string;
  prescriptionId?: string;
  title: string;
  category: DocumentCategory;
  r2Key: string;
  fileUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  version: number;
  contentHash: string;
  archivedAt: string;
  archivedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArchivePrescriptionResult {
  document: ClinicalDocument;
  contentHash: string;
  version: number;
  isExisting: boolean;
}

export interface DocumentIntegrityVerification {
  prescriptionId: string;
  prescriptionCode: string;
  version: number;
  expectedHash: string;
  actualHash: string;
  matches: boolean;
  archivedAt: string;
  fileSizeBytes: number;
  r2Key: string;
  verifiedAt: string;
  status: "verified" | "mismatch" | "missing_in_storage" | "not_archived";
  details?: string;
}
