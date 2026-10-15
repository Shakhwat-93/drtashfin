import {
  SmsGatewayPublicConfig,
  DecryptedSmsGatewayConfig,
  SaveSmsGatewayDTO,
} from "@/types/sms-gateway";

export interface ISmsGatewaySettingsRepository {
  /**
   * Retrieves safe public configuration metadata for UI display.
   * Never leaks raw API keys or decryption material.
   */
  getPublicConfig(): Promise<SmsGatewayPublicConfig>;

  /**
   * Retrieves decrypted runtime configuration for server-side dispatching.
   * decrypts encrypted API key using AES-256-GCM.
   */
  getDecryptedConfig(): Promise<DecryptedSmsGatewayConfig>;

  /**
   * Saves updated SMS gateway settings.
   * If a new apiKey is provided, it is encrypted at rest using AES-256-GCM.
   * If apiKey is omitted or empty, the existing encrypted credentials are preserved.
   */
  saveConfig(dto: SaveSmsGatewayDTO): Promise<SmsGatewayPublicConfig>;

  /**
   * Records a test connection or test SMS execution result.
   */
  recordTestResult(result: {
    status: string;
    balance?: string;
    error?: string;
  }): Promise<void>;

  /**
   * Invalidates any internal memory cache of the settings.
   */
  invalidateCache(): void;
}
