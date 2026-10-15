"use client";

import { useState, useEffect, useCallback } from "react";
import { ClinicalDashboardData, DateRangePreset } from "@/types/reports";

export interface UseClinicalDashboardOptions {
  chamberId?: string;
  preset?: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

export function useClinicalDashboard(options: UseClinicalDashboardOptions = {}) {
  const { chamberId = "all", preset = "last30days", startDate, endDate } = options;

  const [data, setData] = useState<ClinicalDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState<number>(0);

  const refresh = useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchDashboard() {
      try {
        const query = new URLSearchParams({
          chamberId,
          preset,
        });
        if (startDate) query.set("startDate", startDate);
        if (endDate) query.set("endDate", endDate);

        const res = await fetch(`/api/reports/dashboard?${query.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}: Failed to load clinical dashboard data`);
        }

        const json = await res.json();
        if (!isCancelled) {
          setData(json.data);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load clinical dashboard data");
          setIsLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      isCancelled = true;
    };
  }, [chamberId, preset, startDate, endDate, refreshIndex]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
