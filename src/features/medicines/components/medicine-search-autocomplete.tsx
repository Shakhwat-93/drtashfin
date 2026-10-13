"use client";

import * as React from "react";
import {
  Search,
  X,
  Loader2,
  Pill,
  Building2,
  AlertTriangle,
  ExternalLink,
  RotateCw,
  ShieldCheck,
  Globe,
  Info,
} from "lucide-react";
import { Medicine, UnifiedMedicineSearchResult } from "@/types/medicine";
import { useMedicineSearch } from "../hooks/use-medicine-search";
import { cn } from "@/lib/utils";

export interface MedicineSearchAutocompleteProps {
  placeholder?: string;
  onSelect: (medicine: UnifiedMedicineSearchResult & Medicine) => void;
  className?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  showClinicalNotice?: boolean;
  limit?: number;
}

export function MedicineSearchAutocomplete({
  placeholder = "Search medicine by brand (e.g. Napa, 1stCef) or generic (e.g. Paracetamol)...",
  onSelect,
  className,
  autoFocus = false,
  disabled = false,
  showClinicalNotice = true,
  limit = 15,
}: MedicineSearchAutocompleteProps) {
  const {
    query,
    setQuery,
    results,
    localCount,
    externalCount,
    fallbackWarning,
    isLoading,
    error,
    clear,
    search,
  } = useMedicineSearch({ limit });

  const [isOpen, setIsOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState<number>(-1);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Open dropdown when query changes and has results or is loading
  React.useEffect(() => {
    if (query.trim().length > 0) {
      setIsOpen(true);
      setActiveIndex(-1);
    } else {
      setIsOpen(false);
    }
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" && results.length > 0) {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelectMedicine(results[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  // Ensure active item scrolls into view
  React.useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  const handleSelectMedicine = (med: UnifiedMedicineSearchResult) => {
    // Convert safely while preserving UnifiedMedicineSearchResult metadata
    const normalized: UnifiedMedicineSearchResult & Medicine = {
      ...med,
      searchTerms:
        `${med.brandName} ${med.genericName} ${med.strength || ""} ${med.manufacturer || ""}`.toLowerCase(),
      createdAt: med.createdAt || new Date().toISOString(),
      updatedAt: med.updatedAt || new Date().toISOString(),
    };
    onSelect(normalized);
    setQuery("");
    setIsOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Search Input Container */}
      <div className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 flex items-center text-[#7A746F]">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#DE4F3C]" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="medicine-search-results"
          aria-activedescendant={
            activeIndex >= 0 ? `med-item-${activeIndex}` : undefined
          }
          className={cn(
            "w-full rounded-xl border border-[#EAE3D9] bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm text-[#201C1A] placeholder-[#7A746F] shadow-xs transition-all focus:border-[#DE4F3C] focus:outline-hidden focus:ring-2 focus:ring-[#DE4F3C]/20 disabled:cursor-not-allowed disabled:bg-[#F8F5F0]",
            isOpen && "rounded-b-none border-b-transparent"
          )}
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              clear();
              inputRef.current?.focus();
            }}
            className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-[#7A746F] hover:bg-[#F2ECE4] hover:text-[#201C1A]"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Results Box */}
      {isOpen && (
        <div
          id="medicine-search-results"
          className="absolute z-50 mt-[-1px] w-full rounded-b-xl border border-[#EAE3D9] bg-white shadow-xl backdrop-blur-md overflow-hidden"
        >
          {/* Clinical Safety Notice */}
          {showClinicalNotice && (
            <div className="flex items-center gap-2 border-b border-[#EAE3D9]/80 bg-[#FFF9F5] px-3.5 py-1.5 text-[11px] text-[#A83D2F]">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>
                <strong>Clinical Reference:</strong> Doctor verification required.
                Always confirm dosage & indications for individual patient.
              </span>
            </div>
          )}

          {/* Discreet External Fallback Warning State */}
          {fallbackWarning && (
            <div className="flex items-center gap-2 border-b border-[#EAE3D9]/80 bg-amber-50/70 px-3.5 py-1.5 text-[11px] text-amber-800">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>{fallbackWarning}</span>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-center">
              <p className="text-xs text-[#DE4F3C]">{error}</p>
              <button
                type="button"
                onClick={() => search()}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-[#EAE3D9] px-2.5 py-1 text-xs text-[#201C1A] hover:bg-[#F8F5F0]"
              >
                <RotateCw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* No Results State */}
          {!isLoading && !error && results.length === 0 && query.trim() && (
            <div className="p-5 text-center text-[#7A746F]">
              <Pill className="mx-auto mb-1.5 h-6 w-6 text-[#C4BCB3]" />
              <p className="text-xs font-medium text-[#201C1A]">
                No medicines found
              </p>
              <p className="text-[11px]">
                No local or external reference entry matching &ldquo;{query}&rdquo;. Check spelling or search by generic name.
              </p>
            </div>
          )}

          {/* Results List */}
          {results.length > 0 && (
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-72 overflow-y-auto divide-y divide-[#EAE3D9]/60 py-1"
            >
              {results.map((med, index) => {
                const isActive = index === activeIndex;
                const isExternal = med.isExternal || med.origin === "external";

                return (
                  <li
                    key={med.id}
                    id={`med-item-${index}`}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => handleSelectMedicine(med)}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 px-4 py-2.5 transition-colors",
                      isActive ? "bg-[#F8F5F0]" : "hover:bg-[#FAF8F5]"
                    )}
                  >
                    {/* Top Row: Brand name, Strength, Dosage Form, Provenance Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="font-semibold text-xs sm:text-sm text-[#201C1A] truncate">
                          {med.brandName}
                        </span>

                        {med.strength && (
                          <span className="rounded-full bg-[#EAE3D9] px-2 py-0.5 text-[10px] font-semibold text-[#201C1A]">
                            {med.strength}
                          </span>
                        )}

                        {med.dosageForm ? (
                          <span className="rounded-md border border-[#EAE3D9] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#7A746F]">
                            {med.dosageForm}
                          </span>
                        ) : (
                          isExternal && (
                            <span className="rounded-md border border-dashed border-[#C4BCB3] bg-[#FAF8F5] px-1.5 py-0.5 text-[10px] font-medium text-[#7A746F]">
                              Form Unspecified
                            </span>
                          )
                        )}

                        {med.price && (
                          <span className="text-[10px] font-medium text-[#7A746F]">
                            ({med.price})
                          </span>
                        )}
                      </div>

                      {/* Source Provenance Badge */}
                      <div className="shrink-0">
                        {!isExternal ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            <span>Local Catalogue</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                            <Globe className="h-2.5 w-2.5" />
                            <span>{med.sourceBadge || "External MedEx"}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row: Generic name & Manufacturer */}
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#7A746F]">
                      <span className="font-medium text-[#504A45] truncate max-w-[65%]">
                        Generic: <span className="italic">{med.genericName}</span>
                      </span>

                      {med.manufacturer && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#7A746F]">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[170px]">
                            {med.manufacturer}
                          </span>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {/* Footer with Count & Source Provenance */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EAE3D9] bg-[#FAF8F5] px-3.5 py-1.5 text-[10px] text-[#7A746F]">
            <span>
              {results.length > 0
                ? `Showing ${results.length} results (${localCount} Local • ${externalCount} External) • ↑ ↓ Enter`
                : "Hybrid Search: Local Catalogue + 19,600+ BD Reference Index"}
            </span>
            <span className="inline-flex items-center gap-1 text-[#7A746F]">
              <ExternalLink className="h-2.5 w-2.5" />
              <span>Hybrid MedEx Reference</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
