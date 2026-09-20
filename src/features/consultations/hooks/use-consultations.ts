"use client";

import { useState, useEffect, useCallback } from "react";
import { Consultation } from "@/types/consultation";
import { getConsultationRepository } from "@/lib/data";

export interface UseConsultationsResult {
  consultations: Consultation[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useConsultations(
  patientIdentifier?: string
): UseConsultationsResult {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(patientIdentifier));
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadConsultations() {
      if (!patientIdentifier) {
        if (!isCancelled) {
          setConsultations([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        const repo = getConsultationRepository();
        const data = await repo.getConsultationsByPatient(patientIdentifier);

        if (!isCancelled) {
          setConsultations(data);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load clinical consultations."
          );
          setConsultations([]);
          setIsLoading(false);
        }
      }
    }

    loadConsultations();

    return () => {
      isCancelled = true;
    };
  }, [patientIdentifier, refreshKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    consultations,
    isLoading,
    error,
    refresh,
  };
}
