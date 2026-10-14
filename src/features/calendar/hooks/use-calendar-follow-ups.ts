"use client";

import * as React from "react";
import { FollowUp, FollowUpStatus } from "@/types/follow-up";
import { getFollowUpRepository } from "@/lib/data";
import { useChamber } from "@/features/chamber";
import {
  getClinicToday,
  parseYMD,
  addMonths,
  addDays,
  getMonthGrid,
  getWeekDays,
  formatDisplayDate,
} from "@/lib/date-utils";

export type CalendarViewMode = "month" | "week" | "agenda";

export interface UseCalendarFollowUpsReturn {
  currentYear: number;
  currentMonth: number;
  currentDateStr: string;
  viewMode: CalendarViewMode;
  chamberFilter: string; // "all" or chamberId
  statusFilter: string; // "all" or specific status
  priorityFilter: string; // "all" or specific priority
  followUps: FollowUp[];
  followUpsByDate: Record<string, FollowUp[]>;
  isLoading: boolean;
  error: string | null;
  periodTitle: string;
  setViewMode: (mode: CalendarViewMode) => void;
  setChamberFilter: (chamberId: string) => void;
  setStatusFilter: (status: string) => void;
  setPriorityFilter: (priority: string) => void;
  goToNext: () => void;
  goToPrevious: () => void;
  goToToday: () => void;
  selectDate: (dateStr: string) => void;
  refresh: () => Promise<void>;
}

export function useCalendarFollowUps(): UseCalendarFollowUpsReturn {
  const { activeChamber } = useChamber();

  const todayStr = React.useMemo(() => getClinicToday(), []);
  const todayParts = React.useMemo(() => parseYMD(todayStr), [todayStr]);

  const [currentYear, setCurrentYear] = React.useState(todayParts.year);
  const [currentMonth, setCurrentMonth] = React.useState(todayParts.month); // 1-12
  const [currentDateStr, setCurrentDateStr] = React.useState(todayStr);
  const [viewMode, setViewMode] = React.useState<CalendarViewMode>("month");
  const [chamberFilter, setChamberFilter] = React.useState<string>(activeChamber?.id || "all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<string>("all");

  const [followUps, setFollowUps] = React.useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Synchronize chamberFilter when activeChamber changes if currently scoped to single chamber
  React.useEffect(() => {
    if (activeChamber?.id && chamberFilter !== "all" && chamberFilter !== activeChamber.id) {
      setChamberFilter(activeChamber.id);
    }
  }, [activeChamber?.id]);

  // Calculate query date boundaries based on view mode
  const { queryStartDate, queryEndDate } = React.useMemo(() => {
    if (viewMode === "month") {
      const grid = getMonthGrid(currentYear, currentMonth);
      return {
        queryStartDate: grid[0]?.dateStr || `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
        queryEndDate: grid[grid.length - 1]?.dateStr || `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`,
      };
    }
    if (viewMode === "week") {
      const week = getWeekDays(currentDateStr);
      return {
        queryStartDate: week[0]?.dateStr || currentDateStr,
        queryEndDate: week[6]?.dateStr || currentDateStr,
      };
    }
    // Agenda: wide 60-day window (-15 days to +45 days)
    return {
      queryStartDate: addDays(currentDateStr, -15),
      queryEndDate: addDays(currentDateStr, 45),
    };
  }, [viewMode, currentYear, currentMonth, currentDateStr]);

  const fetchFollowUps = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const repo = getFollowUpRepository();
      const list = await repo.getFollowUps({
        chamberId: chamberFilter === "all" ? undefined : chamberFilter,
        startDate: queryStartDate,
        endDate: queryEndDate,
        status: statusFilter === "all" || statusFilter === "overdue" ? undefined : (statusFilter as FollowUpStatus),
      });

      // Filter in memory for composite conditions (e.g. overdue or priority)
      let filtered = list;

      if (statusFilter === "overdue") {
        filtered = filtered.filter(
          (f) => f.status === "scheduled" && f.scheduledDate < todayStr
        );
      }

      if (priorityFilter !== "all") {
        filtered = filtered.filter((f) => f.priority === priorityFilter);
      }

      setFollowUps(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar follow-ups.");
    } finally {
      setIsLoading(false);
    }
  }, [chamberFilter, queryStartDate, queryEndDate, statusFilter, priorityFilter, todayStr]);

  React.useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps]);

  // Group follow-ups by date string (YYYY-MM-DD)
  const followUpsByDate = React.useMemo(() => {
    const map: Record<string, FollowUp[]> = {};
    for (const f of followUps) {
      if (!map[f.scheduledDate]) {
        map[f.scheduledDate] = [];
      }
      map[f.scheduledDate].push(f);
    }
    return map;
  }, [followUps]);

  // Navigation Handlers
  const goToNext = React.useCallback(() => {
    if (viewMode === "month") {
      const next = addMonths(currentYear, currentMonth, 1);
      setCurrentYear(next.year);
      setCurrentMonth(next.month);
    } else if (viewMode === "week") {
      const nextDate = addDays(currentDateStr, 7);
      setCurrentDateStr(nextDate);
      const parts = parseYMD(nextDate);
      setCurrentYear(parts.year);
      setCurrentMonth(parts.month);
    } else {
      const nextDate = addDays(currentDateStr, 14);
      setCurrentDateStr(nextDate);
    }
  }, [viewMode, currentYear, currentMonth, currentDateStr]);

  const goToPrevious = React.useCallback(() => {
    if (viewMode === "month") {
      const prev = addMonths(currentYear, currentMonth, -1);
      setCurrentYear(prev.year);
      setCurrentMonth(prev.month);
    } else if (viewMode === "week") {
      const prevDate = addDays(currentDateStr, -7);
      setCurrentDateStr(prevDate);
      const parts = parseYMD(prevDate);
      setCurrentYear(parts.year);
      setCurrentMonth(parts.month);
    } else {
      const prevDate = addDays(currentDateStr, -14);
      setCurrentDateStr(prevDate);
    }
  }, [viewMode, currentYear, currentMonth, currentDateStr]);

  const goToToday = React.useCallback(() => {
    setCurrentYear(todayParts.year);
    setCurrentMonth(todayParts.month);
    setCurrentDateStr(todayStr);
  }, [todayParts, todayStr]);

  const selectDate = React.useCallback((dateStr: string) => {
    setCurrentDateStr(dateStr);
    const parts = parseYMD(dateStr);
    setCurrentYear(parts.year);
    setCurrentMonth(parts.month);
  }, []);

  const periodTitle = React.useMemo(() => {
    if (viewMode === "month") {
      const monthDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
      return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(monthDate);
    }
    if (viewMode === "week") {
      const week = getWeekDays(currentDateStr);
      const first = week[0]?.dateStr || currentDateStr;
      const last = week[6]?.dateStr || currentDateStr;
      const fParts = parseYMD(first);
      const lParts = parseYMD(last);
      const fDate = new Date(Date.UTC(fParts.year, fParts.month - 1, fParts.day));
      const lDate = new Date(Date.UTC(lParts.year, lParts.month - 1, lParts.day));

      const fStr = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(fDate);
      const lStr = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(lDate);
      return `${fStr} – ${lStr}`;
    }
    return formatDisplayDate(currentDateStr, { month: "long", day: "numeric", year: "numeric" });
  }, [viewMode, currentYear, currentMonth, currentDateStr]);

  return {
    currentYear,
    currentMonth,
    currentDateStr,
    viewMode,
    chamberFilter,
    statusFilter,
    priorityFilter,
    followUps,
    followUpsByDate,
    isLoading,
    error,
    periodTitle,
    setViewMode,
    setChamberFilter,
    setStatusFilter,
    setPriorityFilter,
    goToNext,
    goToPrevious,
    goToToday,
    selectDate,
    refresh: fetchFollowUps,
  };
}
