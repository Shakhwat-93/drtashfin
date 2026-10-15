import { ISmsGatewaySettingsRepository } from "./sms-gateway-settings-repository.interface";
import {
  SmsGatewayPublicConfig,
  DecryptedSmsGatewayConfig,
  SaveSmsGatewayDTO,
  SmsGatewaySettingsRecord,
} from "@/types/sms-gateway";
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  EncryptedPayload,
} from "@/lib/security/encryption";

export class MockSmsGatewaySettingsRepository
  implements ISmsGatewaySettingsRepository
{
  private record: SmsGatewaySettingsRecord = {
    id: "default",
    provider_name: "bulksmsdhaka",
    api_key_encrypted: null,
    api_key_iv: null,
    api_key_tag: null,
    caller_id: "1234",
    is_enabled: false,
    last_tested_at: null,
    last_test_status: null,
    last_test_error: null,
    last_balance: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  public async getPublicConfig(): Promise<SmsGatewayPublicConfig> {
    const hasApiKey = Boolean(this.record.api_key_encrypted);
    let maskedApiKey: string | null = null;

    if (hasApiKey) {
      try {
        const decrypted = this.getDecryptedApiKey();
        maskedApiKey = maskSecret(decrypted);
      } catch {
        maskedApiKey = "••••••••••••";
      }
    }

    return {
      providerName: this.record.provider_name,
      callerId: this.record.caller_id,
      isEnabled: this.record.is_enabled,
      hasApiKey,
      maskedApiKey,
      lastTestedAt: this.record.last_tested_at,
      lastTestStatus: this.record.last_test_status,
      lastTestError: this.record.last_test_error,
      lastBalance: this.record.last_balance,
      updatedAt: this.record.updated_at,
    };
  }

  public async getDecryptedConfig(): Promise<DecryptedSmsGatewayConfig> {
    const apiKey = this.getDecryptedApiKey();

    return {
      providerName: this.record.provider_name,
      apiKey,
      callerId: this.record.caller_id,
      isEnabled: this.record.is_enabled,
      lastTestedAt: this.record.last_tested_at,
      lastTestStatus: this.record.last_test_status,
      lastBalance: this.record.last_balance,
      updatedAt: this.record.updated_at,
    };
  }

  public async saveConfig(dto: SaveSmsGatewayDTO): Promise<SmsGatewayPublicConfig> {
    const now = new Date().toISOString();

    if (dto.apiKey && dto.apiKey.trim().length > 0) {
      const encrypted = encryptSecret(dto.apiKey.trim());
      this.record.api_key_encrypted = encrypted.ciphertext;
      this.record.api_key_iv = encrypted.iv;
      this.record.api_key_tag = encrypted.tag;
    }

    this.record.caller_id = dto.callerId || "1234";
    this.record.is_enabled = Boolean(dto.isEnabled);
    this.record.updated_at = now;

    return this.getPublicConfig();
  }

  public async recordTestResult(result: {
    status: string;
    balance?: string;
    error?: string;
  }): Promise<void> {
    this.record.last_tested_at = new Date().toISOString();
    this.record.last_test_status = result.status;
    this.record.last_test_error = result.error || null;
    if (result.balance) {
      this.record.last_balance = result.balance;
    }
    this.record.updated_at = new Date().toISOString();
  }

  public invalidateCache(): void {
    // No-op for in-memory mock
  }

  private getDecryptedApiKey(): string | null {
    if (
      !this.record.api_key_encrypted ||
      !this.record.api_key_iv ||
      !this.record.api_key_tag
    ) {
      return null;
    }

    const payload: EncryptedPayload = {
      ciphertext: this.record.api_key_encrypted,
      iv: this.record.api_key_iv,
      tag: this.record.api_key_tag,
    };

    return decryptSecret(payload);
  }

  public reset(): void {
    this.record = {
      id: "default",
      provider_name: "bulksmsdhaka",
      api_key_encrypted: null,
      api_key_iv: null,
      api_key_tag: null,
      caller_id: "1234",
      is_enabled: false,
      last_tested_at: null,
      last_test_status: null,
      last_test_error: null,
      last_balance: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
}
