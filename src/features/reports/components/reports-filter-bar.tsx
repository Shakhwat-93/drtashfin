"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  Download,
  Printer,
  RotateCw,
  Search,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { DateRangePreset } from "@/types/reports";

export interface ChamberOption {
  id: string;
  name: string;
  code: string;
  patientIdPrefix: string;
}

export interface ReportsFilterBarProps {
  chambers: ChamberOption[];
  selectedChamberId: string;
  onChamberChange: (chamberId: string) => void;
  selectedPreset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
  onExportCsv?: () => void;
  isExporting?: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
  hideSearch?: boolean;
}

const PRESET_OPTIONS: { id: DateRangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "last7days", label: "7 Days" },
  { id: "last30days", label: "30 Days" },
  { id: "currentMonth", label: "This Month" },
  { id: "previousMonth", label: "Last Month" },
  { id: "custom", label: "Custom" },
];

export function ReportsFilterBar({
  chambers,
  selectedChamberId,
  onChamberChange,
  selectedPreset,
  onPresetChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search records...",
  onExportCsv,
  isExporting = false,
  onRefresh,
  isLoading = false,
  hideSearch = false,
}: ReportsFilterBarProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 print:hidden">
      {/* Top Bar: Chamber Selector & Date Presets */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 rounded-xl border border-[#EAE3D9] bg-white shadow-2xs">
        {/* Chamber Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1.5 mr-2 text-xs font-semibold text-[#7A746F]">
            <Building2 className="h-4 w-4 text-[#DE4F3C]" />
            <span>Chamber:</span>
          </div>

          <button
            type="button"
            onClick={() => onChamberChange("all")}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
              selectedChamberId === "all"
                ? "bg-[#DE4F3C] text-white shadow-xs font-semibold"
                : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] hover:bg-[#F3ECE0] border border-[#EAE3D9]"
            }`}
          >
            All Chambers
          </button>

          {chambers.map((c) => {
            const active = selectedChamberId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onChamberChange(c.id)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                  active
                    ? "bg-[#DE4F3C] text-white shadow-xs font-semibold"
                    : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] hover:bg-[#F3ECE0] border border-[#EAE3D9]"
                }`}
              >
                {c.name.replace(" Chamber", "")} ({c.patientIdPrefix})
              </button>
            );
          })}
        </div>

        {/* Date Presets & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1 text-xs font-semibold text-[#7A746F]">
            <Calendar className="h-4 w-4 text-[#DE4F3C]" />
            <span>Range:</span>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#FAF5EE] border border-[#EAE3D9]">
            {PRESET_OPTIONS.map((p) => {
              const active = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPresetChange(p.id)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    active
                      ? "bg-white text-[#DE4F3C] font-semibold shadow-2xs border border-[#EAE3D9]"
                      : "text-[#7A746F] hover:text-[#201C1A]"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Quick Refresh */}
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-8 px-2.5 text-xs text-[#7A746F]"
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          )}

          {/* Export CSV */}
          {onExportCsv && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onExportCsv}
              disabled={isExporting}
              leftIcon={<Download className="h-3.5 w-3.5 text-[#DE4F3C]" />}
              className="h-8 text-xs font-medium"
            >
              {isExporting ? "Exporting..." : "Export CSV"}
            </Button>
          )}

          {/* Print Summary */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-3.5 w-3.5 text-[#7A746F]" />}
            className="h-8 text-xs font-medium"
          >
            Print
          </Button>
        </div>
      </div>

      {/* Custom Date Pickers Sub-bar (if preset === 'custom') */}
      {selectedPreset === "custom" && (
        <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/50">
          <span className="text-xs font-semibold text-[#201C1A]">Custom Date Range:</span>
          <div className="flex items-center gap-2">
            <label htmlFor="custom-start-date" className="text-xs text-[#7A746F]">From:</label>
            <input
              id="custom-start-date"
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-[#EAE3D9] bg-white text-[#201C1A] focus:outline-none focus:ring-1 focus:ring-[#DE4F3C]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="custom-end-date" className="text-xs text-[#7A746F]">To:</label>
            <input
              id="custom-end-date"
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="h-8 px-2.5 text-xs rounded-lg border border-[#EAE3D9] bg-white text-[#201C1A] focus:outline-none focus:ring-1 focus:ring-[#DE4F3C]"
            />
          </div>
          <span className="text-[11px] text-[#7A746F]">
            Dates are interpreted in Asia/Dhaka time (UTC+6).
          </span>
        </div>
      )}

      {/* Optional Search Query Bar */}
      {!hideSearch && onSearchChange && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A746F]" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 bg-white"
          />
        </div>
      )}
    </div>
  );
}
