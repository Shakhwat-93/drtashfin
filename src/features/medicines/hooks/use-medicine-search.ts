"use client";

import * as React from "react";
import {
  Medicine,
  MedicineSearchParams,
  UnifiedMedicineSearchResult,
  HybridSearchResponse,
} from "@/types/medicine";
import { getMedicineRepository } from "@/lib/data";

export interface UseMedicineSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: UnifiedMedicineSearchResult[];
  localCount: number;
  externalCount: number;
  fallbackWarning: string | null;
  externalFallbackTriggered: boolean;
  isLoading: boolean;
  error: string | null;
  selectedMedicine: UnifiedMedicineSearchResult | Medicine | null;
  setSelectedMedicine: (
    medicine: UnifiedMedicineSearchResult | Medicine | null
  ) => void;
  search: (customQuery?: string) => Promise<void>;
  clear: () => void;
}

function mapLocalToUnifiedClient(med: Medicine): UnifiedMedicineSearchResult {
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
    sourceName: "Verified Local Catalogue",
    sourceUrl: med.sourceUrl,
    status: med.status,
    origin: "local",
    sourceBadge: "Local Catalogue",
    isExternal: false,
    indications: med.indications,
    dosageDescription: med.dosageDescription,
    sideEffects: med.sideEffects,
    contraindications: med.contraindications,
    createdAt: med.createdAt,
    updatedAt: med.updatedAt,
  };
}

export function useMedicineSearch(
  initialParams: MedicineSearchParams = {}
): UseMedicineSearchResult {
  const [query, setQuery] = React.useState(initialParams.query || "");
  const [results, setResults] = React.useState<UnifiedMedicineSearchResult[]>(
    []
  );
  const [localCount, setLocalCount] = React.useState(0);
  const [externalCount, setExternalCount] = React.useState(0);
  const [fallbackWarning, setFallbackWarning] = React.useState<string | null>(
    null
  );
  const [externalFallbackTriggered, setExternalFallbackTriggered] =
    React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMedicine, setSelectedMedicine] = React.useState<
    UnifiedMedicineSearchResult | Medicine | null
  >(null);

  // In-memory client query cache for instant responses
  const cacheRef = React.useRef<Map<string, HybridSearchResponse>>(new Map());
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const executeSearch = React.useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();

      if (!trimmed) {
        setResults([]);
        setLocalCount(0);
        setExternalCount(0);
        setFallbackWarning(null);
        setExternalFallbackTriggered(false);
        setIsLoading(false);
        setError(null);
        return;
      }

      const limit = initialParams.limit || 15;
      const cacheKey = `${trimmed.toLowerCase()}_${initialParams.dosageForm || ""}_${initialParams.manufacturer || ""}_${limit}`;

      if (cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey)!;
        setResults(cached.results);
        setLocalCount(cached.localCount);
        setExternalCount(cached.externalCount);
        setFallbackWarning(cached.fallbackWarning || null);
        setExternalFallbackTriggered(cached.externalFallbackTriggered);
        setIsLoading(false);
        setError(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("q", trimmed);
        params.set("limit", String(limit));
        if (initialParams.dosageForm && initialParams.dosageForm !== "All") {
          params.set("dosageForm", initialParams.dosageForm);
        }
        if (initialParams.manufacturer) {
          params.set("manufacturer", initialParams.manufacturer);
        }

        const res = await fetch(`/api/medicines/search?${params.toString()}`, {
          method: "GET",
          credentials: "same-origin",
          signal: controller.signal,
        });

        if (res.ok) {
          const payload = await res.json();
          const data: HybridSearchResponse | undefined = payload?.data;

          if (data && Array.isArray(data.results)) {
            cacheRef.current.set(cacheKey, data);
            setResults(data.results);
            setLocalCount(data.localCount);
            setExternalCount(data.externalCount);
            setFallbackWarning(data.fallbackWarning || null);
            setExternalFallbackTriggered(data.externalFallbackTriggered);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to direct local repository if API route is unreachable
        const repo = getMedicineRepository();
        const localData = await repo.searchMedicines({
          ...initialParams,
          query: trimmed,
          limit,
        });

        const unified = localData.map(mapLocalToUnifiedClient);
        const fallbackResp: HybridSearchResponse = {
          results: unified,
          totalResults: unified.length,
          localCount: unified.length,
          externalCount: 0,
          query: trimmed,
          externalFallbackTriggered: false,
          durationMs: 0,
        };

        cacheRef.current.set(cacheKey, fallbackResp);
        setResults(unified);
        setLocalCount(unified.length);
        setExternalCount(0);
        setFallbackWarning(null);
        setExternalFallbackTriggered(false);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        console.error("Medicine search failed:", err);
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to search medicine catalogue. Please retry.";
        setError(msg);
        setResults([]);
      } finally {
        if (abortControllerRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [initialParams]
  );

  // Debounce search by 220ms
  React.useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query);
    }, 220);

    return () => clearTimeout(timer);
  }, [query, executeSearch]);

  const clear = React.useCallback(() => {
    setQuery("");
    setResults([]);
    setLocalCount(0);
    setExternalCount(0);
    setFallbackWarning(null);
    setExternalFallbackTriggered(false);
    setError(null);
    setSelectedMedicine(null);
  }, []);

  const search = React.useCallback(
    async (customQuery?: string) => {
      const q = customQuery !== undefined ? customQuery : query;
      await executeSearch(q);
    },
    [query, executeSearch]
  );

  return {
    query,
    setQuery,
    results,
    localCount,
    externalCount,
    fallbackWarning,
    externalFallbackTriggered,
    isLoading,
    error,
    selectedMedicine,
    setSelectedMedicine,
    search,
    clear,
  };
}
