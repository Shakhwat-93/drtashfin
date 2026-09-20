"use client";

import { useState, useEffect, useCallback } from "react";
import { Patient, CreatePatientDTO, PatientQueryParams } from "@/types/patient";
import { getPatientRepository } from "@/lib/data";

export interface UsePatientsOptions extends PatientQueryParams {
  autoFetch?: boolean;
}

export function usePatients(options: UsePatientsOptions = {}) {
  const {
    search,
    gender,
    page = 1,
    pageSize = 10,
    sortBy,
    sortOrder,
    autoFetch = true,
  } = options;

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

    async function fetchData() {
      try {
        const repo = getPatientRepository();
        const result = await repo.getPatients({
          search,
          gender,
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
  }, [autoFetch, search, gender, page, pageSize, sortBy, sortOrder, refreshKey]);

  const refresh = useCallback(() => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);
  }, []);

  const createPatient = useCallback(
    async (data: CreatePatientDTO): Promise<Patient> => {
      setIsLoading(true);
      try {
        const repo = getPatientRepository();
        const created = await repo.createPatient(data);
        setRefreshKey((prev) => prev + 1);
        return created;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create patient.");
        setIsLoading(false);
        throw err;
      }
    },
    []
  );

  return {
    patients,
    total,
    isLoading,
    error,
    refresh,
    createPatient,
  };
}
