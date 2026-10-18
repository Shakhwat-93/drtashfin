/**
 * Supabase Patient Discharge Repository
 * Phase 28: Patient Discharge & Final Clinical Report Management
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { IDischargeRepository } from "./discharge-repository.interface";
import {
  PatientDischarge,
  CreateDischargeDTO,
  UpdateDischargeDTO,
  AmendDischargeDTO,
  DischargeFilterParams,
  DischargeCondition,
  DischargeStatus,
} from "@/types/discharge";
import { supabase } from "@/lib/supabase/client";
import { IPatientRepository } from "./patient-repository.interface";
import { SupabasePatientRepository } from "./supabase-patient-repository";
import { IConsultationRepository } from "./consultation-repository.interface";
import { SupabaseConsultationRepository } from "./supabase-consultation-repository";
import { IFollowUpRepository } from "./follow-up-repository.interface";
import { SupabaseFollowUpRepository } from "./supabase-follow-up-repository";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import {
  createDischargeSchema,
  updateDischargeSchema,
  amendDischargeSchema,
} from "@/schemas/discharge";

function mapDischargeFromRow(row: Record<string, unknown>): PatientDischarge {
  const patientRel = row.patients as Record<string, unknown> | undefined;
  const consultationRel = row.consultations as Record<string, unknown> | undefined;

  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    consultationId: row.consultation_id ? String(row.consultation_id) : null,
    dischargeDate: String(row.discharge_date),
    dischargeTime: row.discharge_time ? String(row.discharge_time) : null,
    status: row.status as DischargeStatus,
    clinicalReason: String(row.clinical_reason),
    finalDiagnosis: String(row.final_diagnosis),
    treatmentSummary: String(row.treatment_summary),
    conditionAtDischarge: row.condition_at_discharge as DischargeCondition,
    dischargeInstructions: String(row.discharge_instructions),
    medicationInstructions: row.medication_instructions
      ? String(row.medication_instructions)
      : null,
    recommendedFollowUpDate: row.recommended_follow_up_date
      ? String(row.recommended_follow_up_date)
      : null,
    followUpInstructions: row.follow_up_instructions
      ? String(row.follow_up_instructions)
      : null,
    complications: row.complications ? String(row.complications) : null,
    doctorId: row.doctor_id ? String(row.doctor_id) : null,
    doctorName: row.doctor_name ? String(row.doctor_name) : null,
    driveUrl: row.drive_url ? String(row.drive_url) : null,
    finalizedAt: row.finalized_at ? String(row.finalized_at) : null,
    finalizedBy: row.finalized_by ? String(row.finalized_by) : null,
    amendmentNotes: row.amendment_notes ? String(row.amendment_notes) : null,
    amendedAt: row.amended_at ? String(row.amended_at) : null,
    amendedBy: row.amended_by ? String(row.amended_by) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    patientName: patientRel?.name ? String(patientRel.name) : undefined,
    patientCode: patientRel?.patient_id ? String(patientRel.patient_id) : undefined,
    consultationDate: consultationRel?.consultation_date
      ? String(consultationRel.consultation_date)
      : null,
  };
}

export class SupabaseDischargeRepository implements IDischargeRepository {
  private client: SupabaseClient;
  private patientRepo: IPatientRepository;
  private consultationRepo: IConsultationRepository;
  private followUpRepo: IFollowUpRepository;

  constructor(
    client?: SupabaseClient,
    patientRepo?: IPatientRepository,
    consultationRepo?: IConsultationRepository,
    followUpRepo?: IFollowUpRepository
  ) {
    this.client = client || supabase;
    this.patientRepo = patientRepo || new SupabasePatientRepository(this.client);
    this.consultationRepo =
      consultationRepo ||
      new SupabaseConsultationRepository(this.patientRepo, this.client);
    this.followUpRepo =
      followUpRepo ||
      new SupabaseFollowUpRepository(this.patientRepo, this.client);
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

  async getDischarges(
    params?: DischargeFilterParams
  ): Promise<PatientDischarge[]> {
    let query = this.client
      .from("patient_discharges")
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

    if (params?.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }

    if (params?.startDate) {
      query = query.gte("discharge_date", params.startDate);
    }

    if (params?.endDate) {
      query = query.lte("discharge_date", params.endDate);
    }

    if (params?.searchQuery && params.searchQuery.trim().length > 0) {
      const term = `%${params.searchQuery.trim()}%`;
      query = query.or(
        `final_diagnosis.ilike.${term},clinical_reason.ilike.${term},treatment_summary.ilike.${term},condition_at_discharge.ilike.${term},discharge_instructions.ilike.${term}`
      );
    }

    query = query
      .order("discharge_date", { ascending: false })
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new DataError(`Failed to fetch discharges: ${error.message}`);
    }

    return (data || []).map((row) => mapDischargeFromRow(row as Record<string, unknown>));
  }

  async getDischargeById(id: string): Promise<PatientDischarge | null> {
    const { data, error } = await this.client
      .from("patient_discharges")
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
      throw new DataError(`Failed to fetch discharge: ${error.message}`);
    }

    if (!data) return null;
    return mapDischargeFromRow(data as Record<string, unknown>);
  }

  async createDischarge(dto: CreateDischargeDTO): Promise<PatientDischarge> {
    const parseResult = createDischargeSchema.safeParse(dto);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues
        .map((e) => e.message)
        .join(", ");
      throw new ValidationError(`Validation failed: ${errorMsg}`);
    }

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

    // Optional integrated follow-up scheduling
    if (dto.scheduleFollowUp && dto.recommendedFollowUpDate) {
      try {
        await this.followUpRepo.createFollowUp({
          patientId: resolvedPatientId,
          chamberId: dto.followUpChamberId || undefined,
          consultationId: dto.consultationId || undefined,
          scheduledDate: dto.recommendedFollowUpDate,
          reason:
            dto.followUpInstructions ||
            "Post-discharge clinical review and follow-up",
          notes: dto.followUpInstructions || undefined,
          priority: dto.followUpPriority || "normal",
        });
      } catch {
        // Non-fatal
      }
    }

    const now = new Date().toISOString();
    const isFinalized = dto.status === "finalized";

    const insertPayload = {
      patient_id: resolvedPatientId,
      consultation_id: dto.consultationId || null,
      discharge_date: dto.dischargeDate,
      discharge_time: dto.dischargeTime?.trim() || null,
      status: dto.status || "draft",
      clinical_reason: dto.clinicalReason.trim(),
      final_diagnosis: dto.finalDiagnosis.trim(),
      treatment_summary: dto.treatmentSummary.trim(),
      condition_at_discharge: dto.conditionAtDischarge,
      discharge_instructions: dto.dischargeInstructions.trim(),
      medication_instructions: dto.medicationInstructions?.trim() || null,
      recommended_follow_up_date: dto.recommendedFollowUpDate || null,
      follow_up_instructions: dto.followUpInstructions?.trim() || null,
      complications: dto.complications?.trim() || null,
      doctor_id: dto.doctorId || "dr-tashfin",
      doctor_name: dto.doctorName || "Dr. Tashfin",
      drive_url: normalizedDriveUrl,
      finalized_at: isFinalized ? now : null,
      finalized_by: isFinalized ? dto.doctorName || "Dr. Tashfin" : null,
    };

    const { data, error } = await this.client
      .from("patient_discharges")
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
      throw new DataError(`Failed to record discharge: ${error.message}`);
    }

    return mapDischargeFromRow(data as Record<string, unknown>);
  }

  async updateDischarge(
    id: string,
    dto: UpdateDischargeDTO
  ): Promise<PatientDischarge> {
    const existing = await this.getDischargeById(id);
    if (!existing) {
      throw new DataError(
        `Discharge record with ID "${id}" was not found`,
        "NOT_FOUND"
      );
    }

    if (existing.status === "finalized") {
      throw new DataError(
        "Cannot modify a finalized discharge report. Finalized clinical records are locked for audit integrity. Use amendment instead."
      );
    }

    const parseResult = updateDischargeSchema.safeParse(dto);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues
        .map((e) => e.message)
        .join(", ");
      throw new ValidationError(`Validation failed: ${errorMsg}`);
    }

    const updatePayload: Record<string, unknown> = {};

    if (dto.dischargeDate !== undefined) {
      updatePayload.discharge_date = dto.dischargeDate;
    }
    if (dto.dischargeTime !== undefined) {
      updatePayload.discharge_time = dto.dischargeTime?.trim() || null;
    }
    if (dto.clinicalReason !== undefined) {
      updatePayload.clinical_reason = dto.clinicalReason.trim();
    }
    if (dto.finalDiagnosis !== undefined) {
      updatePayload.final_diagnosis = dto.finalDiagnosis.trim();
    }
    if (dto.treatmentSummary !== undefined) {
      updatePayload.treatment_summary = dto.treatmentSummary.trim();
    }
    if (dto.conditionAtDischarge !== undefined) {
      updatePayload.condition_at_discharge = dto.conditionAtDischarge;
    }
    if (dto.dischargeInstructions !== undefined) {
      updatePayload.discharge_instructions = dto.dischargeInstructions.trim();
    }
    if (dto.medicationInstructions !== undefined) {
      updatePayload.medication_instructions =
        dto.medicationInstructions?.trim() || null;
    }
    if (dto.recommendedFollowUpDate !== undefined) {
      updatePayload.recommended_follow_up_date =
        dto.recommendedFollowUpDate || null;
    }
    if (dto.followUpInstructions !== undefined) {
      updatePayload.follow_up_instructions =
        dto.followUpInstructions?.trim() || null;
    }
    if (dto.complications !== undefined) {
      updatePayload.complications = dto.complications?.trim() || null;
    }
    if (dto.doctorName !== undefined) {
      updatePayload.doctor_name = dto.doctorName?.trim() || null;
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

    // Optional follow-up scheduling
    if (dto.scheduleFollowUp && dto.recommendedFollowUpDate) {
      try {
        await this.followUpRepo.createFollowUp({
          patientId: existing.patientId,
          chamberId: dto.followUpChamberId || undefined,
          consultationId: dto.consultationId || existing.consultationId || undefined,
          scheduledDate: dto.recommendedFollowUpDate,
          reason: "Post-discharge clinical review and follow-up",
          notes: dto.followUpInstructions || undefined,
          priority: dto.followUpPriority || "normal",
        });
      } catch {
        // Non-fatal
      }
    }

    const { data, error } = await this.client
      .from("patient_discharges")
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
      throw new DataError(`Failed to update discharge: ${error.message}`);
    }

    return mapDischargeFromRow(data as Record<string, unknown>);
  }

  async finalizeDischarge(
    id: string,
    finalizedBy?: string
  ): Promise<PatientDischarge> {
    const existing = await this.getDischargeById(id);
    if (!existing) {
      throw new DataError(
        `Discharge record with ID "${id}" was not found`,
        "NOT_FOUND"
      );
    }

    if (existing.status === "finalized") {
      return existing; // Idempotent
    }

    const now = new Date().toISOString();
    const updatePayload = {
      status: "finalized",
      finalized_at: now,
      finalized_by: finalizedBy || existing.doctorName || "Dr. Tashfin",
    };

    const { data, error } = await this.client
      .from("patient_discharges")
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
      throw new DataError(`Failed to finalize discharge: ${error.message}`);
    }

    return mapDischargeFromRow(data as Record<string, unknown>);
  }

  async amendDischarge(
    id: string,
    dto: AmendDischargeDTO
  ): Promise<PatientDischarge> {
    const existing = await this.getDischargeById(id);
    if (!existing) {
      throw new DataError(
        `Discharge record with ID "${id}" was not found`,
        "NOT_FOUND"
      );
    }

    if (existing.status !== "finalized") {
      throw new DataError(
        "Only finalized discharge reports can receive an auditable amendment. For drafts, edit the record directly."
      );
    }

    const parseResult = amendDischargeSchema.safeParse(dto);
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues
        .map((e) => e.message)
        .join(", ");
      throw new ValidationError(`Validation failed: ${errorMsg}`);
    }

    const now = new Date().toISOString();
    const existingAmendments = existing.amendmentNotes
      ? `${existing.amendmentNotes}\n\n`
      : "";
    const newAmendmentEntry = `[Amendment on ${now.split("T")[0]} by ${
      dto.amendedBy || "Dr. Tashfin"
    }]:\n${dto.amendmentNotes.trim()}`;

    const updatePayload = {
      amendment_notes: `${existingAmendments}${newAmendmentEntry}`,
      amended_at: now,
      amended_by: dto.amendedBy || "Dr. Tashfin",
    };

    const { data, error } = await this.client
      .from("patient_discharges")
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
      throw new DataError(`Failed to amend discharge: ${error.message}`);
    }

    return mapDischargeFromRow(data as Record<string, unknown>);
  }

  async deleteDraftDischarge(id: string): Promise<boolean> {
    const existing = await this.getDischargeById(id);
    if (!existing) {
      return false;
    }

    if (existing.status === "finalized") {
      throw new DataError(
        "Finalized discharge reports cannot be deleted to preserve clinical audit integrity."
      );
    }

    const { error, count } = await this.client
      .from("patient_discharges")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new DataError(`Failed to delete draft discharge: ${error.message}`);
    }

    return (count || 0) > 0;
  }
}
