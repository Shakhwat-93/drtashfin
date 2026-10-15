"use client";

import * as React from "react";
import {
  DiagnosticReport,
  CreateDiagnosticReportDTO,
  UpdateDiagnosticReportDTO,
} from "@/types/diagnostic-report";

export function useDiagnosticReports(patientId?: string, consultationId?: string) {
  const [reports, setReports] = React.useState<DiagnosticReport[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  const fetchReports = React.useCallback(async () => {
    if (!patientId && !consultationId) {
      setReports([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (consultationId) {
        params.set("consultationId", consultationId);
      } else if (patientId) {
        params.set("patientId", patientId);
      }

      const res = await fetch(`/api/diagnostic-reports?${params.toString()}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status} error`);
      }

      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load diagnostic reports";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, consultationId]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const createReport = React.useCallback(
    async (dto: CreateDiagnosticReportDTO): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch("/api/diagnostic-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create diagnostic report");
        }

        await fetchReports();
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to create diagnostic report";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchReports]
  );

  const updateReport = React.useCallback(
    async (
      reportId: string,
      dto: UpdateDiagnosticReportDTO
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/diagnostic-reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update diagnostic report");
        }

        await fetchReports();
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to update diagnostic report";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchReports]
  );

  const deleteReport = React.useCallback(
    async (reportId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        setIsSubmitting(true);
        setError(null);

        const res = await fetch(`/api/diagnostic-reports/${reportId}`, {
          method: "DELETE",
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to remove diagnostic report reference");
        }

        await fetchReports();
        return { success: true };
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to remove diagnostic report reference";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsSubmitting(false);
      }
    },
    [fetchReports]
  );

  return {
    reports,
    isLoading,
    error,
    isSubmitting,
    createReport,
    updateReport,
    deleteReport,
    refresh: fetchReports,
  };
}
