import { ISmsProvider } from "./sms-provider.interface";
import { SendSmsParams, SendSmsResult, SmsProviderConfigStatus } from "@/types/sms";
import { normalizeBdPhoneNumber } from "../phone-utils";

export interface GenericHttpProviderOptions {
  apiUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  senderId?: string;
  timeoutMs?: number;
}

export class GenericHttpSmsProvider implements ISmsProvider {
  public readonly name = "generic_http";
  private apiUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private senderId: string;
  private timeoutMs: number;

  constructor(options?: GenericHttpProviderOptions) {
    this.apiUrl = options?.apiUrl || process.env.SMS_API_URL || "";
    this.apiKey = options?.apiKey || process.env.SMS_API_KEY || "";
    this.apiSecret = options?.apiSecret || process.env.SMS_API_SECRET || "";
    this.senderId = options?.senderId || process.env.SMS_SENDER_ID || "DrTashfin";
    this.timeoutMs = options?.timeoutMs || 10000;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  public getConfigStatus(): SmsProviderConfigStatus {
    const isLive = process.env.SMS_ENABLED === "true";
    const missing: string[] = [];
    if (!this.apiUrl) missing.push("SMS_API_URL");
    if (!this.apiKey) missing.push("SMS_API_KEY");
    if (!this.senderId) missing.push("SMS_SENDER_ID");

    return {
      isLiveEnabled: isLive && missing.length === 0,
      providerName: this.name,
      hasCredentials: missing.length === 0,
      missingConfigKeys: missing,
      rateLimitPerMinute: 60,
      dailyLimit: 1000,
      senderIdConfigured: Boolean(this.senderId),
    };
  }

  public async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    // 1. Validate recipient phone number format
    const phoneValidation = normalizeBdPhoneNumber(params.recipientPhone);
    if (!phoneValidation.isValid || !phoneValidation.normalized) {
      return {
        success: false,
        deliveryStatus: "rejected",
        error: phoneValidation.error || "Invalid recipient phone number",
        isRetryable: false,
      };
    }

    // 2. Validate configuration
    if (!this.isConfigured()) {
      return {
        success: false,
        deliveryStatus: "failed",
        error: "SMS Provider is not configured. Missing SMS_API_URL or SMS_API_KEY.",
        isRetryable: false,
      };
    }

    // 3. Prepare payload (Generic standardized REST payload)
    const payload = {
      api_key: this.apiKey,
      sender_id: this.senderId,
      recipient: phoneValidation.normalized,
      message: params.message,
      client_reference: params.idempotencyKey,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(this.apiSecret ? { Authorization: `Bearer ${this.apiSecret}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const status = response.status;
      let responseBody: Record<string, unknown> = {};
      try {
        responseBody = await response.json();
      } catch {
        // Non-JSON response
        responseBody = { statusText: response.statusText };
      }

      if (response.ok) {
        const providerMessageId =
          (responseBody.message_id as string) ||
          (responseBody.id as string) ||
          (responseBody.msg_id as string) ||
          `http_${Date.now()}`;

        return {
          success: true,
          providerMessageId,
          deliveryStatus: "submitted",
          isRetryable: false,
          rawResponse: { status, messageId: providerMessageId },
        };
      }

      // Handle HTTP error responses
      const isRetryable = status === 429 || status >= 500;
      const errorMsg =
        (responseBody.message as string) ||
        (responseBody.error as string) ||
        `Gateway error HTTP ${status}`;

      return {
        success: false,
        deliveryStatus: status >= 400 && status < 500 ? "rejected" : "failed",
        error: this.sanitizeErrorMessage(errorMsg),
        isRetryable,
        rawResponse: { status },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          deliveryStatus: "failed",
          error: `SMS Gateway request timed out after ${this.timeoutMs}ms`,
          isRetryable: true,
        };
      }

      const rawMsg = err instanceof Error ? err.message : "Unknown network error";
      return {
        success: false,
        deliveryStatus: "failed",
        error: this.sanitizeErrorMessage(rawMsg),
        isRetryable: true,
      };
    }
  }

  /**
   * Sanitizes any potential secret keys or URLs from the error message.
   */
  private sanitizeErrorMessage(msg: string): string {
    let sanitized = msg;
    if (this.apiKey) {
      sanitized = sanitized.split(this.apiKey).join("[REDACTED_API_KEY]");
    }
    if (this.apiSecret) {
      sanitized = sanitized.split(this.apiSecret).join("[REDACTED_SECRET]");
    }
    return sanitized;
  }
}
