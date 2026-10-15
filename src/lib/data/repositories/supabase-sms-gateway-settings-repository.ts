import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
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

export class SupabaseSmsGatewaySettingsRepository
  implements ISmsGatewaySettingsRepository
{
  private client: SupabaseClient;
  private cachedConfig: DecryptedSmsGatewayConfig | null = null;
  private cacheExpiresAt: number = 0;
  private readonly CACHE_TTL_MS = 15000; // 15 seconds

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  public invalidateCache(): void {
    this.cachedConfig = null;
    this.cacheExpiresAt = 0;
  }

  public async getPublicConfig(): Promise<SmsGatewayPublicConfig> {
    const raw = await this.getRawRecord();
    const hasApiKey = Boolean(raw.api_key_encrypted);
    let maskedApiKey: string | null = null;

    if (hasApiKey) {
      try {
        const decrypted = this.decryptKeyFromRecord(raw);
        maskedApiKey = maskSecret(decrypted);
      } catch {
        maskedApiKey = "••••••••••••";
      }
    }

    return {
      providerName: raw.provider_name,
      callerId: raw.caller_id,
      isEnabled: raw.is_enabled,
      hasApiKey,
      maskedApiKey,
      lastTestedAt: raw.last_tested_at,
      lastTestStatus: raw.last_test_status,
      lastTestError: raw.last_test_error,
      lastBalance: raw.last_balance,
      updatedAt: raw.updated_at,
    };
  }

  public async getDecryptedConfig(): Promise<DecryptedSmsGatewayConfig> {
    const now = Date.now();
    if (this.cachedConfig && now < this.cacheExpiresAt) {
      return this.cachedConfig;
    }

    const raw = await this.getRawRecord();
    const apiKey = this.decryptKeyFromRecord(raw);

    const config: DecryptedSmsGatewayConfig = {
      providerName: raw.provider_name,
      apiKey,
      callerId: raw.caller_id,
      isEnabled: raw.is_enabled,
      lastTestedAt: raw.last_tested_at,
      lastTestStatus: raw.last_test_status,
      lastBalance: raw.last_balance,
      updatedAt: raw.updated_at,
    };

    this.cachedConfig = config;
    this.cacheExpiresAt = now + this.CACHE_TTL_MS;

    return config;
  }

  public async saveConfig(dto: SaveSmsGatewayDTO): Promise<SmsGatewayPublicConfig> {
    const updatePayload: Record<string, unknown> = {
      caller_id: dto.callerId || "1234",
      is_enabled: Boolean(dto.isEnabled),
      updated_at: new Date().toISOString(),
    };

    if (dto.apiKey && dto.apiKey.trim().length > 0) {
      const encrypted = encryptSecret(dto.apiKey.trim());
      updatePayload.api_key_encrypted = encrypted.ciphertext;
      updatePayload.api_key_iv = encrypted.iv;
      updatePayload.api_key_tag = encrypted.tag;
    }

    const { error } = await this.client
      .from("sms_gateway_settings")
      .update(updatePayload)
      .eq("id", "default");

    if (error) {
      throw new Error(`Failed to save SMS gateway settings: ${error.message}`);
    }

    this.invalidateCache();
    return this.getPublicConfig();
  }

  public async recordTestResult(result: {
    status: string;
    balance?: string;
    error?: string;
  }): Promise<void> {
    const payload: Record<string, unknown> = {
      last_tested_at: new Date().toISOString(),
      last_test_status: result.status,
      last_test_error: result.error || null,
      updated_at: new Date().toISOString(),
    };

    if (result.balance) {
      payload.last_balance = result.balance;
    }

    await this.client
      .from("sms_gateway_settings")
      .update(payload)
      .eq("id", "default");

    this.invalidateCache();
  }

  private async getRawRecord(): Promise<SmsGatewaySettingsRecord> {
    const { data, error } = await this.client
      .from("sms_gateway_settings")
      .select("*")
      .eq("id", "default")
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load SMS gateway settings: ${error.message}`);
    }

    if (!data) {
      // Auto-insert default record if table is empty
      const defaultRecord = {
        id: "default",
        provider_name: "bulksmsdhaka",
        caller_id: "1234",
        is_enabled: false,
      };

      const { data: inserted, error: insertError } = await this.client
        .from("sms_gateway_settings")
        .insert(defaultRecord)
        .select("*")
        .single();

      if (insertError) {
        throw new Error(
          `Failed to initialize SMS gateway settings: ${insertError.message}`
        );
      }
      return inserted as SmsGatewaySettingsRecord;
    }

    return data as SmsGatewaySettingsRecord;
  }

  private decryptKeyFromRecord(record: SmsGatewaySettingsRecord): string | null {
    if (
      !record.api_key_encrypted ||
      !record.api_key_iv ||
      !record.api_key_tag
    ) {
      return null;
    }

    const payload: EncryptedPayload = {
      ciphertext: record.api_key_encrypted,
      iv: record.api_key_iv,
      tag: record.api_key_tag,
    };

    try {
      return decryptSecret(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Decryption failed";
      console.error("[SmsGatewaySettingsRepository] Decryption error:", msg);
      return null;
    }
  }
}
