"use client";

import * as React from "react";
import {
  PatientDischarge,
  CreateDischargeDTO,
  UpdateDischargeDTO,
  AmendDischargeDTO,
  DischargeStatus,
} from "@/types/discharge";

export function useDischarges(
  patientId?: string,
  consultationId?: string,
  options?: { status?: DischargeStatus | "all"; searchQuery?: string }
) {
  const [discharges, setDischarges] = React.useState<PatientDischarge[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const status = options?.status;
  const searchQuery = options?.searchQuery;

  const fetchDischarges = React.useCallback(async () => {
    if (!patientId && !consultationId) {
      setDischarges([]);
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
      if (status && status !== "all") {
        params.set("status", status);
      }
      if (searchQuery && searchQuery.trim().length > 0) {
        params.set("searchQuery", searchQuery.trim());
      }

      const res = await fetch(`/api/discharges?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status} error`);
      }

      const data = await res.json();
      setDischarges(data.discharges || []);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load discharge records";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, consultationId, status, searchQuery]);

  React.useEffect(() => {
    fetchDischarges();
  }, [fetchDischarges]);

  const createDischarge = React.useCallback(
    async (
      dto: CreateDischargeDTO
    ): Promise<{ success: boolean; error?: string; discharge?: PatientDischarge }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch("/api/discharges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create discharge record");
        }

        await fetchDischarges();
        return { success: true, discharge: data.discharge };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to create discharge record";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchDischarges]
  );

  const updateDischarge = React.useCallback(
    async (
      dischargeId: string,
      dto: UpdateDischargeDTO
    ): Promise<{ success: boolean; error?: string; discharge?: PatientDischarge }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/discharges/${dischargeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update discharge record");
        }

        await fetchDischarges();
        return { success: true, discharge: data.discharge };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to update discharge record";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchDischarges]
  );

  const finalizeDischarge = React.useCallback(
    async (
      dischargeId: string,
      finalizedBy?: string
    ): Promise<{ success: boolean; error?: string; discharge?: PatientDischarge }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/discharges/${dischargeId}/finalize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmed: true, finalizedBy }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to finalize discharge record");
        }

        await fetchDischarges();
        return { success: true, discharge: data.discharge };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to finalize discharge record";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchDischarges]
  );

  const amendDischarge = React.useCallback(
    async (
      dischargeId: string,
      dto: AmendDischargeDTO
    ): Promise<{ success: boolean; error?: string; discharge?: PatientDischarge }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/discharges/${dischargeId}/amend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to amend discharge record");
        }

        await fetchDischarges();
        return { success: true, discharge: data.discharge };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to amend discharge record";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchDischarges]
  );

  const deleteDraftDischarge = React.useCallback(
    async (
      dischargeId: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/discharges/${dischargeId}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to delete discharge draft");
        }

        await fetchDischarges();
        return { success: true };
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to delete discharge draft";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchDischarges]
  );

  return {
    discharges,
    isLoading,
    error,
    isSubmitting,
    createDischarge,
    updateDischarge,
    finalizeDischarge,
    amendDischarge,
    deleteDraftDischarge,
    refresh: fetchDischarges,
  };
}
