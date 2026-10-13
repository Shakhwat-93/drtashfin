import { UnifiedMedicineSearchResult } from "@/types/medicine";

export interface CacheEntry {
  results: UnifiedMedicineSearchResult[];
  expiresAt: number;
}

export interface HybridCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

const DEFAULT_TTL_MS = Number(
  process.env.HYBRID_MEDICINE_SEARCH_CACHE_TTL_MS || 10 * 60 * 1000
); // 10 minutes
const DEFAULT_MAX_ENTRIES = Number(
  process.env.HYBRID_MEDICINE_SEARCH_CACHE_MAX_ENTRIES || 500
);

/**
 * Bounded LRU in-memory cache with TTL and single-flight request coalescing
 * for external medicine search queries.
 *
 * Security note: Only caches non-sensitive pharmaceutical reference results,
 * never patient or clinical data.
 */
export class HybridSearchCache {
  private store = new Map<string, CacheEntry>();
  private inFlight = new Map<
    string,
    Promise<UnifiedMedicineSearchResult[]>
  >();
  private ttlMs: number;
  private maxEntries: number;

  constructor(options: HybridCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  public static normalizeKey(
    query: string,
    dosageForm?: string,
    manufacturer?: string,
    limit?: number
  ): string {
    const q = query.trim().toLowerCase().replace(/\s+/g, " ");
    const df = (dosageForm || "").trim().toLowerCase();
    const man = (manufacturer || "").trim().toLowerCase();
    const lim = limit || 15;
    return `q:${q}|df:${df}|m:${man}|l:${lim}`;
  }

  public get(key: string): UnifiedMedicineSearchResult[] | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    // Refresh LRU order by re-inserting
    this.store.delete(key);
    this.store.set(key, entry);

    return entry.results.map((item) => ({ ...item }));
  }

  public set(key: string, results: UnifiedMedicineSearchResult[]): void {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else if (this.store.size >= this.maxEntries) {
      // Evict oldest (first key in Map iteration order)
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) {
        this.store.delete(oldestKey);
      }
    }

    this.store.set(key, {
      results: results.map((item) => ({ ...item })),
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Executes `fetcher` with single-flight coalescing and LRU cache lookup.
   * Identical concurrent requests share the same in-flight Promise.
   */
  public async getOrFetch(
    key: string,
    fetcher: () => Promise<UnifiedMedicineSearchResult[]>
  ): Promise<{ results: UnifiedMedicineSearchResult[]; cacheHit: boolean }> {
    const cached = this.get(key);
    if (cached !== null) {
      return { results: cached, cacheHit: true };
    }

    // Check if an identical request is currently in-flight
    const existingPromise = this.inFlight.get(key);
    if (existingPromise) {
      const results = await existingPromise;
      return {
        results: results.map((item) => ({ ...item })),
        cacheHit: true,
      };
    }

    const fetchPromise = (async () => {
      try {
        const freshResults = await fetcher();
        this.set(key, freshResults);
        return freshResults;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    const results = await fetchPromise;
    return {
      results: results.map((item) => ({ ...item })),
      cacheHit: false,
    };
  }

  public clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  public size(): number {
    return this.store.size;
  }
}
