import { UnifiedMedicineSearchResult } from "@/types/medicine";
import {
  ExternalMedicineDatasetAdapter,
  ExternalSearchOptions,
} from "./dataset-adapter";

export class ExternalSearchTimeoutError extends Error {
  constructor(message = "External medicine search timed out.") {
    super(message);
    this.name = "ExternalSearchTimeoutError";
  }
}

export interface IExternalMedicineProvider {
  searchExternal(
    query: string,
    options?: ExternalSearchOptions
  ): Promise<UnifiedMedicineSearchResult[]>;
}

export interface ExternalProviderConfig {
  apiUrl?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  customFetcher?: (
    query: string,
    options?: ExternalSearchOptions
  ) => Promise<UnifiedMedicineSearchResult[]>;
}

const DEFAULT_TIMEOUT_MS = Number(
  process.env.EXTERNAL_MEDICINE_API_TIMEOUT_MS || 2500
);
const DEFAULT_MAX_RETRIES = Number(
  process.env.EXTERNAL_MEDICINE_API_MAX_RETRIES || 1
);

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new ExternalSearchTimeoutError(
          `External search exceeded timeout of ${timeoutMs}ms`
        )
      );
    }, timeoutMs);

    promise
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Server-side external medicine search provider.
 * Supports:
 * 1. Verified local-file dataset adapter (18,931 MedEx + 736 Square Pharma records)
 * 2. Optional configurable upstream REST endpoint via EXTERNAL_MEDICINE_API_URL
 * 3. Strict request timeouts, exponential backoff retries, and graceful error propagation
 */
export class ExternalMedicineProvider implements IExternalMedicineProvider {
  private apiUrl?: string;
  private timeoutMs: number;
  private maxRetries: number;
  private retryDelayMs: number;
  private customFetcher?: (
    query: string,
    options?: ExternalSearchOptions
  ) => Promise<UnifiedMedicineSearchResult[]>;

  constructor(config: ExternalProviderConfig = {}) {
    this.apiUrl =
      config.apiUrl ??
      (process.env.EXTERNAL_MEDICINE_API_URL?.trim() || undefined);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.retryDelayMs = config.retryDelayMs ?? 120;
    this.customFetcher = config.customFetcher;
  }

  public async searchExternal(
    query: string,
    options: ExternalSearchOptions = {}
  ): Promise<UnifiedMedicineSearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    let lastError: unknown = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await sleep(this.retryDelayMs * Math.pow(2, attempt - 1));
        }

        return await withTimeout(
          this.executeSingleAttempt(trimmed, options),
          this.timeoutMs
        );
      } catch (err) {
        lastError = err;
        // Do not retry on explicit timeouts to avoid delaying Stage A response
        if (err instanceof ExternalSearchTimeoutError) {
          throw err;
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("External medicine search provider failed.");
  }

  private async executeSingleAttempt(
    query: string,
    options: ExternalSearchOptions
  ): Promise<UnifiedMedicineSearchResult[]> {
    if (this.customFetcher) {
      return this.customFetcher(query, options);
    }

    if (this.apiUrl) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const url = new URL(this.apiUrl);
        url.searchParams.set("q", query);
        if (options.limit) {
          url.searchParams.set("limit", String(options.limit));
        }
        if (options.dosageForm) {
          url.searchParams.set("dosageForm", options.dosageForm);
        }

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`Upstream API returned HTTP ${res.status}`);
        }

        const payload = await res.json();
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.results)
          ? payload.results
          : [];

        return items
          .filter(
            (r: Record<string, unknown>) =>
              typeof r?.brandName === "string" &&
              typeof r?.genericName === "string"
          )
          .map((r: Record<string, unknown>, idx: number) => ({
            id: String(r.id || `ext-api-${idx + 1}`),
            brandName: String(r.brandName).trim(),
            genericName: String(r.genericName).trim(),
            strength: r.strength ? String(r.strength).trim() : undefined,
            dosageForm: r.dosageForm ? String(r.dosageForm).trim() : undefined,
            manufacturer: r.manufacturer
              ? String(r.manufacturer).trim()
              : undefined,
            medicineType: "allopathic" as const,
            price: r.price ? String(r.price).trim() : undefined,
            source: "external_api",
            sourceId: r.sourceId ? String(r.sourceId) : undefined,
            sourceName: "Configured External Medicine API",
            sourceBadge: "External API",
            status: "active" as const,
            origin: "external" as const,
            isExternal: true,
          }));
      } finally {
        clearTimeout(timer);
      }
    }

    // Default: Use verified server-side dataset adapter (18,931 MedEx + 736 Square Pharma records)
    const adapter = ExternalMedicineDatasetAdapter.getInstance();
    return adapter.search(query, options);
  }
}
