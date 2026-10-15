/**
 * Types for SMS Gateway configuration and Bulk SMS Dhaka provider integration.
 * Phase 25.1 — Bulk SMS Dhaka Gateway Integration & Dynamic Settings
 */

export type SmsGatewayProviderType = "bulksmsdhaka";

/**
 * Public, safe configuration metadata sent to the doctor-facing client.
 * Never includes raw API keys or decryption tokens.
 */
export interface SmsGatewayPublicConfig {
  providerName: SmsGatewayProviderType;
  callerId: string;
  isEnabled: boolean;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestError: string | null;
  lastBalance: string | null;
  updatedAt: string;
}

/**
 * Internal database record representation in public.sms_gateway_settings.
 */
export interface SmsGatewaySettingsRecord {
  id: string;
  provider_name: SmsGatewayProviderType;
  api_key_encrypted: string | null;
  api_key_iv: string | null;
  api_key_tag: string | null;
  caller_id: string;
  is_enabled: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  last_balance: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Decrypted runtime configuration used by the server-side provider.
 */
export interface DecryptedSmsGatewayConfig {
  providerName: SmsGatewayProviderType;
  apiKey: string | null;
  callerId: string;
  isEnabled: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastBalance: string | null;
  updatedAt: string;
}

/**
 * Payload sent by doctor to update SMS gateway settings.
 */
export interface SaveSmsGatewayDTO {
  apiKey?: string; // If omitted, existing encrypted key is preserved
  callerId: string;
  isEnabled: boolean;
}

/**
 * Payload sent by doctor to dispatch an explicit test SMS.
 */
export interface SendTestSmsDTO {
  recipientPhone: string;
  confirmation: boolean;
}

/**
 * Result of validating provider credentials via non-billable balance check.
 */
export interface ValidateGatewayResult {
  success: boolean;
  balance?: string;
  status: string;
  message: string;
  error?: string;
}

/**
 * Result of sending a test SMS.
 */
export interface SendTestSmsResult {
  success: boolean;
  deliveryStatus: "submitted" | "delivered" | "failed" | "rejected";
  providerMessageId?: string;
  recipientPhoneMasked: string;
  message: string;
  error?: string;
}

/**
 * Result of querying delivery status via getstatus.
 */
export interface DeliveryStatusResult {
  success: boolean;
  deliveryStatus: "submitted" | "delivered" | "failed" | "unknown";
  rawStatus?: string;
  message?: string;
  error?: string;
}
