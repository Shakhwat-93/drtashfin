import { ISmsProvider } from "./sms-provider.interface";
import { MockSmsProvider } from "./mock-sms-provider";
import { GenericHttpSmsProvider } from "./generic-http-sms-provider";

export * from "./sms-provider.interface";
export * from "./mock-sms-provider";
export * from "./generic-http-sms-provider";

let currentProvider: ISmsProvider | null = null;
const singletonMockProvider = new MockSmsProvider();

/**
 * Resolves the active SMS provider based on environment configuration.
 * By default, returns MockSmsProvider with live sending disabled unless
 * SMS_ENABLED="true" and valid provider credentials are provided.
 */
export function getSmsProvider(): ISmsProvider {
  if (currentProvider) {
    return currentProvider;
  }

  const isLiveEnabled = process.env.SMS_ENABLED === "true";
  const providerType = (process.env.SMS_PROVIDER || "mock").toLowerCase();

  if (isLiveEnabled && providerType === "generic_http") {
    currentProvider = new GenericHttpSmsProvider();
    return currentProvider;
  }

  // Safe fallback to mock provider
  currentProvider = singletonMockProvider;
  return currentProvider;
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
