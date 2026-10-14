import { SupabaseClient } from "@supabase/supabase-js";
import { ISmsReminderRepository } from "./sms-reminder-repository.interface";
import {
  SmsReminder,
  CreateSmsReminderDTO,
  UpdateSmsReminderDTO,
  SmsReminderFilterParams,
} from "@/types/sms";
import { supabase } from "@/lib/supabase/client";
import { DataError } from "../errors";

interface ReminderJoinedRow {
  id: string;
  follow_up_id: string;
  patient_id: string;
  chamber_id: string | null;
  reminder_type: string;
  idempotency_key: string;
  recipient_phone_masked: string;
  recipient_phone_hash: string;
  scheduled_for: string;
  status: string;
  attempt_count: number;
  last_attempt_at: string | null;
  provider_name: string | null;
  provider_message_id: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
  patients?: {
    name?: string;
    patient_id?: string;
  } | null;
  chambers?: {
    name?: string;
    code?: string;
  } | null;
  follow_ups?: {
    scheduled_date?: string;
    scheduled_time?: string;
    reason?: string;
  } | null;
}

const SMS_REMINDER_SELECT = `
  id,
  follow_up_id,
  patient_id,
  chamber_id,
  reminder_type,
  idempotency_key,
  recipient_phone_masked,
  recipient_phone_hash,
  scheduled_for,
  status,
  attempt_count,
  last_attempt_at,
  provider_name,
  provider_message_id,
  failure_reason,
  created_at,
  updated_at,
  patients:patient_id (
    name,
    patient_id
  ),
  chambers:chamber_id (
    name,
    code
  ),
  follow_ups:follow_up_id (
    scheduled_date,
    scheduled_time,
    reason
  )
`;

function mapReminderFromRow(row: ReminderJoinedRow): SmsReminder {
  return {
    id: row.id,
    followUpId: row.follow_up_id,
    patientId: row.patient_id,
    chamberId: row.chamber_id,
    reminderType: row.reminder_type as SmsReminder["reminderType"],
    idempotencyKey: row.idempotency_key,
    recipientPhoneMasked: row.recipient_phone_masked,
    recipientPhoneHash: row.recipient_phone_hash,
    scheduledFor: row.scheduled_for,
    status: row.status as SmsReminder["status"],
    attemptCount: row.attempt_count || 0,
    lastAttemptAt: row.last_attempt_at,
    providerName: row.provider_name,
    providerMessageId: row.provider_message_id,
    failureReason: row.failure_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    patientName: row.patients?.name,
    patientCode: row.patients?.patient_id,
    chamberName: row.chambers?.name,
    chamberCode: row.chambers?.code,
    followUpDate: row.follow_ups?.scheduled_date,
    followUpTime: row.follow_ups?.scheduled_time,
    followUpReason: row.follow_ups?.reason,
  };
}

export class SupabaseSmsReminderRepository implements ISmsReminderRepository {
  private client: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
  }

  public async getReminders(
    params: SmsReminderFilterParams = {}
  ): Promise<{ items: SmsReminder[]; total: number }> {
    let query = this.client
      .from("sms_reminders")
      .select(SMS_REMINDER_SELECT, { count: "exact" });

    if (params.status && params.status !== "all") {
      query = query.eq("status", params.status);
    }
    if (params.reminderType && params.reminderType !== "all") {
      query = query.eq("reminder_type", params.reminderType);
    }
    if (params.chamberId && params.chamberId !== "all") {
      query = query.eq("chamber_id", params.chamberId);
    }
    if (params.patientId) {
      query = query.eq("patient_id", params.patientId);
    }
    if (params.followUpId) {
      query = query.eq("follow_up_id", params.followUpId);
    }

    query = query.order("scheduled_for", { ascending: false });

    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    query = query.range(start, end);

    const { data, count, error } = await query;
    if (error) {
      throw new DataError(`Failed to fetch SMS reminders: ${error.message}`, error.code);
    }

    const items = ((data as unknown as ReminderJoinedRow[]) || []).map(mapReminderFromRow);
    return { items, total: count || 0 };
  }

  public async getReminderById(id: string): Promise<SmsReminder | null> {
    const { data, error } = await this.client
      .from("sms_reminders")
      .select(SMS_REMINDER_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch SMS reminder: ${error.message}`, error.code);
    }
    if (!data) return null;

    return mapReminderFromRow(data as unknown as ReminderJoinedRow);
  }

  public async getReminderByIdempotencyKey(key: string): Promise<SmsReminder | null> {
    const { data, error } = await this.client
      .from("sms_reminders")
      .select(SMS_REMINDER_SELECT)
      .eq("idempotency_key", key)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch SMS reminder by key: ${error.message}`, error.code);
    }
    if (!data) return null;

    return mapReminderFromRow(data as unknown as ReminderJoinedRow);
  }

  public async createReminder(dto: CreateSmsReminderDTO): Promise<SmsReminder> {
    const insertPayload = {
      follow_up_id: dto.followUpId,
      patient_id: dto.patientId,
      chamber_id: dto.chamberId || null,
      reminder_type: dto.reminderType,
      idempotency_key: dto.idempotencyKey,
      recipient_phone_masked: dto.recipientPhoneMasked,
      recipient_phone_hash: dto.recipientPhoneHash,
      scheduled_for: dto.scheduledFor,
      status: dto.status || "pending",
      failure_reason: dto.failureReason || null,
    };

    const { data, error } = await this.client
      .from("sms_reminders")
      .insert(insertPayload)
      .select(SMS_REMINDER_SELECT)
      .single();

    if (error) {
      // If conflict on idempotency key, return existing
      if (error.code === "23505") {
        const existing = await this.getReminderByIdempotencyKey(dto.idempotencyKey);
        if (existing) return existing;
      }
      throw new DataError(`Failed to create SMS reminder: ${error.message}`, error.code);
    }

    return mapReminderFromRow(data as unknown as ReminderJoinedRow);
  }

  public async updateReminder(id: string, dto: UpdateSmsReminderDTO): Promise<SmsReminder> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.status !== undefined) updatePayload.status = dto.status;
    if (dto.attemptCount !== undefined) updatePayload.attempt_count = dto.attemptCount;
    if (dto.lastAttemptAt !== undefined) updatePayload.last_attempt_at = dto.lastAttemptAt;
    if (dto.providerName !== undefined) updatePayload.provider_name = dto.providerName;
    if (dto.providerMessageId !== undefined) updatePayload.provider_message_id = dto.providerMessageId;
    if (dto.failureReason !== undefined) updatePayload.failure_reason = dto.failureReason;

    const { data, error } = await this.client
      .from("sms_reminders")
      .update(updatePayload)
      .eq("id", id)
      .select(SMS_REMINDER_SELECT)
      .single();

    if (error) {
      throw new DataError(`Failed to update SMS reminder: ${error.message}`, error.code);
    }

    return mapReminderFromRow(data as unknown as ReminderJoinedRow);
  }

  public async getPendingRemindersDue(dueBeforeIso: string, limit: number = 50): Promise<SmsReminder[]> {
    const { data, error } = await this.client
      .from("sms_reminders")
      .select(SMS_REMINDER_SELECT)
      .eq("status", "pending")
      .lte("scheduled_for", dueBeforeIso)
      .order("scheduled_for", { ascending: true })
      .limit(limit);

    if (error) {
      throw new DataError(`Failed to fetch due SMS reminders: ${error.message}`, error.code);
    }

    return ((data as unknown as ReminderJoinedRow[]) || []).map(mapReminderFromRow);
  }

  public async cancelPendingRemindersForFollowUp(followUpId: string, reason?: string): Promise<number> {
    const { data, error } = await this.client
      .from("sms_reminders")
      .update({
        status: "cancelled",
        failure_reason: reason || "Follow-up was cancelled or rescheduled",
        updated_at: new Date().toISOString(),
      })
      .eq("follow_up_id", followUpId)
      .in("status", ["pending", "scheduled"])
      .select("id");

    if (error) {
      throw new DataError(`Failed to cancel pending SMS reminders: ${error.message}`, error.code);
    }

    return data ? data.length : 0;
  }

  public async cancelPendingRemindersByFollowUp(
    followUpId: string,
    reason?: string
  ): Promise<number> {
    return this.cancelPendingRemindersForFollowUp(followUpId, reason);
  }

  public async getRemindersForFollowUp(followUpId: string): Promise<SmsReminder[]> {
    const { data, error } = await this.client
      .from("sms_reminders")
      .select(SMS_REMINDER_SELECT)
      .eq("follow_up_id", followUpId)
      .order("scheduled_for", { ascending: true });

    if (error) {
      throw new DataError(`Failed to fetch follow-up SMS reminders: ${error.message}`, error.code);
    }

    return ((data as unknown as ReminderJoinedRow[]) || []).map(mapReminderFromRow);
  }
}
