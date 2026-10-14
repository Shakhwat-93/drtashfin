export type SmsConsentStatus = "unknown" | "opted_in" | "opted_out";

export type SmsConsentSource =
  | "registration"
  | "in_person"
  | "profile_update"
  | "opt_out_request"
  | "system_default";

export type SmsReminderType = "24h_before" | "3h_before";

export type SmsReminderStatus =
  | "pending"
  | "scheduled"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped"
  | "cancelled";

export type SmsProviderName =
  | "mock"
  | "generic_http"
  | "greenweb"
  | "ssl_wireless"
  | "bulksmsbd";

export interface SmsReminder {
  id: string;
  followUpId: string;
  patientId: string;
  chamberId?: string | null;
  reminderType: SmsReminderType;
  idempotencyKey: string;
  recipientPhone?: string;
  recipientPhoneMasked: string;
  recipientPhoneHash: string;
  messageContent?: string;
  scheduledFor: string; // ISO string
  status: SmsReminderStatus;
  attemptCount: number;
  retryCount?: number;
  deliveryStatus?: string | null;
  lastAttemptAt?: string | null;
  sentAt?: string | null;
  providerName?: string | null;
  providerMessageId?: string | null;
  failureReason?: string | null;
  providerResponse?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Joined metadata for UI display
  patientName?: string;
  patientCode?: string;
  chamberName?: string;
  chamberCode?: string;
  followUpDate?: string;
  followUpTime?: string;
  followUpReason?: string;
}

export interface CreateSmsReminderDTO {
  followUpId: string;
  patientId: string;
  chamberId?: string | null;
  reminderType: SmsReminderType;
  idempotencyKey: string;
  recipientPhone?: string;
  recipientPhoneMasked: string;
  recipientPhoneHash: string;
  messageContent?: string;
  scheduledFor: string;
  status?: SmsReminderStatus;
  failureReason?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateSmsReminderDTO {
  status?: SmsReminderStatus;
  attemptCount?: number;
  retryCount?: number;
  deliveryStatus?: string | null;
  lastAttemptAt?: string | null;
  sentAt?: string | null;
  providerName?: string | null;
  providerMessageId?: string | null;
  failureReason?: string | null;
  providerResponse?: Record<string, unknown> | null;
  scheduledFor?: string;
}

export interface SmsReminderFilterParams {
  status?: SmsReminderStatus | "all";
  reminderType?: SmsReminderType | "all";
  chamberId?: string | null;
  patientId?: string;
  followUpId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SendSmsParams {
  recipientPhone: string;
  message: string;
  idempotencyKey: string;
  reminderType: SmsReminderType;
  patientName?: string;
  metadata?: Record<string, unknown>;
}

export interface SendSmsResult {
  success: boolean;
  providerMessageId?: string;
  deliveryStatus: "submitted" | "delivered" | "failed" | "rejected";
  error?: string;
  isRetryable: boolean;
  rawResponse?: Record<string, unknown>;
}

export interface SmsProviderConfigStatus {
  isLiveEnabled: boolean;
  providerName: string;
  hasCredentials: boolean;
  missingConfigKeys: string[];
  rateLimitPerMinute: number;
  dailyLimit: number;
  senderIdConfigured: boolean;
}
