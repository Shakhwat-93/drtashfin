"use client";

import { useState, useEffect, useCallback } from "react";
import { Consultation, UpdateConsultationDTO } from "@/types/consultation";
import { getConsultationRepository } from "@/lib/data";

export interface UseConsultationResult {
  consultation: Consultation | null;
  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  updateConsultation: (data: UpdateConsultationDTO) => Promise<Consultation>;
  refresh: () => void;
}

export function useConsultation(consultationId?: string): UseConsultationResult {
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(consultationId));
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadConsultation() {
      if (!consultationId) {
        if (!isCancelled) {
          setConsultation(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const repo = getConsultationRepository();
        const data = await repo.getConsultationById(consultationId);

        if (!isCancelled) {
          if (!data) {
            setError(`Consultation record "${consultationId}" could not be found.`);
            setConsultation(null);
          } else {
            setConsultation(data);
            setError(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load consultation."
          );
          setConsultation(null);
          setIsLoading(false);
        }
      }
    }

    loadConsultation();

    return () => {
      isCancelled = true;
    };
  }, [consultationId, refreshKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const updateConsultation = useCallback(
    async (data: UpdateConsultationDTO): Promise<Consultation> => {
      if (!consultation) {
        throw new Error("Cannot update: Consultation is not loaded.");
      }

      setIsUpdating(true);
      try {
        const repo = getConsultationRepository();
        const updated = await repo.updateConsultation(consultation.id, data);
        setConsultation(updated);
        setIsUpdating(false);
        return updated;
      } catch (err) {
        setIsUpdating(false);
        throw err;
      }
    },
    [consultation]
  );

  return {
    consultation,
    isLoading,
    error,
    isUpdating,
    updateConsultation,
    refresh,
  };
}
