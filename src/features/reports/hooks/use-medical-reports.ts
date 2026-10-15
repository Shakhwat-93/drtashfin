"use client";

import { useState, useEffect, useCallback } from "react";
import { DateRangePreset, ReportType } from "@/types/reports";

export interface UseMedicalReportsOptions {
  reportType: ReportType;
  chamberId?: string;
  preset?: DateRangePreset;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  status?: string;
  category?: string;
  recordType?: "all" | "diagnostic" | "procedure";
  page?: number;
  pageSize?: number;
}

export function useMedicalReports<T = unknown>(options: UseMedicalReportsOptions) {
  const {
    reportType,
    chamberId = "all",
    preset = "last30days",
    startDate,
    endDate,
    searchQuery = "",
    status,
    category,
    recordType,
    page = 1,
    pageSize = 25,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState<number>(0);

  const refresh = useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    async function fetchReport() {
      try {
        const query = new URLSearchParams({
          chamberId,
          preset,
          page: String(page),
          pageSize: String(pageSize),
        });
        if (startDate) query.set("startDate", startDate);
        if (endDate) query.set("endDate", endDate);
        if (searchQuery.trim()) query.set("searchQuery", searchQuery.trim());
        if (status) query.set("status", status);
        if (category) query.set("category", category);
        if (recordType) query.set("recordType", recordType);

        const res = await fetch(`/api/reports/${reportType}?${query.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}: Failed to load ${reportType} report`);
        }

        const json = await res.json();
        if (!isCancelled) {
          setData(json.data || []);
          setTotalCount(json.totalCount || 0);
          setTotalPages(json.totalPages || 1);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : `Failed to load ${reportType} report`);
          setIsLoading(false);
        }
      }
    }

    fetchReport();

    return () => {
      isCancelled = true;
    };
  }, [
    reportType,
    chamberId,
    preset,
    startDate,
    endDate,
    searchQuery,
    status,
    category,
    recordType,
    page,
    pageSize,
    refreshIndex,
  ]);

  return {
    data,
    totalCount,
    totalPages,
    currentPage: page,
    pageSize,
    isLoading,
    error,
    refresh,
  };
}
