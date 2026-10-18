import { SupabaseClient } from "@supabase/supabase-js";
import { IConsultationRepository } from "./consultation-repository.interface";
import { IPatientRepository } from "./patient-repository.interface";
import {
  Consultation,
  CreateConsultationDTO,
  UpdateConsultationDTO,
} from "@/types/consultation";
import { supabase } from "@/lib/supabase/client";
import { PatientNotFoundError, ValidationError, DataError } from "../errors";
import {
  createConsultationSchema,
  updateConsultationSchema,
} from "@/schemas/consultation";

function mapConsultationFromRow(row: Record<string, unknown>): Consultation {
  return {
    id: String(row.id),
    patientId: String(row.patient_code || row.patient_id),
    chamberId: row.chamber_id ? String(row.chamber_id) : undefined,
    consultationDate: String(row.consultation_date),
    consultationTime: row.consultation_time ? String(row.consultation_time) : undefined,
    status: row.status as Consultation["status"],
    chiefComplaint: row.chief_complaint ? String(row.chief_complaint) : undefined,
    birthHistory: row.birth_history ? String(row.birth_history) : undefined,
    familyHistory: row.family_history ? String(row.family_history) : undefined,
    consanguinity: row.consanguinity as Consultation["consanguinity"],
    drugHistory: row.drug_history ? String(row.drug_history) : undefined,
    others: row.others ? String(row.others) : undefined,
    clinicalExamination: row.clinical_examination ? String(row.clinical_examination) : undefined,
    clinicalNotes: row.clinical_notes ? String(row.clinical_notes) : undefined,
    investigationAdvised: row.investigation_advised ? String(row.investigation_advised) : undefined,
    currentInvestigation: row.current_investigation ? String(row.current_investigation) : undefined,
    provisionalDiagnosis: row.provisional_diagnosis ? String(row.provisional_diagnosis) : undefined,
    differentialDiagnosis: row.differential_diagnosis ? String(row.differential_diagnosis) : undefined,
    plan: row.plan ? String(row.plan) : undefined,
    advice: row.advice ? String(row.advice) : undefined,
    treatmentInstructions: row.treatment_instructions ? String(row.treatment_instructions) : undefined,
    lifestyleInstructions: row.lifestyle_instructions ? String(row.lifestyle_instructions) : undefined,
    treatmentStartDate: row.treatment_start_date ? String(row.treatment_start_date) : undefined,
    treatmentReviewDate: row.treatment_review_date ? String(row.treatment_review_date) : undefined,
    nextFollowUp: row.next_follow_up ? String(row.next_follow_up) : undefined,
    followUpReason: row.follow_up_reason ? String(row.follow_up_reason) : undefined,
    clinicalOutcome: row.clinical_outcome as Consultation["clinicalOutcome"],
    progressNotes: row.progress_notes ? String(row.progress_notes) : undefined,
    isFollowUp: Boolean(row.is_follow_up),
    originatingConsultationId: row.originating_consultation_id ? String(row.originating_consultation_id) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export class SupabaseConsultationRepository implements IConsultationRepository {
  private patientRepo: IPatientRepository;
  private client: SupabaseClient;

  constructor(patientRepo: IPatientRepository, client: SupabaseClient = supabase) {
    this.patientRepo = patientRepo;
    this.client = client;
  }

  public async getConsultationsByPatient(
    patientId: string
  ): Promise<Consultation[]> {
    if (!patientId) return [];

    const patient = await this.patientRepo.getPatientByIdentifier(patientId);
    if (!patient) return [];

    const { data, error } = await this.client
      .from("consultations")
      .select("*")
      .or(`patient_id.eq.${patient.id},patient_code.eq.${patient.patientId}`)
      .order("consultation_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new DataError(`Failed to fetch consultations: ${error.message}`, error.code);
    }

    return (data || []).map(mapConsultationFromRow);
  }

  public async getConsultationById(id: string): Promise<Consultation | null> {
    if (!id) return null;

    const { data, error } = await this.client
      .from("consultations")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch consultation by id: ${error.message}`, error.code);
    }

    return data ? mapConsultationFromRow(data) : null;
  }

  public async createConsultation(
    data: CreateConsultationDTO
  ): Promise<Consultation> {
    const parseResult = createConsultationSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Consultation validation failed.", formatted);
    }

    const validated = parseResult.data;

    // Verify patient identity exists in database
    const patient = await this.patientRepo.getPatientByIdentifier(validated.patientId);
    if (!patient) {
      throw new PatientNotFoundError(validated.patientId);
    }

    const payload: Record<string, unknown> = {
      patient_id: patient.id,
      patient_code: patient.patientId,
      chamber_id: validated.chamberId || patient.chamberId || null,
      consultation_date: validated.consultationDate,
      consultation_time: validated.consultationTime || "10:00 AM",
      status: validated.status || "completed",
      chief_complaint: validated.chiefComplaint?.trim() || null,
      birth_history: validated.birthHistory?.trim() || null,
      family_history: validated.familyHistory?.trim() || null,
      consanguinity: validated.consanguinity || null,
      drug_history: validated.drugHistory?.trim() || null,
      others: validated.others?.trim() || null,
      clinical_examination: validated.clinicalExamination?.trim() || null,
      clinical_notes: validated.clinicalNotes?.trim() || null,
      investigation_advised: validated.investigationAdvised?.trim() || null,
      current_investigation: validated.currentInvestigation?.trim() || null,
      provisional_diagnosis: validated.provisionalDiagnosis?.trim() || null,
      differential_diagnosis: validated.differentialDiagnosis?.trim() || null,
      plan: validated.plan?.trim() || null,
      advice: validated.advice?.trim() || null,
      treatment_instructions: validated.treatmentInstructions?.trim() || null,
      lifestyle_instructions: validated.lifestyleInstructions?.trim() || null,
      treatment_start_date: validated.treatmentStartDate || validated.consultationDate,
      treatment_review_date: validated.treatmentReviewDate || null,
      next_follow_up: validated.nextFollowUp || null,
      follow_up_reason: validated.followUpReason?.trim() || null,
      clinical_outcome: validated.clinicalOutcome || null,
      progress_notes: validated.progressNotes?.trim() || null,
      is_follow_up: Boolean(validated.isFollowUp),
      originating_consultation_id: validated.originatingConsultationId || null,
    };

    const { data: inserted, error } = await this.client
      .from("consultations")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new DataError(`Failed to save consultation: ${error.message}`, error.code);
    }

    return mapConsultationFromRow(inserted);
  }

  public async updateConsultation(
    id: string,
    data: UpdateConsultationDTO
  ): Promise<Consultation> {
    const parseResult = updateConsultationSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Consultation update validation failed.", formatted);
    }

    const existing = await this.getConsultationById(id);
    if (!existing) {
      throw new DataError(`Consultation with ID "${id}" was not found.`);
    }

    const validated = parseResult.data;
    const updatePayload: Record<string, unknown> = {};

    if (validated.consultationDate !== undefined)
      updatePayload.consultation_date = validated.consultationDate;
    if (validated.consultationTime !== undefined)
      updatePayload.consultation_time = validated.consultationTime;
    if (validated.status !== undefined)
      updatePayload.status = validated.status;
    if (validated.chiefComplaint !== undefined)
      updatePayload.chief_complaint = validated.chiefComplaint?.trim() || null;
    if (validated.birthHistory !== undefined)
      updatePayload.birth_history = validated.birthHistory?.trim() || null;
    if (validated.familyHistory !== undefined)
      updatePayload.family_history = validated.familyHistory?.trim() || null;
    if (validated.consanguinity !== undefined)
      updatePayload.consanguinity = validated.consanguinity || null;
    if (validated.drugHistory !== undefined)
      updatePayload.drug_history = validated.drugHistory?.trim() || null;
    if (validated.others !== undefined)
      updatePayload.others = validated.others?.trim() || null;
    if (validated.clinicalExamination !== undefined)
      updatePayload.clinical_examination = validated.clinicalExamination?.trim() || null;
    if (validated.clinicalNotes !== undefined)
      updatePayload.clinical_notes = validated.clinicalNotes?.trim() || null;
    if (validated.investigationAdvised !== undefined)
      updatePayload.investigation_advised = validated.investigationAdvised?.trim() || null;
    if (validated.currentInvestigation !== undefined)
      updatePayload.current_investigation = validated.currentInvestigation?.trim() || null;
    if (validated.provisionalDiagnosis !== undefined)
      updatePayload.provisional_diagnosis = validated.provisionalDiagnosis?.trim() || null;
    if (validated.differentialDiagnosis !== undefined)
      updatePayload.differential_diagnosis = validated.differentialDiagnosis?.trim() || null;
    if (validated.plan !== undefined)
      updatePayload.plan = validated.plan?.trim() || null;
    if (validated.advice !== undefined)
      updatePayload.advice = validated.advice?.trim() || null;
    if (validated.treatmentInstructions !== undefined)
      updatePayload.treatment_instructions = validated.treatmentInstructions?.trim() || null;
    if (validated.lifestyleInstructions !== undefined)
      updatePayload.lifestyle_instructions = validated.lifestyleInstructions?.trim() || null;
    if (validated.treatmentStartDate !== undefined)
      updatePayload.treatment_start_date = validated.treatmentStartDate || null;
    if (validated.treatmentReviewDate !== undefined)
      updatePayload.treatment_review_date = validated.treatmentReviewDate || null;
    if (validated.nextFollowUp !== undefined)
      updatePayload.next_follow_up = validated.nextFollowUp || null;
    if (validated.followUpReason !== undefined)
      updatePayload.follow_up_reason = validated.followUpReason?.trim() || null;
    if (validated.clinicalOutcome !== undefined)
      updatePayload.clinical_outcome = validated.clinicalOutcome || null;
    if (validated.progressNotes !== undefined)
      updatePayload.progress_notes = validated.progressNotes?.trim() || null;
    if (validated.isFollowUp !== undefined)
      updatePayload.is_follow_up = Boolean(validated.isFollowUp);
    if (validated.originatingConsultationId !== undefined)
      updatePayload.originating_consultation_id = validated.originatingConsultationId || null;

    const { data: updated, error } = await this.client
      .from("consultations")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new DataError(`Failed to update consultation: ${error.message}`, error.code);
    }

    return mapConsultationFromRow(updated);
  }

  public async getRecentConsultations(limit = 5): Promise<Consultation[]> {
    const { data, error } = await this.client
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new DataError(`Failed to fetch recent consultations: ${error.message}`, error.code);
    }

    return (data || []).map(mapConsultationFromRow);
  }

  public async getTotalConsultationCount(): Promise<number> {
    const { count, error } = await this.client
      .from("consultations")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new DataError(`Failed to count consultations: ${error.message}`, error.code);
    }

    return count ?? 0;
  }
}
