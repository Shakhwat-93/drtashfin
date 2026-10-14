import { SupabaseClient } from "@supabase/supabase-js";
import { IFollowUpRepository } from "./follow-up-repository.interface";
import { IPatientRepository } from "./patient-repository.interface";
import { SupabasePatientRepository } from "./supabase-patient-repository";
import {
  FollowUp,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  CompleteFollowUpDTO,
  RescheduleFollowUpDTO,
  CancelFollowUpDTO,
  FollowUpFilterParams,
} from "@/types/follow-up";
import { supabase } from "@/lib/supabase/client";
import { PatientNotFoundError, ValidationError, DataError } from "../errors";
import {
  createFollowUpSchema,
  updateFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  cancelFollowUpSchema,
} from "@/schemas/follow-up";

function mapFollowUpFromRow(row: Record<string, unknown>): FollowUp {
  const patientRel = row.patients as Record<string, unknown> | undefined;
  const chamberRel = row.chambers as Record<string, unknown> | undefined;

  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientCode: row.patient_code
      ? String(row.patient_code)
      : patientRel?.patient_id
      ? String(patientRel.patient_id)
      : undefined,
    patientName: patientRel?.name ? String(patientRel.name) : undefined,
    patientPhone: patientRel?.phone ? String(patientRel.phone) : undefined,
    chamberId: row.chamber_id ? String(row.chamber_id) : undefined,
    chamberName: chamberRel?.name ? String(chamberRel.name) : undefined,
    chamberCode: chamberRel?.code ? String(chamberRel.code) : undefined,
    consultationId: row.consultation_id ? String(row.consultation_id) : undefined,
    originatingConsultationId: row.consultation_id ? String(row.consultation_id) : undefined,
    followUpConsultationId: row.follow_up_consultation_id
      ? String(row.follow_up_consultation_id)
      : undefined,
    scheduledDate: String(row.scheduled_date),
    scheduledTime: row.scheduled_time ? String(row.scheduled_time) : undefined,
    reason: String(row.reason),
    notes: row.notes ? String(row.notes) : undefined,
    status: row.status as FollowUp["status"],
    clinicalOutcome: row.clinical_outcome
      ? (row.clinical_outcome as FollowUp["clinicalOutcome"])
      : undefined,
    outcomeNotes: row.outcome_notes ? String(row.outcome_notes) : undefined,
    cancellationReason: row.cancellation_reason
      ? String(row.cancellation_reason)
      : undefined,
    priority: row.priority ? (row.priority as FollowUp["priority"]) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

const FOLLOW_UP_SELECT_FIELDS =
  "*, patients(name, phone, patient_id), chambers(name, code, patient_id_prefix)";

export class SupabaseFollowUpRepository implements IFollowUpRepository {
  private patientRepo: IPatientRepository;
  private client: SupabaseClient;

  constructor(patientRepo?: IPatientRepository, client: SupabaseClient = supabase) {
    this.patientRepo = patientRepo || new SupabasePatientRepository(client);
    this.client = client;
  }

  public async getFollowUpsByPatient(patientId: string): Promise<FollowUp[]> {
    if (!patientId) return [];

    const patient = await this.patientRepo.getPatientByIdentifier(patientId);
    if (!patient) return [];

    const { data, error } = await this.client
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT_FIELDS)
      .or(`patient_id.eq.${patient.id},patient_code.eq.${patient.patientId}`)
      .order("scheduled_date", { ascending: false });

    if (error) {
      throw new DataError(`Failed to fetch follow-ups: ${error.message}`, error.code);
    }

    return (data || []).map(mapFollowUpFromRow);
  }

  public async getFollowUps(params: FollowUpFilterParams = {}): Promise<FollowUp[]> {
    let query = this.client.from("follow_ups").select(FOLLOW_UP_SELECT_FIELDS);
    const todayStr = new Date().toISOString().split("T")[0];

    if (params.patientId) {
      const patient = await this.patientRepo.getPatientByIdentifier(params.patientId);
      if (patient) {
        query = query.or(`patient_id.eq.${patient.id},patient_code.eq.${patient.patientId}`);
      }
    }

    if (params.chamberId && params.chamberId !== "all") {
      query = query.eq("chamber_id", params.chamberId);
    }

    if (params.status) {
      if (params.status === "overdue") {
        query = query.eq("status", "scheduled").lt("scheduled_date", todayStr);
      } else if (params.status !== "all") {
        query = query.eq("status", params.status);
      }
    }

    if (params.startDate) {
      query = query.gte("scheduled_date", params.startDate);
    }

    if (params.endDate) {
      query = query.lte("scheduled_date", params.endDate);
    }

    query = query.order("scheduled_date", { ascending: false });

    const { data, error } = await query;
    if (error) {
      throw new DataError(`Failed to fetch filtered follow-ups: ${error.message}`, error.code);
    }

    return (data || []).map(mapFollowUpFromRow);
  }

  public async getFollowUpById(id: string): Promise<FollowUp | null> {
    if (!id) return null;

    const { data, error } = await this.client
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT_FIELDS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch follow-up by ID: ${error.message}`, error.code);
    }

    return data ? mapFollowUpFromRow(data) : null;
  }

  public async createFollowUp(data: CreateFollowUpDTO): Promise<FollowUp> {
    const parseResult = createFollowUpSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Follow-up validation failed.", formatted);
    }

    const validated = parseResult.data;
    const patient = await this.patientRepo.getPatientByIdentifier(validated.patientId);
    if (!patient) {
      throw new PatientNotFoundError(validated.patientId);
    }

    const payload: Record<string, unknown> = {
      patient_id: patient.id,
      patient_code: patient.patientId,
      chamber_id: validated.chamberId || patient.chamberId || null,
      consultation_id:
        validated.consultationId ||
        validated.originatingConsultationId ||
        null,
      scheduled_date: validated.scheduledDate,
      scheduled_time: validated.scheduledTime ? validated.scheduledTime.trim() : null,
      reason: (validated.reason || "Routine follow-up").trim(),
      notes: validated.notes ? validated.notes.trim() : null,
      status: "scheduled",
      priority: validated.priority || "routine",
    };

    const { data: inserted, error } = await this.client
      .from("follow_ups")
      .insert(payload)
      .select(FOLLOW_UP_SELECT_FIELDS)
      .single();

    if (error) {
      throw new DataError(`Failed to schedule follow-up: ${error.message}`, error.code);
    }

    return mapFollowUpFromRow(inserted);
  }

  public async updateFollowUp(
    id: string,
    data: UpdateFollowUpDTO
  ): Promise<FollowUp> {
    const parseResult = updateFollowUpSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Follow-up update validation failed.", formatted);
    }

    const existing = await this.getFollowUpById(id);
    if (!existing) {
      throw new DataError(`Follow-up with ID "${id}" was not found.`);
    }

    const validated = parseResult.data;
    const updatePayload: Record<string, unknown> = {};

    if (validated.scheduledDate !== undefined)
      updatePayload.scheduled_date = validated.scheduledDate;
    if (validated.scheduledTime !== undefined)
      updatePayload.scheduled_time = validated.scheduledTime;
    if (validated.reason !== undefined)
      updatePayload.reason = validated.reason.trim();
    if (validated.notes !== undefined)
      updatePayload.notes = validated.notes?.trim() || null;
    if (validated.consultationId !== undefined || validated.originatingConsultationId !== undefined)
      updatePayload.consultation_id =
        validated.consultationId ||
        validated.originatingConsultationId ||
        null;
    if (validated.status !== undefined)
      updatePayload.status = validated.status;
    if (validated.clinicalOutcome !== undefined)
      updatePayload.clinical_outcome = validated.clinicalOutcome || null;
    if (validated.outcomeNotes !== undefined)
      updatePayload.outcome_notes = validated.outcomeNotes?.trim() || null;
    if (validated.cancellationReason !== undefined)
      updatePayload.cancellation_reason = validated.cancellationReason?.trim() || null;
    if (validated.priority !== undefined)
      updatePayload.priority = validated.priority;
    if (validated.followUpConsultationId !== undefined)
      updatePayload.follow_up_consultation_id = validated.followUpConsultationId || null;

    const { data: updated, error } = await this.client
      .from("follow_ups")
      .update(updatePayload)
      .eq("id", id)
      .select(FOLLOW_UP_SELECT_FIELDS)
      .single();

    if (error) {
      throw new DataError(`Failed to update follow-up: ${error.message}`, error.code);
    }

    return mapFollowUpFromRow(updated);
  }

  public async completeFollowUp(
    id: string,
    data: CompleteFollowUpDTO
  ): Promise<FollowUp> {
    const parseResult = completeFollowUpSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Follow-up completion validation failed.", formatted);
    }

    return await this.updateFollowUp(id, {
      status: "completed",
      clinicalOutcome: parseResult.data.clinicalOutcome,
      outcomeNotes: parseResult.data.outcomeNotes?.trim() || undefined,
      followUpConsultationId: parseResult.data.followUpConsultationId || undefined,
    });
  }

  public async rescheduleFollowUp(
    id: string,
    data: RescheduleFollowUpDTO
  ): Promise<FollowUp> {
    const parseResult = rescheduleFollowUpSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Follow-up reschedule validation failed.", formatted);
    }

    return await this.updateFollowUp(id, {
      scheduledDate: parseResult.data.scheduledDate,
      scheduledTime: parseResult.data.scheduledTime,
      reason: parseResult.data.reason?.trim(),
      status: "scheduled",
    });
  }

  public async cancelFollowUp(
    id: string,
    data: CancelFollowUpDTO
  ): Promise<FollowUp> {
    const parseResult = cancelFollowUpSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Follow-up cancellation validation failed.", formatted);
    }

    return await this.updateFollowUp(id, {
      status: "cancelled",
      cancellationReason: parseResult.data.cancellationReason.trim(),
    });
  }

  public async deleteFollowUp(id: string): Promise<boolean> {
    const { error } = await this.client.from("follow_ups").delete().eq("id", id);
    if (error) {
      throw new DataError(`Failed to delete follow-up: ${error.message}`, error.code);
    }
    return true;
  }

  public async getUpcomingFollowUps(
    limitOrFilterId?: number | string,
    chamberId?: string
  ): Promise<FollowUp[]> {
    const todayStr = new Date().toISOString().split("T")[0];
    const filterId = typeof limitOrFilterId === "string" ? limitOrFilterId : chamberId;
    const limit = typeof limitOrFilterId === "number" ? limitOrFilterId : 10;

    let query = this.client
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT_FIELDS)
      .eq("status", "scheduled")
      .gte("scheduled_date", todayStr)
      .order("scheduled_date", { ascending: true })
      .limit(limit);

    if (filterId && filterId !== "all") {
      query = query.or(`chamber_id.eq.${filterId},patient_id.eq.${filterId},patient_code.eq.${filterId}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new DataError(`Failed to fetch upcoming follow-ups: ${error.message}`, error.code);
    }

    return (data || []).map(mapFollowUpFromRow);
  }

  public async getOverdueFollowUps(filterId?: string): Promise<FollowUp[]> {
    const todayStr = new Date().toISOString().split("T")[0];
    let query = this.client
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT_FIELDS)
      .eq("status", "scheduled")
      .lt("scheduled_date", todayStr)
      .order("scheduled_date", { ascending: true });

    if (filterId && filterId !== "all") {
      query = query.or(`chamber_id.eq.${filterId},patient_id.eq.${filterId},patient_code.eq.${filterId}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new DataError(`Failed to fetch overdue follow-ups: ${error.message}`, error.code);
    }

    return (data || []).map(mapFollowUpFromRow);
  }

  public async getCompletedFollowUps(filterId?: string): Promise<FollowUp[]> {
    let query = this.client
      .from("follow_ups")
      .select(FOLLOW_UP_SELECT_FIELDS)
      .eq("status", "completed")
      .order("updated_at", { ascending: false });

    if (filterId && filterId !== "all") {
      query = query.or(`chamber_id.eq.${filterId},patient_id.eq.${filterId},patient_code.eq.${filterId}`);
    }

    const { data, error } = await query;
    if (error) {
      throw new DataError(`Failed to fetch completed follow-ups: ${error.message}`, error.code);
    }

    return (data || []).map(mapFollowUpFromRow);
  }

  public async getDismissedAlertIds(): Promise<string[]> {
    try {
      const { data, error } = await this.client
        .from("doctor_dismissed_alerts")
        .select("alert_id");

      if (error) {
        return [];
      }
      return (data || []).map((row) => String(row.alert_id));
    } catch {
      return [];
    }
  }

  public async dismissAlert(alertId: string): Promise<void> {
    if (!alertId) return;
    try {
      await this.client
        .from("doctor_dismissed_alerts")
        .upsert({ alert_id: alertId }, { onConflict: "alert_id" });
    } catch {
      // Non-blocking fallback
    }
  }
}
