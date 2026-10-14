/**
 * Dr. Tashfin SMS Follow-up Reminder Service
 * Phase 25 — Secure SMS Follow-up Reminder System
 *
 * Coordinates:
 * - Patient consent enforcement (explicit opted_in required)
 * - Bangladesh phone normalization and masking
 * - Zero fabricated times rule (3h_before only when scheduledTime is explicit)
 * - Idempotent scheduling with deduplication keys
 * - Cancellation cascades on follow-up cancel/reschedule
 * - Outbound dispatch via ISmsProvider with bounded exponential backoff
 */

import {
  SmsReminder,
  SmsReminderType,
  CreateSmsReminderDTO,
} from "@/types/sms";
import { FollowUp } from "@/types/follow-up";
import { Patient } from "@/types/patient";
import { ISmsReminderRepository } from "@/lib/data/repositories/sms-reminder-repository.interface";
import { getSmsReminderRepository as resolveSmsRepo } from "@/lib/data";
import { normalizeBdPhoneNumber, maskPhoneNumber, hashPhoneNumber } from "./phone-utils";
import { renderFollowUpReminderMessage } from "./sms-templates";
import { getSmsProvider } from "./providers";
import { ISmsProvider } from "./providers/sms-provider.interface";

export interface ScheduleRemindersResult {
  scheduled: SmsReminder[];
  skipped: SmsReminder[];
  reasons: string[];
}

export class SmsReminderService {
  private reminderRepo: ISmsReminderRepository;
  private smsProvider: ISmsProvider;

  constructor(
    reminderRepo?: ISmsReminderRepository,
    smsProvider?: ISmsProvider
  ) {
    this.reminderRepo = reminderRepo || resolveSmsRepo();
    this.smsProvider = smsProvider || getSmsProvider();
  }

  /**
   * Calculate scheduled UTC timestamp for Asia/Dhaka (+06:00) follow-up date and time
   */
  public calculateReminderTime(
    scheduledDate: string,
    scheduledTime: string | undefined,
    reminderType: SmsReminderType
  ): { targetIso: string; sendIso: string; hasExplicitTime: boolean } | null {
    // Zero fabricated times rule:
    // If no explicit time is set, 3h_before cannot be computed safely and must be skipped.
    const hasExplicitTime = Boolean(scheduledTime && scheduledTime.trim().length > 0);

    if (reminderType === "3h_before" && !hasExplicitTime) {
      return null;
    }

    if (hasExplicitTime) {
      // Clean time to HH:mm
      const cleanTime = scheduledTime!.trim().slice(0, 5);
      const appointmentDhakaIso = `${scheduledDate}T${cleanTime}:00+06:00`;
      const appointmentMs = new Date(appointmentDhakaIso).getTime();

      if (isNaN(appointmentMs)) {
        return null;
      }

      const offsetMs =
        reminderType === "24h_before"
          ? 24 * 60 * 60 * 1000
          : 3 * 60 * 60 * 1000;

      const sendMs = appointmentMs - offsetMs;
      return {
        targetIso: new Date(appointmentMs).toISOString(),
        sendIso: new Date(sendMs).toISOString(),
        hasExplicitTime: true,
      };
    } else {
      // Date only: appointment is scheduled for scheduledDate.
      // 24h reminder is sent at 10:00 AM Asia/Dhaka on the day prior.
      const dateParts = scheduledDate.split("-").map(Number);
      if (dateParts.length !== 3 || dateParts.some(isNaN)) {
        return null;
      }

      const [year, month, day] = dateParts;
      // 10:00:00 on the day of appointment in Asia/Dhaka (+06:00)
      const dayOfIso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T10:00:00+06:00`;
      const dayOfMs = new Date(dayOfIso).getTime();

      if (isNaN(dayOfMs)) {
        return null;
      }

      // 24h before is 10:00 AM on the day before
      const sendMs = dayOfMs - 24 * 60 * 60 * 1000;
      return {
        targetIso: new Date(dayOfMs).toISOString(),
        sendIso: new Date(sendMs).toISOString(),
        hasExplicitTime: false,
      };
    }
  }

  /**
   * Schedule reminders for a follow-up.
   * Handles deduplication, consent validation, and phone normalization.
   */
  public async scheduleRemindersForFollowUp(
    followUp: FollowUp,
    patient: Patient,
    chamberName?: string
  ): Promise<ScheduleRemindersResult> {
    const scheduled: SmsReminder[] = [];
    const skipped: SmsReminder[] = [];
    const reasons: string[] = [];

    // 1. Validate follow-up status
    if (followUp.status !== "scheduled") {
      reasons.push(`Follow-up is in '${followUp.status}' status; reminders only scheduled for 'scheduled' follow-ups.`);
      return { scheduled, skipped, reasons };
    }

    // 2. Check patient consent
    const isOptedIn = patient.smsConsentStatus === "opted_in";
    const rawPhone = patient.phone || followUp.patientPhone;
    const normResult = rawPhone ? normalizeBdPhoneNumber(rawPhone) : null;
    const normalizedPhone = normResult?.isValid && normResult.normalized ? normResult.normalized : null;

    const reminderTypes: SmsReminderType[] = ["24h_before"];
    if (followUp.scheduledTime && followUp.scheduledTime.trim()) {
      reminderTypes.push("3h_before");
    }

    const effectiveChamber = chamberName || followUp.chamberName || "Dhaka Chamber";

    for (const reminderType of reminderTypes) {
      const idempotencyKey = `fu_${followUp.id}_${reminderType}`;

      // Check if reminder already exists
      const existing = await this.reminderRepo.getReminderByIdempotencyKey(idempotencyKey);
      if (existing) {
        if (existing.status === "sent") {
          reasons.push(`Reminder for ${reminderType} already sent (ID: ${existing.id}).`);
          continue;
        }
        if (existing.status === "pending" || existing.status === "scheduled") {
          scheduled.push(existing);
          continue;
        }
      }

      const timing = this.calculateReminderTime(
        followUp.scheduledDate,
        followUp.scheduledTime,
        reminderType
      );

      if (!timing) {
        reasons.push(`Skipped ${reminderType}: unable to calculate reminder send time.`);
        continue;
      }

      // Prepare message content (strictly privacy-preserving)
      const message = renderFollowUpReminderMessage({
        followUpDate: followUp.scheduledDate,
        followUpTime: followUp.scheduledTime,
        chamberName: effectiveChamber,
        language: "en",
      });

      const recipientPhone = normalizedPhone || rawPhone || "+880000000000";
      const masked = maskPhoneNumber(recipientPhone);
      const hash = hashPhoneNumber(recipientPhone);

      // Determine status based on consent and phone validity
      let initialStatus: SmsReminder["status"] = "scheduled";
      let failureReason: string | undefined = undefined;

      if (!isOptedIn) {
        initialStatus = "skipped";
        failureReason = `Patient has not opted in for SMS reminders (consent status: ${patient.smsConsentStatus || "unknown"}).`;
      } else if (!normalizedPhone) {
        initialStatus = "skipped";
        failureReason = `Invalid or missing Bangladesh mobile number: ${rawPhone || "none"}`;
      }

      const createDto: CreateSmsReminderDTO = {
        followUpId: followUp.id,
        patientId: patient.id,
        recipientPhone: normalizedPhone || rawPhone || "",
        recipientPhoneMasked: masked,
        recipientPhoneHash: hash,
        messageContent: message,
        reminderType,
        scheduledFor: timing.sendIso,
        status: initialStatus,
        idempotencyKey,
        failureReason,
        metadata: {
          chamberId: followUp.chamberId,
          chamberName: effectiveChamber,
          appointmentDate: followUp.scheduledDate,
          appointmentTime: followUp.scheduledTime,
          consentStatusAtScheduling: patient.smsConsentStatus || "unknown",
        },
      };

      const saved = await this.reminderRepo.createReminder(createDto);
      if (initialStatus === "scheduled") {
        scheduled.push(saved);
      } else {
        skipped.push(saved);
        if (failureReason) reasons.push(failureReason);
      }
    }

    return { scheduled, skipped, reasons };
  }

  /**
   * Invalidate and cancel pending reminders when follow-up is cancelled, rescheduled, or completed.
   */
  public async invalidatePendingReminders(
    followUpId: string,
    reason: string
  ): Promise<number> {
    if (typeof this.reminderRepo.cancelPendingRemindersForFollowUp === "function") {
      return await this.reminderRepo.cancelPendingRemindersForFollowUp(followUpId, reason);
    }
    const fallback = (this.reminderRepo as unknown as { cancelPendingRemindersByFollowUp?: (id: string, r: string) => Promise<number> });
    if (typeof fallback.cancelPendingRemindersByFollowUp === "function") {
      return await fallback.cancelPendingRemindersByFollowUp(followUpId, reason);
    }
    return 0;
  }

  /**
   * Process pending queue: fetch due reminders and dispatch them via the configured provider.
   */
  public async processPendingReminders(options?: {
    now?: Date;
    limit?: number;
  }): Promise<{
    processed: number;
    sent: number;
    failed: number;
    skipped: number;
    results: Array<{ reminderId: string; status: string; detail?: string }>;
  }> {
    const referenceTime = (options?.now || new Date()).toISOString();
    const limit = options?.limit || 25;

    const dueReminders = await this.reminderRepo.getPendingRemindersDue(
      referenceTime,
      limit
    );

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const results: Array<{ reminderId: string; status: string; detail?: string }> = [];

    for (const reminder of dueReminders) {
      if (reminder.status === "skipped" || reminder.status === "cancelled") {
        skipped++;
        continue;
      }

      if (!reminder.recipientPhone && !reminder.recipientPhoneMasked) {
        skipped++;
        await this.reminderRepo.updateReminder(reminder.id, {
          status: "skipped",
          failureReason: "No recipient phone number available",
        });
        results.push({
          reminderId: reminder.id,
          status: "skipped",
          detail: "Missing recipient phone",
        });
        continue;
      }

      try {
        // Dispatch via provider
        const sendResult = await this.smsProvider.sendSms({
          recipientPhone: reminder.recipientPhone || reminder.recipientPhoneMasked,
          message: reminder.messageContent || "",
          reminderType: reminder.reminderType,
          idempotencyKey: reminder.idempotencyKey,
        });

        if (sendResult.success) {
          sent++;
          await this.reminderRepo.updateReminder(reminder.id, {
            status: "sent",
            sentAt: new Date().toISOString(),
            providerMessageId: sendResult.providerMessageId || `sms_${Date.now()}`,
            deliveryStatus: "delivered",
            providerResponse: sendResult.rawResponse,
            failureReason: undefined,
          });
          results.push({
            reminderId: reminder.id,
            status: "sent",
            detail: sendResult.providerMessageId,
          });
        } else {
          // Failure handling
          failed++;
          const newRetryCount = (reminder.retryCount || 0) + 1;
          const maxRetries = 3;
          const errorMsg =
            typeof sendResult.error === "string"
              ? sendResult.error
              : (sendResult.error as unknown as { message?: string })?.message || "Delivery failed";

          if (sendResult.isRetryable && newRetryCount < maxRetries) {
            // Exponential backoff: 5m, 10m, 20m
            const backoffMs = 5 * 60 * 1000 * Math.pow(2, newRetryCount - 1);
            const nextScheduledIso = new Date(Date.now() + backoffMs).toISOString();

            await this.reminderRepo.updateReminder(reminder.id, {
              status: "pending",
              retryCount: newRetryCount,
              scheduledFor: nextScheduledIso,
              failureReason: `Transient error (attempt ${newRetryCount}/${maxRetries}): ${errorMsg}`,
              providerResponse: sendResult.rawResponse,
            });
            results.push({
              reminderId: reminder.id,
              status: "retry_scheduled",
              detail: `Retry scheduled for ${nextScheduledIso}`,
            });
          } else {
            // Permanent failure or max retries exceeded
            await this.reminderRepo.updateReminder(reminder.id, {
              status: "failed",
              retryCount: newRetryCount,
              failureReason: errorMsg,
              providerResponse: sendResult.rawResponse,
            });
            results.push({
              reminderId: reminder.id,
              status: "failed",
              detail: errorMsg,
            });
          }
        }
      } catch (err: unknown) {
        failed++;
        const errMsg = err instanceof Error ? err.message : "Unexpected transmission error";
        const newRetryCount = (reminder.retryCount || 0) + 1;

        await this.reminderRepo.updateReminder(reminder.id, {
          status: newRetryCount >= 3 ? "failed" : "pending",
          retryCount: newRetryCount,
          failureReason: errMsg,
        });
        results.push({
          reminderId: reminder.id,
          status: "error",
          detail: errMsg,
        });
      }
    }

    return {
      processed: dueReminders.length,
      sent,
      failed,
      skipped,
      results,
    };
  }

  /**
   * Manual retry of a reminder by authorized doctor.
   */
  public async retryReminder(reminderId: string): Promise<SmsReminder> {
    const reminder = await this.reminderRepo.getReminderById(reminderId);
    if (!reminder) {
      throw new Error(`SMS reminder with ID "${reminderId}" not found.`);
    }

    // Attempt dispatch
    const sendResult = await this.smsProvider.sendSms({
      recipientPhone: reminder.recipientPhone || reminder.recipientPhoneMasked,
      message: reminder.messageContent || "",
      reminderType: reminder.reminderType,
      idempotencyKey: reminder.idempotencyKey,
    });

    const newRetryCount = (reminder.retryCount || 0) + 1;

    if (sendResult.success) {
      return await this.reminderRepo.updateReminder(reminder.id, {
        status: "sent",
        sentAt: new Date().toISOString(),
        providerMessageId: sendResult.providerMessageId || `retry_${Date.now()}`,
        deliveryStatus: "delivered",
        providerResponse: sendResult.rawResponse,
        failureReason: undefined,
      });
    } else {
      const errorMsg =
        typeof sendResult.error === "string"
          ? sendResult.error
          : (sendResult.error as unknown as { message?: string })?.message || "Manual retry failed";

      return await this.reminderRepo.updateReminder(reminder.id, {
        status: "failed",
        retryCount: newRetryCount,
        failureReason: errorMsg,
        providerResponse: sendResult.rawResponse,
      });
    }
  }
}

let singletonService: SmsReminderService | null = null;

export function getSmsReminderService(): SmsReminderService {
  if (!singletonService) {
    singletonService = new SmsReminderService();
  }
  return singletonService;
}
