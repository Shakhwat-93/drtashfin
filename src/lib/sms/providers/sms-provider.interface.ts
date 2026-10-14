import { SendSmsParams, SendSmsResult, SmsProviderConfigStatus } from "@/types/sms";

export interface ISmsProvider {
  /**
   * Unique identifier of the provider adapter (e.g. "mock", "generic_http", "greenweb")
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
}
