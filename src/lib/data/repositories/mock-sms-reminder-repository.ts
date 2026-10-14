import { ISmsReminderRepository } from "./sms-reminder-repository.interface";
import {
  SmsReminder,
  CreateSmsReminderDTO,
  UpdateSmsReminderDTO,
  SmsReminderFilterParams,
} from "@/types/sms";
import { MockStorage } from "../mock/mock-storage";
import { generateInternalUUID } from "../id-generator";
import { IPatientRepository } from "./patient-repository.interface";
import { MockPatientRepository } from "./mock-patient-repository";
import { IChamberRepository } from "./chamber-repository.interface";
import { MockChamberRepository } from "./mock-chamber-repository";
import { IFollowUpRepository } from "./follow-up-repository.interface";
import { MockFollowUpRepository } from "./mock-follow-up-repository";
import { DataError } from "../errors";

export class MockSmsReminderRepository implements ISmsReminderRepository {
  private storageKey = "sms_reminders_list";

  private getAllInternal(): SmsReminder[] {
    return MockStorage.get<SmsReminder[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: SmsReminder[]): void {
    MockStorage.set(this.storageKey, items);
  }

  private async enrichMetadata(reminder: SmsReminder): Promise<SmsReminder> {
    try {
      const patientRepo: IPatientRepository = new MockPatientRepository();
      const patient = await patientRepo.getPatientById(reminder.patientId);

      const chamberRepo: IChamberRepository = new MockChamberRepository();
      const chamber = reminder.chamberId ? await chamberRepo.getChamberById(reminder.chamberId) : null;

      const followUpRepo: IFollowUpRepository = new MockFollowUpRepository();
      const followUp = await followUpRepo.getFollowUpById(reminder.followUpId);

      return {
        ...reminder,
        patientName: patient?.name || reminder.patientName,
        patientCode: patient?.patientId || reminder.patientCode,
        chamberName: chamber?.name || reminder.chamberName,
        chamberCode: chamber?.code || reminder.chamberCode,
        followUpDate: followUp?.scheduledDate || reminder.followUpDate,
        followUpTime: followUp?.scheduledTime || reminder.followUpTime,
        followUpReason: followUp?.reason || reminder.followUpReason,
      };
    } catch {
      return reminder;
    }
  }

  public async getReminders(
    params: SmsReminderFilterParams = {}
  ): Promise<{ items: SmsReminder[]; total: number }> {
    let list = this.getAllInternal();

    if (params.status && params.status !== "all") {
      list = list.filter((r) => r.status === params.status);
    }
    if (params.reminderType && params.reminderType !== "all") {
      list = list.filter((r) => r.reminderType === params.reminderType);
    }
    if (params.chamberId && params.chamberId !== "all") {
      list = list.filter((r) => r.chamberId === params.chamberId);
    }
    if (params.patientId) {
      list = list.filter((r) => r.patientId === params.patientId);
    }
    if (params.followUpId) {
      list = list.filter((r) => r.followUpId === params.followUpId);
    }

    // Sort by scheduledFor desc
    list.sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());

    const total = list.length;
    const page = params.page || 1;
    const limit = params.limit || 50;
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    const enriched = await Promise.all(paginated.map((r) => this.enrichMetadata(r)));

    return { items: enriched, total };
  }

  public async getReminderById(id: string): Promise<SmsReminder | null> {
    const list = this.getAllInternal();
    const found = list.find((r) => r.id === id);
    if (!found) return null;
    return await this.enrichMetadata(found);
  }

  public async getReminderByIdempotencyKey(key: string): Promise<SmsReminder | null> {
    const list = this.getAllInternal();
    const found = list.find((r) => r.idempotencyKey === key);
    if (!found) return null;
    return await this.enrichMetadata(found);
  }

  public async createReminder(dto: CreateSmsReminderDTO): Promise<SmsReminder> {
    const list = this.getAllInternal();

    // Check unique idempotencyKey
    const existing = list.find((r) => r.idempotencyKey === dto.idempotencyKey);
    if (existing) {
      return await this.enrichMetadata(existing);
    }

    const now = new Date().toISOString();
    const newRecord: SmsReminder = {
      id: generateInternalUUID(),
      followUpId: dto.followUpId,
      patientId: dto.patientId,
      chamberId: dto.chamberId || null,
      reminderType: dto.reminderType,
      idempotencyKey: dto.idempotencyKey,
      recipientPhone: dto.recipientPhone,
      recipientPhoneMasked: dto.recipientPhoneMasked,
      recipientPhoneHash: dto.recipientPhoneHash,
      messageContent: dto.messageContent,
      scheduledFor: dto.scheduledFor,
      status: dto.status || "pending",
      attemptCount: 0,
      retryCount: 0,
      lastAttemptAt: null,
      sentAt: null,
      providerName: null,
      providerMessageId: null,
      deliveryStatus: null,
      failureReason: dto.failureReason || null,
      metadata: dto.metadata || null,
      createdAt: now,
      updatedAt: now,
    };

    list.push(newRecord);
    this.saveAllInternal(list);
    return await this.enrichMetadata(newRecord);
  }

  public async updateReminder(id: string, dto: UpdateSmsReminderDTO): Promise<SmsReminder> {
    const list = this.getAllInternal();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new DataError(`SMS Reminder with ID "${id}" was not found.`);
    }

    const existing = list[index];
    const now = new Date().toISOString();

    const updated: SmsReminder = {
      ...existing,
      ...dto,
      status: dto.status !== undefined ? dto.status : existing.status,
      attemptCount: dto.attemptCount !== undefined ? dto.attemptCount : existing.attemptCount,
      retryCount: dto.retryCount !== undefined ? dto.retryCount : existing.retryCount,
      lastAttemptAt: dto.lastAttemptAt !== undefined ? dto.lastAttemptAt : existing.lastAttemptAt,
      sentAt: dto.sentAt !== undefined ? dto.sentAt : existing.sentAt,
      providerName: dto.providerName !== undefined ? dto.providerName : existing.providerName,
      providerMessageId: dto.providerMessageId !== undefined ? dto.providerMessageId : existing.providerMessageId,
      failureReason: dto.failureReason !== undefined ? dto.failureReason : existing.failureReason,
      scheduledFor: dto.scheduledFor !== undefined ? dto.scheduledFor : existing.scheduledFor,
      updatedAt: now,
    };

    list[index] = updated;
    this.saveAllInternal(list);
    return await this.enrichMetadata(updated);
  }

  public async getPendingRemindersDue(dueBeforeIso: string, limit: number = 50): Promise<SmsReminder[]> {
    const list = this.getAllInternal();
    const dueTime = new Date(dueBeforeIso).getTime();

    const pending = list.filter(
      (r) =>
        (r.status === "pending" || r.status === "scheduled") &&
        new Date(r.scheduledFor).getTime() <= dueTime
    );

    pending.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
    const sliced = pending.slice(0, limit);
    return await Promise.all(sliced.map((r) => this.enrichMetadata(r)));
  }

  public async cancelPendingRemindersForFollowUp(followUpId: string, reason?: string): Promise<number> {
    const list = this.getAllInternal();
    let count = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < list.length; i++) {
      if (
        list[i].followUpId === followUpId &&
        (list[i].status === "pending" || list[i].status === "scheduled")
      ) {
        list[i] = {
          ...list[i],
          status: "cancelled",
          failureReason: reason || "Follow-up was cancelled or rescheduled",
          updatedAt: now,
        };
        count++;
      }
    }

    if (count > 0) {
      this.saveAllInternal(list);
    }
    return count;
  }

  public async cancelPendingRemindersByFollowUp(
    followUpId: string,
    reason?: string
  ): Promise<number> {
    return this.cancelPendingRemindersForFollowUp(followUpId, reason);
  }

  public async getRemindersForFollowUp(followUpId: string): Promise<SmsReminder[]> {
    const list = this.getAllInternal().filter((r) => r.followUpId === followUpId);
    list.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
    return await Promise.all(list.map((r) => this.enrichMetadata(r)));
  }
}
