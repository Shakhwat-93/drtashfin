"use client";

import { useState, useEffect, useCallback } from "react";
import { Patient, CreatePatientDTO, PatientQueryParams } from "@/types/patient";
import { getPatientRepository } from "@/lib/data";
import { useChamber } from "@/features/chamber";

export interface UsePatientsOptions extends PatientQueryParams {
  autoFetch?: boolean;
}

export function usePatients(options: UsePatientsOptions = {}) {
  const { activeChamber, isSwitching } = useChamber();

  const {
    search,
    gender,
    page = 1,
    pageSize = 10,
    sortBy,
    sortOrder,
    autoFetch = true,
  } = options;

  // If options.chamberId is explicitly provided, use it; otherwise scope to activeChamber
  const effectiveChamberId =
    options.chamberId !== undefined ? options.chamberId : activeChamber?.id;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    async function fetchData() {
      try {
        const repo = getPatientRepository();
        const result = await repo.getPatients({
          search,
          gender,
          chamberId: effectiveChamberId,
          page,
          pageSize,
          sortBy,
          sortOrder,
        });

        if (!isCancelled) {
          setPatients(result.items);
          setTotal(result.total);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load patients.");
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [
    autoFetch,
    search,
    gender,
    effectiveChamberId,
    page,
    pageSize,
    sortBy,
    sortOrder,
    refreshKey,
    isSwitching,
  ]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  }, []);

  const createPatient = useCallback(
    async (data: CreatePatientDTO): Promise<Patient> => {
      setIsLoading(true);
      try {
        const repo = getPatientRepository();
        const payload: CreatePatientDTO = {
          ...data,
          chamberId: data.chamberId || effectiveChamberId,
        };
        const created = await repo.createPatient(payload);
        setRefreshKey((prev) => prev + 1);
        return created;
      } finally {
        setIsLoading(false);
      }
    },
    [effectiveChamberId]
  );

  return {
    patients,
    total,
    isLoading: isLoading || isSwitching,
    error,
    refresh,
    createPatient,
  };
}
