"use client";

import * as React from "react";
import {
  PatientProcedure,
  CreateProcedureDTO,
  UpdateProcedureDTO,
  ProcedureCategory,
} from "@/types/procedure";

export interface UseProceduresOptions {
  patientId?: string;
  consultationId?: string;
  category?: ProcedureCategory | "all";
  searchQuery?: string;
}

export function useProcedures(
  patientId?: string,
  consultationId?: string,
  options?: { category?: ProcedureCategory | "all"; searchQuery?: string }
) {
  const [procedures, setProcedures] = React.useState<PatientProcedure[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const category = options?.category;
  const searchQuery = options?.searchQuery;

  const fetchProcedures = React.useCallback(async () => {
    if (!patientId && !consultationId) {
      setProcedures([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (consultationId) {
        params.set("consultationId", consultationId);
      }
      if (patientId) {
        params.set("patientId", patientId);
      }
      if (category && category !== "all") {
        params.set("category", category);
      }
      if (searchQuery && searchQuery.trim().length > 0) {
        params.set("searchQuery", searchQuery.trim());
      }

      const res = await fetch(`/api/procedures?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status} error`);
      }

      const data = await res.json();
      setProcedures(data.procedures || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load procedure history";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, consultationId, category, searchQuery]);

  React.useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const createProcedure = React.useCallback(
    async (
      dto: CreateProcedureDTO
    ): Promise<{ success: boolean; error?: string; procedure?: PatientProcedure }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch("/api/procedures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to record procedure");
        }

        await fetchProcedures();
        return { success: true, procedure: data.procedure };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to record procedure";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchProcedures]
  );

  const updateProcedure = React.useCallback(
    async (
      procedureId: string,
      dto: UpdateProcedureDTO
    ): Promise<{ success: boolean; error?: string; procedure?: PatientProcedure }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/procedures/${procedureId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update procedure record");
        }

        await fetchProcedures();
        return { success: true, procedure: data.procedure };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to update procedure record";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchProcedures]
  );

  const deleteProcedure = React.useCallback(
    async (
      procedureId: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/procedures/${procedureId}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to delete procedure record");
        }

        await fetchProcedures();
        return { success: true };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to delete procedure record";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchProcedures]
  );

  return {
    procedures,
    isLoading,
    error,
    isSubmitting,
    createProcedure,
    updateProcedure,
    deleteProcedure,
    refresh: fetchProcedures,
  };
}
