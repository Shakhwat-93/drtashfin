"use client";

import { useState, useEffect, useCallback } from "react";
import { Patient, UpdatePatientDTO } from "@/types/patient";
import { getPatientRepository } from "@/lib/data";

export interface UsePatientResult {
  patient: Patient | null;
  isLoading: boolean;
  error: string | null;
  isUpdating: boolean;
  updatePatient: (data: UpdatePatientDTO) => Promise<Patient>;
  refresh: () => void;
}

export function usePatient(identifier?: string): UsePatientResult {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(identifier));
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadPatient() {
      if (!identifier) {
        if (!isCancelled) {
          setPatient(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const repo = getPatientRepository();
        const data = await repo.getPatientByIdentifier(identifier);

        if (!isCancelled) {
          if (!data) {
            setError(`Patient "${identifier}" could not be found.`);
            setPatient(null);
          } else {
            setPatient(data);
            setError(null);
          }
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load patient.");
          setPatient(null);
          setIsLoading(false);
        }
      }
    }

    loadPatient();

    return () => {
      isCancelled = true;
    };
  }, [identifier, refreshKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  const updatePatient = useCallback(
    async (data: UpdatePatientDTO): Promise<Patient> => {
      if (!patient) {
        throw new Error("Cannot update: Patient is not loaded.");
      }

      setIsUpdating(true);
      try {
        const repo = getPatientRepository();
        const updated = await repo.updatePatient(patient.id, data);
        setPatient(updated);
        setIsUpdating(false);
        return updated;
      } catch (err) {
        setIsUpdating(false);
        throw err;
      }
    },
    [patient]
  );

  return {
    patient,
    isLoading,
    error,
    isUpdating,
    updatePatient,
    refresh,
  };
}
