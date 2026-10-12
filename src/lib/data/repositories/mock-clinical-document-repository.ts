import { ClinicalDocument } from "@/types/clinical-document";
import {
  IClinicalDocumentRepository,
  CreateClinicalDocumentDTO,
} from "./clinical-document-repository.interface";

export class MockClinicalDocumentRepository
  implements IClinicalDocumentRepository
{
  private documents: ClinicalDocument[] = [];

  public async createDocument(
    dto: CreateClinicalDocumentDTO
  ): Promise<ClinicalDocument> {
    const now = new Date().toISOString();
    const doc: ClinicalDocument = {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      patientId: dto.patientId,
      consultationId: dto.consultationId,
      prescriptionId: dto.prescriptionId,
      title: dto.title,
      category: dto.category,
      r2Key: dto.r2Key,
      fileUrl: dto.fileUrl,
      fileSizeBytes: dto.fileSizeBytes,
      mimeType: dto.mimeType || "application/pdf",
      version: dto.version || 1,
      contentHash: dto.contentHash,
      archivedAt: dto.archivedAt || now,
      archivedBy: dto.archivedBy || "dr-tashfin",
      createdAt: now,
      updatedAt: now,
    };

    this.documents.push(doc);
    return JSON.parse(JSON.stringify(doc));
  }

  public async getDocumentById(id: string): Promise<ClinicalDocument | null> {
    const doc = this.documents.find((d) => d.id === id);
    return doc ? JSON.parse(JSON.stringify(doc)) : null;
  }

  public async getDocumentsByPrescriptionId(
    prescriptionId: string
  ): Promise<ClinicalDocument[]> {
    const list = this.documents
      .filter((d) => d.prescriptionId === prescriptionId)
      .sort((a, b) => b.version - a.version);
    return JSON.parse(JSON.stringify(list));
  }

  public async getLatestDocumentByPrescriptionId(
    prescriptionId: string
  ): Promise<ClinicalDocument | null> {
    const list = await this.getDocumentsByPrescriptionId(prescriptionId);
    return list.length > 0 ? list[0] : null;
  }

  public async getDocumentsByPatientId(
    patientId: string
  ): Promise<ClinicalDocument[]> {
    const list = this.documents
      .filter((d) => d.patientId === patientId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return JSON.parse(JSON.stringify(list));
  }
}
