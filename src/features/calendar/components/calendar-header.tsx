"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Building2,
} from "lucide-react";
import { CalendarViewMode } from "../hooks/use-calendar-follow-ups";
import { useChamber } from "@/features/chamber";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Select } from "@/components/ui/select";

export interface CalendarHeaderProps {
  periodTitle: string;
  viewMode: CalendarViewMode;
  chamberFilter: string;
  statusFilter: string;
  priorityFilter: string;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onChamberChange: (chamberId: string) => void;
  onStatusChange: (status: string) => void;
  onPriorityChange: (priority: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  periodTitle,
  viewMode,
  chamberFilter,
  statusFilter,
  priorityFilter,
  onViewModeChange,
  onChamberChange,
  onStatusChange,
  onPriorityChange,
  onPrevious,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  const { chambers } = useChamber();

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-3.5 sm:p-4 rounded-2xl border border-[#EAE3D9] bg-white shadow-2xs min-w-0">
      {/* Left: Period Navigation */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 min-w-0">
        <div className="flex items-center gap-1 bg-[#FAF5EE] p-1 rounded-xl border border-[#EAE3D9] shrink-0">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Previous period"
            onClick={onPrevious}
            className="h-8 w-8 text-[#201C1A]"
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>

          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="h-8 text-xs font-semibold px-3 bg-white"
          >
            Today
          </Button>

          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Next period"
            onClick={onNext}
            className="h-8 w-8 text-[#201C1A]"
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>

        <h2 className="font-serif text-lg sm:text-xl font-bold text-[#201C1A] tracking-tight break-words min-w-0">
          {periodTitle}
        </h2>
      </div>

      {/* Right: View Mode Toggle & Filters */}
      <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2 sm:gap-2.5 min-w-0">
        {/* Chamber Filter */}
        <div className="flex items-center gap-1.5 min-w-0 sm:min-w-[150px] min-[420px]:col-span-2 sm:col-span-1">
          <Building2 className="h-4 w-4 text-[#7A746F] shrink-0 hidden sm:block" />
          <Select
            value={chamberFilter}
            onChange={(e) => onChamberChange(e.target.value)}
            className="h-9 text-xs font-medium w-full"
          >
            <option value="all">All Chambers</option>
            {chambers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.patientIdPrefix})
              </option>
            ))}
          </Select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center min-w-0 sm:min-w-[130px]">
          <Select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="h-9 text-xs font-medium w-full"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="overdue">Overdue Only</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center min-w-0 sm:min-w-[120px]">
          <Select
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="h-9 text-xs font-medium w-full"
          >
            <option value="all">All Priority</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="routine">Routine</option>
          </Select>
        </div>

        <div className="h-6 w-[1px] bg-[#EAE3D9] mx-1 hidden sm:block" />

        {/* View Mode Switcher Pills */}
        <div className="grid grid-cols-3 sm:flex sm:items-center p-1 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] text-xs min-[420px]:col-span-2 sm:col-span-1">
          <button
            type="button"
            onClick={() => onViewModeChange("month")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all text-center cursor-pointer ${
              viewMode === "month"
                ? "bg-white text-[#DE4F3C] font-semibold shadow-xs"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("week")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all text-center cursor-pointer ${
              viewMode === "week"
                ? "bg-white text-[#DE4F3C] font-semibold shadow-xs"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("agenda")}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-medium transition-all text-center cursor-pointer ${
              viewMode === "agenda"
                ? "bg-white text-[#DE4F3C] font-semibold shadow-xs"
                : "text-[#7A746F] hover:text-[#201C1A]"
            }`}
          >
            Agenda
          </button>
        </div>
      </div>
    </div>
  );
}
