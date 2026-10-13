import {
  Medicine,
  MedicineSearchParams,
  UnifiedMedicineSearchResult,
  HybridSearchResponse,
} from "@/types/medicine";
import { IMedicineRepository, getMedicineRepository } from "@/lib/data";
import {
  IExternalMedicineProvider,
  ExternalMedicineProvider,
  ExternalSearchTimeoutError,
} from "./external-provider";
import { HybridSearchCache } from "./hybrid-cache";

export interface HybridMedicineSearchParams extends MedicineSearchParams {
  forceHybrid?: boolean;
  minLocalResultsBeforeFallback?: number;
}

export const MAX_SEARCH_QUERY_LENGTH = 120;

/**
 * Sanitizes a user search query to prevent PostgREST/SQL wildcard abuse,
 * unescaped regex hazards, or control-character injection.
 */
export function sanitizeMedicineSearchQuery(rawQuery: unknown): string {
  if (typeof rawQuery !== "string") return "";

  const cleaned = rawQuery
    // Remove control characters
    .replace(/[\x00-\x1F\x7F]/g, " ")
    // Strip PostgREST/SQL/Regex metacharacters that have no place in medicine brand/generic names
    .replace(/[%_\\*?$^[\]{}|<>~`;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > MAX_SEARCH_QUERY_LENGTH) {
    return cleaned.slice(0, MAX_SEARCH_QUERY_LENGTH).trim();
  }

  return cleaned;
}

function normalizeDedupePart(val: string | undefined): string {
  if (!val) return "";
  return val
    .toLowerCase()
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generates conservative deduplication signatures.
 * Never merges distinct strengths or distinct dosage forms into a single result.
 */
export function getDeduplicationKeys(item: {
  brandName: string;
  genericName: string;
  strength?: string;
  dosageForm?: string;
}): { strictKey: string; baseKey: string } {
  const brand = normalizeDedupePart(item.brandName);
  const generic = normalizeDedupePart(item.genericName);
  const strength = normalizeDedupePart(item.strength);
  const form = normalizeDedupePart(item.dosageForm);

  return {
    strictKey: `${brand}|${generic}|${strength}|${form}`,
    baseKey: `${brand}|${generic}|${strength}`,
  };
}

function computeRelevanceScore(
  item: { brandName: string; genericName: string; strength?: string },
  query: string,
  isLocal: boolean
): number {
  const q = query.toLowerCase().trim();
  const brand = item.brandName.toLowerCase();
  const generic = item.genericName.toLowerCase();

  let score = isLocal ? 200 : 10;

  if (brand === q) {
    score += 100;
  } else if (brand.startsWith(q)) {
    score += 75;
  } else if (brand.includes(q)) {
    score += 45;
  }

  if (generic === q) {
    score += 80;
  } else if (generic.startsWith(q)) {
    score += 55;
  } else if (generic.includes(q)) {
    score += 30;
  }

  return score;
}

export function mapLocalMedicineToUnifiedResult(
  med: Medicine,
  query: string
): UnifiedMedicineSearchResult {
  return {
    id: med.id,
    brandName: med.brandName,
    genericName: med.genericName,
    strength: med.strength,
    dosageForm: med.dosageForm,
    manufacturer: med.manufacturer,
    medicineType: med.medicineType,
    packageContainer: med.packageContainer,
    packSizeInfo: med.packSizeInfo,
    source: med.source || "local_catalogue",
    sourceId: med.sourceId,
    sourceName: "Verified Local Supabase Catalogue",
    sourceUrl: med.sourceUrl,
    status: med.status,
    origin: "local",
    sourceBadge: "Local Catalogue",
    isExternal: false,
    dataFreshness: med.updatedAt,
    relevanceScore: computeRelevanceScore(med, query, true),
    indications: med.indications,
    dosageDescription: med.dosageDescription,
    sideEffects: med.sideEffects,
    contraindications: med.contraindications,
    createdAt: med.createdAt,
    updatedAt: med.updatedAt,
  };
}

/**
 * Production-ready Two-Stage Hybrid Medicine Search Service.
 *
 * Stage A: Searches the verified local Supabase catalogue first.
 * Stage B: Falls back to the external dataset/provider when local matches are absent or insufficient.
 *
 * Strictly enforces:
 * - Zero automatic writes/imports of external medicines into Supabase
 * - Bounded LRU caching + single-flight concurrency coalescing
 * - Conservative deduplication preserving distinct strengths and dosage forms
 * - Timeout and error resilience preserving Stage A local results
 */
export class HybridMedicineSearchService {
  private localRepo: IMedicineRepository;
  private externalProvider: IExternalMedicineProvider;
  private cache: HybridSearchCache;

  constructor(options?: {
    localRepo?: IMedicineRepository;
    externalProvider?: IExternalMedicineProvider;
    cache?: HybridSearchCache;
  }) {
    this.localRepo = options?.localRepo || getMedicineRepository();
    this.externalProvider =
      options?.externalProvider || new ExternalMedicineProvider();
    this.cache = options?.cache || globalHybridSearchCache;
  }

  public async search(
    params: HybridMedicineSearchParams = {}
  ): Promise<HybridSearchResponse> {
    const startTime = Date.now();
    const limit = Math.min(Math.max(params.limit || 15, 1), 50);
    const sanitizedQuery = sanitizeMedicineSearchQuery(params.query);

    // Handle empty or malformed queries safely
    if (!sanitizedQuery) {
      return {
        results: [],
        totalResults: 0,
        localCount: 0,
        externalCount: 0,
        query: "",
        cacheHit: false,
        externalFallbackTriggered: false,
        externalFallbackStatus: "disabled",
        durationMs: Date.now() - startTime,
      };
    }

    // STAGE A: Primary Local Supabase Catalogue Search
    let localRaw: Medicine[] = [];
    try {
      localRaw = await this.localRepo.searchMedicines({
        query: sanitizedQuery,
        dosageForm: params.dosageForm,
        manufacturer: params.manufacturer,
        medicineType: params.medicineType,
        limit,
        offset: params.offset || 0,
      });
    } catch (err) {
      console.error("Stage A local medicine search error:", err);
      localRaw = [];
    }

    const localUnified = localRaw
      .map((m) => mapLocalMedicineToUnifiedResult(m, sanitizedQuery))
      .sort((a, b) => {
        const diff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
        if (diff !== 0) return diff;
        return a.brandName.localeCompare(b.brandName);
      });

    const minThreshold =
      params.minLocalResultsBeforeFallback !== undefined
        ? params.minLocalResultsBeforeFallback
        : Math.min(limit, 5);

    const shouldTriggerExternal =
      Boolean(params.forceHybrid) || localUnified.length < minThreshold;

    if (!shouldTriggerExternal) {
      const slicedLocal = localUnified.slice(0, limit);
      return {
        results: slicedLocal,
        totalResults: slicedLocal.length,
        localCount: slicedLocal.length,
        externalCount: 0,
        query: sanitizedQuery,
        cacheHit: false,
        externalFallbackTriggered: false,
        externalFallbackStatus: "skipped_sufficient_local",
        durationMs: Date.now() - startTime,
      };
    }

    // STAGE B: External Search Fallback with Single-Flight Coalescing & Bounded Cache
    let externalRaw: UnifiedMedicineSearchResult[] = [];
    let cacheHit = false;
    let externalFallbackStatus: HybridSearchResponse["externalFallbackStatus"] =
      "ok";
    let fallbackWarning: string | undefined = undefined;

    const cacheKey = HybridSearchCache.normalizeKey(
      sanitizedQuery,
      params.dosageForm,
      params.manufacturer,
      limit
    );

    try {
      const cachedOrFetched = await this.cache.getOrFetch(cacheKey, () =>
        this.externalProvider.searchExternal(sanitizedQuery, {
          limit: limit * 2,
          dosageForm: params.dosageForm,
          manufacturer: params.manufacturer,
        })
      );
      externalRaw = cachedOrFetched.results;
      cacheHit = cachedOrFetched.cacheHit;
    } catch (err) {
      if (err instanceof ExternalSearchTimeoutError) {
        externalFallbackStatus = "timeout";
        fallbackWarning =
          "External reference lookup timed out. Showing verified local catalogue results.";
      } else {
        externalFallbackStatus = "error";
        fallbackWarning =
          "External medicine reference temporarily unavailable. Showing verified local catalogue results.";
      }
      externalRaw = [];
    }

    // MERGE & CONSERVATIVE DEDUPLICATION
    // Local results always take precedence over external duplicates
    const seenStrictKeys = new Set<string>();
    const seenLocalBaseKeys = new Set<string>();

    for (const loc of localUnified) {
      const { strictKey, baseKey } = getDeduplicationKeys(loc);
      seenStrictKeys.add(strictKey);
      seenLocalBaseKeys.add(baseKey);
    }

    const deduplicatedExternal: UnifiedMedicineSearchResult[] = [];

    for (const ext of externalRaw) {
      const { strictKey, baseKey } = getDeduplicationKeys(ext);

      // Skip if exact match already exists
      if (seenStrictKeys.has(strictKey)) {
        continue;
      }

      // If external item has no dosageForm, check if local catalogue already has the exact same brand + generic + strength
      if (!ext.dosageForm && seenLocalBaseKeys.has(baseKey)) {
        continue;
      }

      seenStrictKeys.add(strictKey);
      deduplicatedExternal.push({
        ...ext,
        origin: "external",
        isExternal: true,
        sourceBadge: ext.sourceBadge || "External MedEx BD",
        relevanceScore: computeRelevanceScore(ext, sanitizedQuery, false),
      });
    }

    deduplicatedExternal.sort((a, b) => {
      const diff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
      if (diff !== 0) return diff;
      return a.brandName.localeCompare(b.brandName);
    });

    // Combine: Local verified matches ranked first, followed by external matches
    const combined = [...localUnified, ...deduplicatedExternal].slice(0, limit);
    const finalLocalCount = combined.filter((r) => !r.isExternal).length;
    const finalExternalCount = combined.filter((r) => r.isExternal).length;

    return {
      results: combined,
      totalResults: combined.length,
      localCount: finalLocalCount,
      externalCount: finalExternalCount,
      query: sanitizedQuery,
      cacheHit,
      externalFallbackTriggered: true,
      externalFallbackStatus,
      fallbackWarning,
      durationMs: Date.now() - startTime,
    };
  }
}

export const globalHybridSearchCache = new HybridSearchCache();
