/**
 * Bulk SMS Dhaka Provider Adapter
 * Phase 25.1 — Bulk SMS Dhaka Gateway Integration & Dynamic Settings
 * Official Documentation: https://bulksmsdhaka.net
 *
 * Supported endpoints:
 * - Send SMS: https://bulksmsdhaka.net/api/sendtext (POST application/x-www-form-urlencoded)
 * - Delivery Status: https://bulksmsdhaka.net/api/getstatus (GET/POST)
 * - Credit Balance: https://bulksmsdhaka.net/api/getBalance (GET/POST, non-billable validation)
 */

import { ISmsProvider } from "./sms-provider.interface";
import { SendSmsParams, SendSmsResult, SmsProviderConfigStatus } from "@/types/sms";
import { ValidateGatewayResult, DeliveryStatusResult } from "@/types/sms-gateway";
import { normalizeBdPhoneNumber } from "../phone-utils";
import { getSmsGatewaySettingsRepository } from "@/lib/data";

export interface BulkSmsDhakaOptions {
  apiKey?: string;
  callerId?: string;
  isEnabled?: boolean;
  timeoutMs?: number;
  credentialsResolver?: () => Promise<{
    apiKey?: string | null;
    callerId: string;
    isEnabled: boolean;
  }>;
}

export class BulkSmsDhakaProvider implements ISmsProvider {
  public readonly name = "bulksmsdhaka";
  private static readonly SEND_ENDPOINT = "https://bulksmsdhaka.net/api/sendtext";
  private static readonly STATUS_ENDPOINT = "https://bulksmsdhaka.net/api/getstatus";
  private static readonly BALANCE_ENDPOINT = "https://bulksmsdhaka.net/api/getBalance";

  private options?: BulkSmsDhakaOptions;
  private timeoutMs: number;

  constructor(options?: BulkSmsDhakaOptions) {
    this.options = options;
    this.timeoutMs = options?.timeoutMs || 10000;
  }

  /**
   * Dynamically resolves credentials at dispatch time.
   * Priority:
   * 1. Explicit credentialsResolver function
   * 2. Static constructor options (used in unit tests)
   * 3. Database settings via getSmsGatewaySettingsRepository()
   * 4. Environment variable fallback
   */
  public async getEffectiveCredentials(): Promise<{
    apiKey: string | null;
    callerId: string;
    isEnabled: boolean;
  }> {
    if (this.options?.credentialsResolver) {
      const res = await this.options.credentialsResolver();
      return {
        apiKey: res.apiKey || null,
        callerId: res.callerId || "1234",
        isEnabled: Boolean(res.isEnabled),
      };
    }

    if (this.options?.apiKey !== undefined) {
      return {
        apiKey: this.options.apiKey || null,
        callerId: this.options.callerId || "1234",
        isEnabled: Boolean(this.options.isEnabled),
      };
    }

    try {
      const repo = getSmsGatewaySettingsRepository();
      const config = await repo.getDecryptedConfig();
      if (config.apiKey) {
        return {
          apiKey: config.apiKey,
          callerId: config.callerId || "1234",
          isEnabled: Boolean(config.isEnabled),
        };
      }
    } catch {
      // In offline / test environments without DB connection, fall through to env
    }

    // Fallback to environment variables
    const envKey = process.env.BULK_SMS_DHAKA_API_KEY || process.env.SMS_API_KEY || null;
    const envCallerId = process.env.BULK_SMS_DHAKA_CALLER_ID || process.env.SMS_SENDER_ID || "1234";
    const envEnabled = process.env.SMS_ENABLED === "true";

    return {
      apiKey: envKey,
      callerId: envCallerId,
      isEnabled: envEnabled,
    };
  }

  public isConfigured(): boolean {
    if (this.options?.apiKey) {
      return true;
    }
    const envKey = process.env.BULK_SMS_DHAKA_API_KEY || process.env.SMS_API_KEY;
    return Boolean(envKey && envKey.trim().length > 0);
  }

  public getConfigStatus(): SmsProviderConfigStatus {
    const isLive = process.env.SMS_ENABLED === "true";
    const envKey = process.env.BULK_SMS_DHAKA_API_KEY || process.env.SMS_API_KEY;
    const missing: string[] = [];
    if (!envKey) missing.push("SMS_API_KEY");

    return {
      isLiveEnabled: isLive && missing.length === 0,
      providerName: this.name,
      hasCredentials: Boolean(envKey),
      missingConfigKeys: missing,
      rateLimitPerMinute: 60,
      dailyLimit: 2000,
      senderIdConfigured: true,
    };
  }

  /**
   * Dispatches an SMS via Bulk SMS Dhaka API.
   * Uses HTTP POST with application/x-www-form-urlencoded body to avoid leaking
   * the API key in URL strings, server proxy logs, and network logs.
   */
  public async sendSms(params: SendSmsParams): Promise<SendSmsResult> {
    // 1. Resolve dynamic credentials
    const creds = await this.getEffectiveCredentials();

    if (!creds.isEnabled) {
      return {
        success: false,
        deliveryStatus: "failed",
        error: "Live SMS dispatch is disabled in SMS Gateway Settings. Enable live sending after testing.",
        isRetryable: false,
      };
    }

    if (!creds.apiKey || creds.apiKey.trim().length === 0) {
      return {
        success: false,
        deliveryStatus: "failed",
        error: "Bulk SMS Dhaka API Key is not configured. Please enter and save your API key in Settings.",
        isRetryable: false,
      };
    }

    // 2. Validate and format recipient phone number for Bangladesh
    const phoneNorm = normalizeBdPhoneNumber(params.recipientPhone);
    if (!phoneNorm.isValid || !phoneNorm.normalized) {
      return {
        success: false,
        deliveryStatus: "rejected",
        error: phoneNorm.error || "Invalid Bangladesh recipient mobile number",
        isRetryable: false,
      };
    }

    // Standardize to national or 880 format (e.g. 8801700000000 without leading +)
    const formattedPhone = phoneNorm.normalized.replace(/^\+/, "");

    // 3. Prepare payload: application/x-www-form-urlencoded
    // URLSearchParams automatically handles UTF-8 URL encoding for Bengali text and special chars
    const formBody = new URLSearchParams();
    formBody.append("apikey", creds.apiKey);
    formBody.append("callerID", creds.callerId || "1234");
    formBody.append("number", formattedPhone);
    formBody.append("message", params.message);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(BulkSmsDhakaProvider.SEND_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: formBody.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const status = response.status;
      let body: Record<string, unknown> = {};

      try {
        body = await response.json();
      } catch {
        const text = await response.text().catch(() => "");
        body = { rawText: text, statusText: response.statusText };
      }

      // Check HTTP level failure
      if (!response.ok) {
        const isRetryable = status === 429 || status >= 500;
        const errMessage = this.sanitizeError(
          String(body.Message || body.error || `HTTP ${status}: ${response.statusText}`),
          creds.apiKey
        );
        return {
          success: false,
          deliveryStatus: status >= 400 && status < 500 ? "rejected" : "failed",
          error: errMessage,
          isRetryable,
          rawResponse: { httpStatus: status },
        };
      }

      // Parse Bulk SMS Dhaka response format
      // Expected success format: { "Status": "1000", "Success": "true", "Message": "Your sms request successful!!" }
      const statusCodeStr = String(body.Status ?? "");
      const isSuccess =
        statusCodeStr === "1000" ||
        String(body.Success ?? "").toLowerCase() === "true";

      if (isSuccess) {
        // Look for provider message ID if returned
        const providerMessageId =
          (body.message_id as string) ||
          (body.messageid as string) ||
          (body.Message_ID as string) ||
          (body.msg_id as string) ||
          undefined;

        return {
          success: true,
          providerMessageId,
          deliveryStatus: "submitted",
          isRetryable: false,
          rawResponse: {
            status: statusCodeStr,
            message: body.Message,
            messageId: providerMessageId,
          },
        };
      }

      // Handle provider-specific business status codes
      const parsedError = this.parseStatusCodeError(statusCodeStr, body, creds.callerId);
      return {
        success: false,
        deliveryStatus: parsedError.isRetryable ? "failed" : "rejected",
        error: this.sanitizeError(parsedError.message, creds.apiKey),
        isRetryable: parsedError.isRetryable,
        rawResponse: {
          status: statusCodeStr,
          message: body.Message,
        },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return {
          success: false,
          deliveryStatus: "failed",
          error: `Bulk SMS Dhaka gateway timed out after ${this.timeoutMs}ms`,
          isRetryable: true,
        };
      }

      const rawMsg = err instanceof Error ? err.message : "Network error contacting SMS gateway";
      return {
        success: false,
        deliveryStatus: "failed",
        error: this.sanitizeError(rawMsg, creds.apiKey),
        isRetryable: true,
      };
    }
  }

  /**
   * Non-billable verification of provider credentials and credit balance.
   * Endpoint: https://bulksmsdhaka.net/api/getBalance
   */
  public async checkBalance(): Promise<ValidateGatewayResult> {
    const creds = await this.getEffectiveCredentials();

    if (!creds.apiKey || creds.apiKey.trim().length === 0) {
      return {
        success: false,
        status: "Missing API Key",
        message: "No API key configured. Please enter and save your API key.",
        error: "Missing API Key",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${BulkSmsDhakaProvider.BALANCE_ENDPOINT}?apikey=${encodeURIComponent(
        creds.apiKey
      )}`;

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let body: Record<string, unknown> = {};
      try {
        body = await response.json();
      } catch {
        const text = await response.text().catch(() => "");
        body = { rawText: text };
      }

      const statusCodeStr = String(body.Status ?? "");
      const isSuccess =
        statusCodeStr === "100" ||
        String(body.Success ?? "").toLowerCase() === "true" ||
        body.Balance !== undefined;

      if (isSuccess && body.Balance !== undefined) {
        const balanceVal = String(body.Balance);
        return {
          success: true,
          balance: balanceVal,
          status: "Provider connection verified.",
          message: `Connected successfully to Bulk SMS Dhaka. Remaining balance: ${balanceVal} BDT.`,
        };
      }

      if (statusCodeStr === "1008") {
        return {
          success: false,
          status: "IP Not Whitelisted",
          message:
            "Server IP is not whitelisted in Bulk SMS Dhaka. Please add your server public IP (72.60.108.65) to Account -> API Settings -> IP Whitelist in your Bulk SMS Dhaka portal.",
          error: "IP Not Whitelisted (1008)",
        };
      }

      if (statusCodeStr === "1015" || statusCodeStr === "1018") {
        return {
          success: false,
          status: "Authorization Failed",
          message: "Authorization failed. Please verify that your API key is correct.",
          error: "Invalid API Key (1015)",
        };
      }

      const rawMsg = String(body.Message || "Failed to retrieve balance from SMS gateway");
      return {
        success: false,
        status: "Connection Failed",
        message: this.sanitizeError(rawMsg, creds.apiKey),
        error: rawMsg,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const rawMsg = err instanceof Error ? err.message : "Error contacting balance endpoint";
      return {
        success: false,
        status: "Network Error",
        message: `Failed to connect to Bulk SMS Dhaka: ${this.sanitizeError(rawMsg, creds.apiKey)}`,
        error: rawMsg,
      };
    }
  }

  /**
   * Queries delivery status of a single message via getstatus API.
   * Endpoint: https://bulksmsdhaka.net/api/getstatus
   */
  public async getDeliveryStatus(messageId: string): Promise<DeliveryStatusResult> {
    if (!messageId || messageId.startsWith("mock_") || messageId.startsWith("sms_")) {
      return {
        success: false,
        deliveryStatus: "submitted",
        message: "No provider message ID available for delivery check.",
      };
    }

    const creds = await this.getEffectiveCredentials();
    if (!creds.apiKey) {
      return {
        success: false,
        deliveryStatus: "unknown",
        error: "Missing API key for status lookup",
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = `${BulkSmsDhakaProvider.STATUS_ENDPOINT}?apikey=${encodeURIComponent(
        creds.apiKey
      )}&messageid=${encodeURIComponent(messageId)}`;

      const response = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const body = (await response.json()) as Record<string, unknown>;
      const statusMsg = String(body.Message ?? "").toUpperCase();

      if (statusMsg === "DELIVRD") {
        return {
          success: true,
          deliveryStatus: "delivered",
          rawStatus: String(body.Status),
          message: "DELIVRD",
        };
      }

      if (statusMsg === "UNDELIV" || statusMsg.includes("FAIL") || statusMsg.includes("REJECT")) {
        return {
          success: false,
          deliveryStatus: "failed",
          rawStatus: String(body.Status),
          message: statusMsg,
        };
      }

      return {
        success: true,
        deliveryStatus: "submitted",
        rawStatus: String(body.Status),
        message: statusMsg || "PENDING",
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const rawMsg = err instanceof Error ? err.message : "Status lookup failed";
      return {
        success: false,
        deliveryStatus: "unknown",
        error: this.sanitizeError(rawMsg, creds.apiKey),
      };
    }
  }

  /**
   * Maps Bulk SMS Dhaka numeric status codes to human-actionable error messages.
   */
  private parseStatusCodeError(
    code: string,
    body: Record<string, unknown>,
    callerId: string
  ): { message: string; isRetryable: boolean } {
    switch (code) {
      case "1005":
        return {
          message: "SPAM Detected: Message content triggered the gateway filter.",
          isRetryable: false,
        };
      case "1006":
        return {
          message: "SMS Content Validation Failed: Check formatting and message length constraints.",
          isRetryable: false,
        };
      case "1008":
        return {
          message:
            "IP Not Whitelisted: Server outgoing IP (72.60.108.65) must be added under Account -> API Settings -> IP Whitelist in your Bulk SMS Dhaka portal.",
          isRetryable: false,
        };
      case "1011":
        return {
          message: `Sender ID Not Found: Caller ID '${callerId}' is not approved or mapped to this account.`,
          isRetryable: false,
        };
      case "1012":
        return {
          message: "Masking SMS Language Error: Verify message encoding and sender ID compliance.",
          isRetryable: false,
        };
      case "1013":
        return {
          message: "Account Balance Validity Expired: Please renew credit validity on Bulk SMS Dhaka.",
          isRetryable: false,
        };
      case "1014":
        return {
          message: "Internal Gateway Error: Transient server issue at Bulk SMS Dhaka.",
          isRetryable: true,
        };
      case "1015":
        return {
          message: "Authorization Failed: Invalid API key or caller ID credentials.",
          isRetryable: false,
        };
      case "1018":
        return {
          message: "API Key Not Received: The gateway rejected empty credentials.",
          isRetryable: false,
        };
      case "2001":
        return {
          message: "Insufficient Balance: Account balance is too low to dispatch SMS.",
          isRetryable: false,
        };
      default:
        return {
          message: String(body.Message || `Gateway error code ${code || "unknown"}`),
          isRetryable: false,
        };
    }
  }

  /**
   * Sanitizes error messages to prevent leaking secret API keys in logs or UI.
   */
  private sanitizeError(msg: string, apiKey?: string | null): string {
    if (!apiKey) return msg;
    return msg.split(apiKey).join("[REDACTED_API_KEY]");
  }
}
