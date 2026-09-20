"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DashboardMetrics,
  FollowUp,
  ClinicalActivity,
} from "@/types/clinical";
import { getClinicalRepository } from "@/lib/data";

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activities, setActivities] = useState<ClinicalActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      try {
        const clinicalRepo = getClinicalRepository();
        const [m, f, a] = await Promise.all([
          clinicalRepo.getDashboardMetrics(),
          clinicalRepo.getTodayFollowUps(),
          clinicalRepo.getRecentActivities(),
        ]);

        if (!isCancelled) {
          setMetrics(m);
          setFollowUps(f);
          setActivities(a);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard metrics."
          );
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  }, []);

  return {
    metrics,
    followUps,
    activities,
    isLoading,
    error,
    refresh,
  };
}
