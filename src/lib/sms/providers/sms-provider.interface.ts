import { SendSmsParams, SendSmsResult, SmsProviderConfigStatus } from "@/types/sms";
import { ValidateGatewayResult, DeliveryStatusResult } from "@/types/sms-gateway";

export interface ISmsProvider {
  /**
   * Unique identifier of the provider adapter (e.g. "mock", "generic_http", "bulksmsdhaka")
   */
  readonly name: string;

  /**
   * Sends an SMS through the provider.
   * Handles timeouts, network retries, response parsing, and error sanitization.
   */
  sendSms(params: SendSmsParams): Promise<SendSmsResult>;

  /**
   * Checks whether the provider has required credentials configured.
   */
  isConfigured(): boolean;

  /**
   * Returns current configuration readiness status without leaking credentials.
   */
  getConfigStatus(): SmsProviderConfigStatus;

  /**
   * Non-billable verification of provider credentials (e.g. balance check).
   */
  checkBalance?(): Promise<ValidateGatewayResult>;

  /**
   * Queries delivery status of a previously dispatched SMS using provider message ID.
   */
  getDeliveryStatus?(messageId: string): Promise<DeliveryStatusResult>;
}
