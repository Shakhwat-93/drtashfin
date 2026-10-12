"use client";

import * as React from "react";
import { Medicine, MedicineSearchParams } from "@/types/medicine";
import { getMedicineRepository } from "@/lib/data";

export interface UseMedicineSearchResult {
  query: string;
  setQuery: (query: string) => void;
  results: Medicine[];
  isLoading: boolean;
  error: string | null;
  selectedMedicine: Medicine | null;
  setSelectedMedicine: (medicine: Medicine | null) => void;
  search: (customQuery?: string) => Promise<void>;
  clear: () => void;
}

export function useMedicineSearch(initialParams: MedicineSearchParams = {}): UseMedicineSearchResult {
  const [query, setQuery] = React.useState(initialParams.query || "");
  const [results, setResults] = React.useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedMedicine, setSelectedMedicine] = React.useState<Medicine | null>(null);

  // In-memory query cache for instant responses
  const cacheRef = React.useRef<Map<string, Medicine[]>>(new Map());

  const executeSearch = React.useCallback(
    async (searchQuery: string) => {
      const trimmed = searchQuery.trim();

      if (!trimmed) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      // Check cache first
      const cacheKey = `${trimmed}_${initialParams.dosageForm || ""}_${initialParams.manufacturer || ""}`;
      if (cacheRef.current.has(cacheKey)) {
        setResults(cacheRef.current.get(cacheKey)!);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const repo = getMedicineRepository();
        const data = await repo.searchMedicines({
          ...initialParams,
          query: trimmed,
          limit: initialParams.limit || 15,
        });

        cacheRef.current.set(cacheKey, data);
        setResults(data);
      } catch (err: any) {
        console.error("Medicine search failed:", err);
        setError(err.message || "Failed to search medicine catalogue. Please retry.");
        setResults([]);
      } finally {
        setIsLoading(false);
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
    isLoading,
    error,
    selectedMedicine,
    setSelectedMedicine,
    search,
    clear,
  };
}
