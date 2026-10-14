import { ISmsProvider } from "./sms-provider.interface";
import { SendSmsParams, SendSmsResult, SmsProviderConfigStatus } from "@/types/sms";
import { normalizeBdPhoneNumber } from "../phone-utils";

export interface MockSentMessage {
  id: string;
  recipientPhone: string;
  message: string;
  idempotencyKey: string;
  sentAt: string;
}

export class MockSmsProvider implements ISmsProvider {
  public readonly name = "mock";
  private sentMessages: MockSentMessage[] = [];
  private simulatedFailureMode: "none" | "transient_timeout" | "transient_503" | "permanent_invalid_number" | "permanent_rejected" = "none";

  public setSimulatedFailureMode(mode: "none" | "transient_timeout" | "transient_503" | "permanent_invalid_number" | "permanent_rejected"): void {
    this.simulatedFailureMode = mode;
  }

  public setSimulatedFailure(type: "transient" | "permanent", _message?: string): void {
    if (type === "transient") {
      this.simulatedFailureMode = "transient_timeout";
    } else {
      this.simulatedFailureMode = "permanent_rejected";
    }
  }

  public getSentMessages(): MockSentMessage[] {
    return [...this.sentMessages];
  }

  public clearSentMessages(): void {
    this.sentMessages = [];
    this.simulatedFailureMode = "none";
  }

  public isConfigured(): boolean {
    return true;
  }

  public getConfigStatus(): SmsProviderConfigStatus {
    return {
      isLiveEnabled: false,
      providerName: this.name,
      hasCredentials: true,
      missingConfigKeys: [],
      rateLimitPerMinute: 60,
      dailyLimit: 1000,
      senderIdConfigured: true,
    };
  }

  public async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    // 1. Validate recipient phone number format
    const phoneValidation = normalizeBdPhoneNumber(params.recipientPhone);
    if (!phoneValidation.isValid) {
      return {
        success: false,
        deliveryStatus: "rejected",
        error: phoneValidation.error || "Invalid recipient phone number",
        isRetryable: false,
      };
    }

    // 2. Handle simulated failures for testing
    if (this.simulatedFailureMode === "transient_timeout") {
      return {
        success: false,
        deliveryStatus: "failed",
        error: "Gateway request timed out after 10000ms",
        isRetryable: true,
      };
    }

    if (this.simulatedFailureMode === "transient_503") {
      return {
        success: false,
        deliveryStatus: "failed",
        error: "SMS Gateway service temporarily unavailable (HTTP 503)",
        isRetryable: true,
      };
    }

    if (this.simulatedFailureMode === "permanent_invalid_number") {
      return {
        success: false,
        deliveryStatus: "rejected",
        error: "Recipient number rejected by carrier as non-existent",
        isRetryable: false,
      };
    }

    if (this.simulatedFailureMode === "permanent_rejected") {
      return {
        success: false,
        deliveryStatus: "rejected",
        error: "Account credit exhausted or template unapproved",
        isRetryable: false,
      };
    }

    // 3. Successful simulated transmission
    const providerMessageId = `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.sentMessages.push({
      id: providerMessageId,
      recipientPhone: phoneValidation.normalized!,
      message: params.message,
      idempotencyKey: params.idempotencyKey,
      sentAt: new Date().toISOString(),
    });

    return {
      success: true,
      providerMessageId,
      deliveryStatus: "submitted",
      isRetryable: false,
      rawResponse: {
        status: "OK",
        id: providerMessageId,
        operator: phoneValidation.operator,
      },
    };
  }
}
