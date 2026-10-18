/**
 * Supabase Procedure & Operation Repository
 * Phase 27: Patient Operation & Procedure History Management
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { IProcedureRepository } from "./procedure-repository.interface";
import {
  PatientProcedure,
  CreateProcedureDTO,
  UpdateProcedureDTO,
  ProcedureFilterParams,
  ProcedureCategory,
} from "@/types/procedure";
import { supabase } from "@/lib/supabase/client";
import { IPatientRepository } from "./patient-repository.interface";
import { SupabasePatientRepository } from "./supabase-patient-repository";
import { IConsultationRepository } from "./consultation-repository.interface";
import { SupabaseConsultationRepository } from "./supabase-consultation-repository";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import {
  createProcedureSchema,
  updateProcedureSchema,
} from "@/schemas/procedure";

function mapProcedureFromRow(row: Record<string, unknown>): PatientProcedure {
  const patientRel = row.patients as Record<string, unknown> | undefined;
  const consultationRel = row.consultations as Record<string, unknown> | undefined;

  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    consultationId: row.consultation_id ? String(row.consultation_id) : null,
    procedureName: String(row.procedure_name),
    category: row.category as ProcedureCategory,
    procedureDate: String(row.procedure_date),
    hospitalFacility: row.hospital_facility ? String(row.hospital_facility) : null,
    performingDoctor: row.performing_doctor ? String(row.performing_doctor) : null,
    clinicalIndication: row.clinical_indication
      ? String(row.clinical_indication)
      : null,
    doctorNotes: row.doctor_notes ? String(row.doctor_notes) : null,
    outcome: row.outcome ? String(row.outcome) : null,
    complications: row.complications ? String(row.complications) : null,
    recoveryNotes: row.recovery_notes ? String(row.recovery_notes) : null,
    driveUrl: row.drive_url ? String(row.drive_url) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    patientName: patientRel?.name ? String(patientRel.name) : undefined,
    patientCode: patientRel?.patient_id ? String(patientRel.patient_id) : undefined,
    consultationDate: consultationRel?.consultation_date
      ? String(consultationRel.consultation_date)
      : null,
  };
}

export class SupabaseProcedureRepository implements IProcedureRepository {
  private client: SupabaseClient;
  private patientRepo: IPatientRepository;
  private consultationRepo: IConsultationRepository;

  constructor(
    client?: SupabaseClient,
    patientRepo?: IPatientRepository,
    consultationRepo?: IConsultationRepository
  ) {
    this.client = client || supabase;
    this.patientRepo = patientRepo || new SupabasePatientRepository(this.client);
    this.consultationRepo =
      consultationRepo ||
      new SupabaseConsultationRepository(this.patientRepo, this.client);
  }

  private async resolvePatientDbId(patientIdentifier: string): Promise<string> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        patientIdentifier
      );
    if (isUuid) {
      return patientIdentifier;
    }

    const patient = await this.patientRepo.getPatientByIdentifier(patientIdentifier);
    if (!patient) {
      throw new DataError(
        `Patient with identifier "${patientIdentifier}" does not exist`,
        "NOT_FOUND"
      );
    }
    return patient.id;
  }

  async getProcedures(
    params?: ProcedureFilterParams
  ): Promise<PatientProcedure[]> {
    let query = this.client
      .from("patient_procedures")
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      );

    if (params?.patientId) {
      const resolvedPatientId = await this.resolvePatientDbId(params.patientId);
      query = query.eq("patient_id", resolvedPatientId);
    }

    if (params?.consultationId) {
      query = query.eq("consultation_id", params.consultationId);
    }

    if (params?.category && params.category !== "all") {
      query = query.eq("category", params.category);
    }

    if (params?.startDate) {
      query = query.gte("procedure_date", params.startDate);
    }

    if (params?.endDate) {
      query = query.lte("procedure_date", params.endDate);
    }

    if (params?.searchQuery && params.searchQuery.trim().length > 0) {
      const term = `%${params.searchQuery.trim()}%`;
      query = query.or(
        `procedure_name.ilike.${term},hospital_facility.ilike.${term},performing_doctor.ilike.${term},clinical_indication.ilike.${term}`
      );
    }

    query = query
      .order("procedure_date", { ascending: false })
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new DataError(`Failed to fetch procedures: ${error.message}`);
    }

    return (data || []).map((row) => mapProcedureFromRow(row as Record<string, unknown>));
  }

  async getProcedureById(id: string): Promise<PatientProcedure | null> {
    const { data, error } = await this.client
      .from("patient_procedures")
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch procedure: ${error.message}`);
    }

    if (!data) return null;
    return mapProcedureFromRow(data as Record<string, unknown>);
  }

  async createProcedure(dto: CreateProcedureDTO): Promise<PatientProcedure> {
    const parseResult = createProcedureSchema.safeParse(dto);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues
        .map((e) => e.message)
        .join(", ");
      throw new ValidationError(`Validation failed: ${errorMsg}`);
    }

    // Google Drive URL validation & normalization (optional)
    let normalizedDriveUrl: string | null = null;
    if (dto.driveUrl && dto.driveUrl.trim().length > 0) {
      const driveCheck = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
      if (!driveCheck.isValid || !driveCheck.normalizedUrl) {
        throw new ValidationError(
          driveCheck.error || "Must be a valid HTTPS Google Drive URL"
        );
      }
      normalizedDriveUrl = driveCheck.normalizedUrl;
    }

    const resolvedPatientId = await this.resolvePatientDbId(dto.patientId);

    if (dto.consultationId) {
      const consultation = await this.consultationRepo.getConsultationById(
        dto.consultationId
      );
      if (!consultation) {
        throw new DataError(
          `Consultation with ID "${dto.consultationId}" does not exist`,
          "NOT_FOUND"
        );
      }
    }

    const insertPayload = {
      patient_id: resolvedPatientId,
      consultation_id: dto.consultationId || null,
      procedure_name: dto.procedureName.trim(),
      category: dto.category,
      procedure_date: dto.procedureDate,
      hospital_facility: dto.hospitalFacility?.trim() || null,
      performing_doctor: dto.performingDoctor?.trim() || null,
      clinical_indication: dto.clinicalIndication?.trim() || null,
      doctor_notes: dto.doctorNotes?.trim() || null,
      outcome: dto.outcome?.trim() || null,
      complications: dto.complications?.trim() || null,
      recovery_notes: dto.recoveryNotes?.trim() || null,
      drive_url: normalizedDriveUrl,
    };

    const { data, error } = await this.client
      .from("patient_procedures")
      .insert(insertPayload)
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .single();

    if (error) {
      throw new DataError(`Failed to record procedure: ${error.message}`);
    }

    return mapProcedureFromRow(data as Record<string, unknown>);
  }

  async updateProcedure(
    id: string,
    dto: UpdateProcedureDTO
  ): Promise<PatientProcedure> {
    const parseResult = updateProcedureSchema.safeParse(dto);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues
        .map((e) => e.message)
        .join(", ");
      throw new ValidationError(`Validation failed: ${errorMsg}`);
    }

    const updatePayload: Record<string, unknown> = {};

    if (dto.procedureName !== undefined) {
      updatePayload.procedure_name = dto.procedureName.trim();
    }
    if (dto.category !== undefined) {
      updatePayload.category = dto.category;
    }
    if (dto.procedureDate !== undefined) {
      updatePayload.procedure_date = dto.procedureDate;
    }
    if (dto.hospitalFacility !== undefined) {
      updatePayload.hospital_facility = dto.hospitalFacility?.trim() || null;
    }
    if (dto.performingDoctor !== undefined) {
      updatePayload.performing_doctor = dto.performingDoctor?.trim() || null;
    }
    if (dto.clinicalIndication !== undefined) {
      updatePayload.clinical_indication = dto.clinicalIndication?.trim() || null;
    }
    if (dto.doctorNotes !== undefined) {
      updatePayload.doctor_notes = dto.doctorNotes?.trim() || null;
    }
    if (dto.outcome !== undefined) {
      updatePayload.outcome = dto.outcome?.trim() || null;
    }
    if (dto.complications !== undefined) {
      updatePayload.complications = dto.complications?.trim() || null;
    }
    if (dto.recoveryNotes !== undefined) {
      updatePayload.recovery_notes = dto.recoveryNotes?.trim() || null;
    }

    if (dto.driveUrl !== undefined) {
      if (dto.driveUrl && dto.driveUrl.trim().length > 0) {
        const driveCheck = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
        if (!driveCheck.isValid || !driveCheck.normalizedUrl) {
          throw new ValidationError(
            driveCheck.error || "Must be a valid HTTPS Google Drive URL"
          );
        }
        updatePayload.drive_url = driveCheck.normalizedUrl;
      } else {
        updatePayload.drive_url = null;
      }
    }

    if (dto.consultationId !== undefined) {
      if (dto.consultationId) {
        const consultation = await this.consultationRepo.getConsultationById(
          dto.consultationId
        );
        if (!consultation) {
          throw new DataError(
            `Consultation with ID "${dto.consultationId}" does not exist`,
            "NOT_FOUND"
          );
        }
        updatePayload.consultation_id = dto.consultationId;
      } else {
        updatePayload.consultation_id = null;
      }
    }

    const { data, error } = await this.client
      .from("patient_procedures")
      .update(updatePayload)
      .eq("id", id)
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .single();

    if (error) {
      throw new DataError(`Failed to update procedure: ${error.message}`);
    }

    return mapProcedureFromRow(data as Record<string, unknown>);
  }

  async deleteProcedure(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("patient_procedures")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new DataError(`Failed to delete procedure: ${error.message}`);
    }

    return (count || 0) > 0;
  }
}
