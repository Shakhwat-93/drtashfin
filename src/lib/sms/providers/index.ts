import { ISmsProvider } from "./sms-provider.interface";
import { MockSmsProvider } from "./mock-sms-provider";
import { GenericHttpSmsProvider } from "./generic-http-sms-provider";
import { BulkSmsDhakaProvider } from "./bulk-sms-dhaka-provider";

export * from "./sms-provider.interface";
export * from "./mock-sms-provider";
export * from "./generic-http-sms-provider";
export * from "./bulk-sms-dhaka-provider";

let currentProvider: ISmsProvider | null = null;
const singletonMockProvider = new MockSmsProvider();
let singletonBulkSmsDhakaProvider: BulkSmsDhakaProvider | null = null;

/**
 * Resolves the active SMS provider based on configuration.
 * When in test environment or SMS_PROVIDER="mock", uses MockSmsProvider.
 * In live mode or when configured via SMS Gateway Settings, uses BulkSmsDhakaProvider
 * which dynamically resolves encrypted credentials at runtime.
 */
export function getSmsProvider(): ISmsProvider {
  if (currentProvider) {
    return currentProvider;
  }

  const providerType = (process.env.SMS_PROVIDER || "bulksmsdhaka").toLowerCase();

  if (providerType === "mock") {
    currentProvider = singletonMockProvider;
    return currentProvider;
  }

  if (providerType === "generic_http") {
    currentProvider = new GenericHttpSmsProvider();
    return currentProvider;
  }

  // Default primary provider: Bulk SMS Dhaka with dynamic runtime credentials
  if (!singletonBulkSmsDhakaProvider) {
    singletonBulkSmsDhakaProvider = new BulkSmsDhakaProvider();
  }
  return singletonBulkSmsDhakaProvider;
}

/**
 * Override the SMS provider for automated testing.
 */
export function setSmsProvider(provider: ISmsProvider | null): void {
  currentProvider = provider;
}

/**
 * Returns the singleton mock provider instance for inspection in tests.
 */
export function getMockSmsProvider(): MockSmsProvider {
  return singletonMockProvider;
}

/**
 * Returns safe provider metadata for configuration check.
 */
export function getSmsProviderConfigStatus(): import("@/types/sms").SmsProviderConfigStatus {
  const provider = getSmsProvider();
  return provider.getConfigStatus();
}
