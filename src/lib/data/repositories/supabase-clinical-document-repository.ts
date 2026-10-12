import { SupabaseClient } from "@supabase/supabase-js";
import { ClinicalDocument } from "@/types/clinical-document";
import {
  IClinicalDocumentRepository,
  CreateClinicalDocumentDTO,
} from "./clinical-document-repository.interface";
import { supabase } from "@/lib/supabase/client";
import { DataError } from "../errors";

function mapClinicalDocumentFromRow(row: Record<string, unknown>): ClinicalDocument {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    consultationId: row.consultation_id ? String(row.consultation_id) : undefined,
    prescriptionId: row.prescription_id ? String(row.prescription_id) : undefined,
    title: String(row.title),
    category: (row.category as ClinicalDocument["category"]) || "prescription",
    r2Key: String(row.r2_key),
    fileUrl: row.file_url ? String(row.file_url) : undefined,
    fileSizeBytes:
      row.file_size_bytes !== null && row.file_size_bytes !== undefined
        ? Number(row.file_size_bytes)
        : undefined,
    mimeType: row.mime_type ? String(row.mime_type) : undefined,
    version: row.version !== null && row.version !== undefined ? Number(row.version) : 1,
    contentHash: String(row.content_hash || ""),
    archivedAt: String(row.archived_at || row.created_at),
    archivedBy: String(row.archived_by || "dr-tashfin"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseClinicalDocumentRepository
  implements IClinicalDocumentRepository
{
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  public async createDocument(
    dto: CreateClinicalDocumentDTO
  ): Promise<ClinicalDocument> {
    const payload = {
      patient_id: dto.patientId,
      consultation_id: dto.consultationId || null,
      prescription_id: dto.prescriptionId || null,
      title: dto.title.trim(),
      category: dto.category,
      r2_key: dto.r2Key.trim(),
      file_url: dto.fileUrl || null,
      file_size_bytes: dto.fileSizeBytes || null,
      mime_type: dto.mimeType || "application/pdf",
      version: dto.version || 1,
      content_hash: dto.contentHash.trim(),
      archived_at: dto.archivedAt || new Date().toISOString(),
      archived_by: dto.archivedBy || "dr-tashfin",
    };

    const { data, error } = await this.client
      .from("clinical_documents")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new DataError(
        `Failed to record clinical document in database: ${error.message}`,
        error.code
      );
    }

    return mapClinicalDocumentFromRow(data);
  }

  public async getDocumentById(id: string): Promise<ClinicalDocument | null> {
    const { data, error } = await this.client
      .from("clinical_documents")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(
        `Failed to fetch document by ID "${id}": ${error.message}`,
        error.code
      );
    }

    return data ? mapClinicalDocumentFromRow(data) : null;
  }

  public async getDocumentsByPrescriptionId(
    prescriptionId: string
  ): Promise<ClinicalDocument[]> {
    const { data, error } = await this.client
      .from("clinical_documents")
      .select()
      .eq("prescription_id", prescriptionId)
      .order("version", { ascending: false });

    if (error) {
      throw new DataError(
        `Failed to fetch documents for prescription "${prescriptionId}": ${error.message}`,
        error.code
      );
    }

    return (data || []).map(mapClinicalDocumentFromRow);
  }

  public async getLatestDocumentByPrescriptionId(
    prescriptionId: string
  ): Promise<ClinicalDocument | null> {
    const { data, error } = await this.client
      .from("clinical_documents")
      .select()
      .eq("prescription_id", prescriptionId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new DataError(
        `Failed to fetch latest document for prescription "${prescriptionId}": ${error.message}`,
        error.code
      );
    }

    return data ? mapClinicalDocumentFromRow(data) : null;
  }

  public async getDocumentsByPatientId(
    patientId: string
  ): Promise<ClinicalDocument[]> {
    const { data, error } = await this.client
      .from("clinical_documents")
      .select()
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new DataError(
        `Failed to fetch documents for patient "${patientId}": ${error.message}`,
        error.code
      );
    }

    return (data || []).map(mapClinicalDocumentFromRow);
  }
}
