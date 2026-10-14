"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FollowUp,
  CreateFollowUpDTO,
  UpdateFollowUpDTO,
  CompleteFollowUpDTO,
  RescheduleFollowUpDTO,
  CancelFollowUpDTO,
} from "@/types/follow-up";
import { getFollowUpRepository } from "@/lib/data";

export interface UseFollowUpsResult {
  followUps: FollowUp[];
  upcomingFollowUps: FollowUp[];
  overdueFollowUps: FollowUp[];
  completedFollowUps: FollowUp[];
  cancelledFollowUps: FollowUp[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  scheduleFollowUp: (data: CreateFollowUpDTO) => Promise<FollowUp>;
  updateFollowUp: (id: string, data: UpdateFollowUpDTO) => Promise<FollowUp>;
  completeFollowUp: (id: string, data: CompleteFollowUpDTO) => Promise<FollowUp>;
  rescheduleFollowUp: (id: string, data: RescheduleFollowUpDTO) => Promise<FollowUp>;
  cancelFollowUp: (id: string, data: CancelFollowUpDTO) => Promise<FollowUp>;
}

export function useFollowUps(patientIdentifier?: string): UseFollowUpsResult {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(patientIdentifier));
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadFollowUps() {
      if (!patientIdentifier) {
        if (!isCancelled) {
          setFollowUps([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const repo = getFollowUpRepository();
        const data = await repo.getFollowUpsByPatient(patientIdentifier);

        if (!isCancelled) {
          setFollowUps(data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load clinical follow-up records."
          );
          setFollowUps([]);
          setIsLoading(false);
        }
      }
    }

    loadFollowUps();

    return () => {
      isCancelled = true;
    };
  }, [patientIdentifier, refreshKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  // Derived collections
  const upcomingFollowUps = followUps.filter(
    (f) => f.status === "scheduled" && f.scheduledDate >= todayStr
  );

  const overdueFollowUps = followUps.filter(
    (f) => f.status === "scheduled" && f.scheduledDate < todayStr
  );

  const completedFollowUps = followUps.filter((f) => f.status === "completed");
  const cancelledFollowUps = followUps.filter((f) => f.status === "cancelled");

  const scheduleFollowUp = useCallback(
    async (data: CreateFollowUpDTO): Promise<FollowUp> => {
      const repo = getFollowUpRepository();
      const created = await repo.createFollowUp(data);
      refresh();
      return created;
    },
    [refresh]
  );

  const updateFollowUp = useCallback(
    async (id: string, data: UpdateFollowUpDTO): Promise<FollowUp> => {
      const repo = getFollowUpRepository();
      const updated = await repo.updateFollowUp(id, data);
      refresh();
      return updated;
    },
    [refresh]
  );

  const completeFollowUp = useCallback(
    async (id: string, data: CompleteFollowUpDTO): Promise<FollowUp> => {
      const repo = getFollowUpRepository();
      const completed = await repo.completeFollowUp(id, data);
      refresh();
      return completed;
    },
    [refresh]
  );

  const rescheduleFollowUp = useCallback(
    async (id: string, data: RescheduleFollowUpDTO): Promise<FollowUp> => {
      const repo = getFollowUpRepository();
      const rescheduled = await repo.rescheduleFollowUp(id, data);
      refresh();
      return rescheduled;
    },
    [refresh]
  );

  const cancelFollowUp = useCallback(
    async (id: string, data: CancelFollowUpDTO): Promise<FollowUp> => {
      const repo = getFollowUpRepository();
      const cancelled = await repo.cancelFollowUp(id, data);
      refresh();
      return cancelled;
    },
    [refresh]
  );

  return {
    followUps,
    upcomingFollowUps,
    overdueFollowUps,
    completedFollowUps,
    cancelledFollowUps,
    isLoading,
    error,
    refresh,
    scheduleFollowUp,
    updateFollowUp,
    completeFollowUp,
    rescheduleFollowUp,
    cancelFollowUp,
  };
}
