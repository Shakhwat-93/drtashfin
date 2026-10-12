import { ClinicalDocument } from "@/types/clinical-document";

export interface CreateClinicalDocumentDTO {
  patientId: string;
  consultationId?: string;
  prescriptionId?: string;
  title: string;
  category: ClinicalDocument["category"];
  r2Key: string;
  fileUrl?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  version?: number;
  contentHash: string;
  archivedAt?: string;
  archivedBy?: string;
}

export interface IClinicalDocumentRepository {
  /**
   * Create and record a clinical document metadata entry.
   */
  createDocument(dto: CreateClinicalDocumentDTO): Promise<ClinicalDocument>;

  /**
   * Retrieve a clinical document by its UUID.
   */
  getDocumentById(id: string): Promise<ClinicalDocument | null>;

  /**
   * Retrieve all archived document versions for a specific prescription.
   */
  getDocumentsByPrescriptionId(prescriptionId: string): Promise<ClinicalDocument[]>;

  /**
   * Retrieve the latest archived document for a prescription.
   */
  getLatestDocumentByPrescriptionId(
    prescriptionId: string
  ): Promise<ClinicalDocument | null>;

  /**
   * Retrieve all clinical documents belonging to a patient.
   */
  getDocumentsByPatientId(patientId: string): Promise<ClinicalDocument[]>;
}
