"use client";

import * as React from "react";
import { Search, X, Filter } from "lucide-react";
import { Gender } from "@/types/common";
import { cn } from "@/lib/utils";

export interface PatientFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  gender?: Gender;
  onGenderChange: (gender?: Gender) => void;
  totalCount?: number;
  className?: string;
}

export function PatientFilters({
  search,
  onSearchChange,
  gender,
  onGenderChange,
  totalCount,
  className,
}: PatientFiltersProps) {
  const [localSearch, setLocalSearch] = React.useState(search);
  const [prevSearch, setPrevSearch] = React.useState(search);

  // Sync internal state with prop changes during render
  if (prevSearch !== search) {
    setPrevSearch(search);
    setLocalSearch(search);
  }

  // Debounce search changes by 300ms
  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [localSearch, search, onSearchChange]);

  const handleClearSearch = () => {
    setLocalSearch("");
    onSearchChange("");
  };

  const hasActiveFilters = Boolean(search || gender);

  const handleResetFilters = () => {
    setLocalSearch("");
    onSearchChange("");
    onGenderChange(undefined);
  };

  const genderOptions: Array<{ label: string; value: Gender | undefined }> = [
    { label: "All Patients", value: undefined },
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Other", value: "other" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-[#EAE3D9] bg-white p-4 shadow-xs md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      {/* Search Input Box */}
      <div className="relative flex-1 min-w-[240px] max-w-lg">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[#7A746F]">
          <Search className="h-4 w-4" />
        </div>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search by ID, name, phone, or birth date..."
          className="w-full rounded-lg border border-[#EAE3D9] bg-[#FAF5EE]/50 py-2 pl-9 pr-9 text-xs text-[#201C1A] placeholder-[#7A746F] transition-all focus:border-[#DE4F3C] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20"
          aria-label="Search patients"
        />
        {localSearch && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#7A746F] hover:text-[#201C1A]"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Gender Filter Segmented Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 text-[11px] font-medium text-[#7A746F] mr-1 hidden sm:flex">
          <Filter className="h-3 w-3" />
          <span>Gender:</span>
        </div>

        <div className="inline-flex rounded-lg border border-[#EAE3D9] bg-[#FAF5EE] p-0.5">
          {genderOptions.map((opt) => {
            const isSelected = gender === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onGenderChange(opt.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  isSelected
                    ? "bg-white text-[#201C1A] shadow-xs font-semibold"
                    : "text-[#7A746F] hover:text-[#201C1A]"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Clear Filter Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-medium text-[#DE4F3C] hover:underline px-1 py-1"
          >
            Reset
          </button>
        )}

        {/* Total Count Badge */}
        {totalCount !== undefined && (
          <div className="ml-auto text-xs text-[#7A746F] font-medium hidden lg:block">
            {totalCount} {totalCount === 1 ? "patient" : "patients"}
          </div>
        )}
      </div>
    </div>
  );
}
