import {
  SmsReminder,
  CreateSmsReminderDTO,
  UpdateSmsReminderDTO,
  SmsReminderFilterParams,
} from "@/types/sms";

export interface ISmsReminderRepository {
  getReminders(params?: SmsReminderFilterParams): Promise<{ items: SmsReminder[]; total: number }>;
  getReminderById(id: string): Promise<SmsReminder | null>;
  getReminderByIdempotencyKey(key: string): Promise<SmsReminder | null>;
  createReminder(dto: CreateSmsReminderDTO): Promise<SmsReminder>;
  updateReminder(id: string, dto: UpdateSmsReminderDTO): Promise<SmsReminder>;
  getPendingRemindersDue(dueBeforeIso: string, limit?: number): Promise<SmsReminder[]>;
  cancelPendingRemindersForFollowUp(followUpId: string, reason?: string): Promise<number>;
  getRemindersForFollowUp(followUpId: string): Promise<SmsReminder[]>;
}
