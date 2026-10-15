"use client";

import * as React from "react";
import type {
  DoctorAchievement,
  AchievementCategory,
  CreateAchievementDTO,
  UpdateAchievementDTO,
} from "@/types/achievement";

export interface UseAchievementsResult {
  achievements: DoctorAchievement[];
  categoryCounts: Record<string, number>;
  total: number;
  isLoading: boolean;
  error: string | null;
  selectedCategory: AchievementCategory | "all";
  setSelectedCategory: (cat: AchievementCategory | "all") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  publishedFilter: "all" | boolean;
  setPublishedFilter: (val: "all" | boolean) => void;
  refresh: () => Promise<void>;
  createAchievement: (dto: CreateAchievementDTO) => Promise<DoctorAchievement>;
  updateAchievement: (
    id: string,
    dto: UpdateAchievementDTO
  ) => Promise<DoctorAchievement>;
  deleteAchievement: (id: string) => Promise<void>;
  exportCsvUrl: string;
}

export function useAchievements(): UseAchievementsResult {
  const [achievements, setAchievements] = React.useState<DoctorAchievement[]>([]);
  const [categoryCounts, setCategoryCounts] = React.useState<
    Record<string, number>
  >({});
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = React.useState<
    AchievementCategory | "all"
  >("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [publishedFilter, setPublishedFilter] = React.useState<"all" | boolean>(
    "all"
  );

  const fetchAchievements = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      if (searchQuery.trim().length > 0) {
        params.set("searchQuery", searchQuery.trim());
      }
      if (publishedFilter !== "all") {
        params.set("isPublished", String(publishedFilter));
      }

      const res = await fetch(`/api/achievements?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch doctor achievements");
      }

      setAchievements(data.achievements || []);
      setCategoryCounts(data.categoryCounts || {});
      setTotal(data.total || 0);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error loading doctor achievements";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, publishedFilter]);

  React.useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const createAchievement = React.useCallback(
    async (dto: CreateAchievementDTO): Promise<DoctorAchievement> => {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create achievement record");
      }

      await fetchAchievements();
      return data.achievement;
    },
    [fetchAchievements]
  );

  const updateAchievement = React.useCallback(
    async (
      id: string,
      dto: UpdateAchievementDTO
    ): Promise<DoctorAchievement> => {
      const res = await fetch(`/api/achievements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dto),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update achievement record");
      }

      await fetchAchievements();
      return data.achievement;
    },
    [fetchAchievements]
  );

  const deleteAchievement = React.useCallback(
    async (id: string): Promise<void> => {
      const res = await fetch(`/api/achievements/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete achievement record");
      }

      await fetchAchievements();
    },
    [fetchAchievements]
  );

  const exportCsvUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "all") {
      params.set("category", selectedCategory);
    }
    if (searchQuery.trim().length > 0) {
      params.set("searchQuery", searchQuery.trim());
    }
    if (publishedFilter !== "all") {
      params.set("isPublished", String(publishedFilter));
    }
    return `/api/achievements/export?${params.toString()}`;
  }, [selectedCategory, searchQuery, publishedFilter]);

  return {
    achievements,
    categoryCounts,
    total,
    isLoading,
    error,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    publishedFilter,
    setPublishedFilter,
    refresh: fetchAchievements,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    exportCsvUrl,
  };
}
