"use client";

import * as React from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { MedicineSearchAutocomplete, MedicineCard } from "@/features/medicines";
import { Medicine } from "@/types/medicine";
import { getMedicineRepository } from "@/lib/data";
import {
  Pill,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function MedicinesPage() {
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [dosageForms, setDosageForms] = React.useState<string[]>([]);
  const [selectedDosageForm, setSelectedDosageForm] = React.useState<string>("All");
  const [activeSearchTerm, setActiveSearchTerm] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = React.useState<number>(1);
  const [pageSize, setPageSize] = React.useState<number>(24);
  const [matchingCount, setMatchingCount] = React.useState<number>(0);
  const [globalTotalCount, setGlobalTotalCount] = React.useState<number>(0);
  const [totalPages, setTotalPages] = React.useState<number>(1);

  // Load distinct dosage forms and global total count once on mount
  React.useEffect(() => {
    let isMounted = true;
    async function initCatalogueMeta() {
      try {
        const repo = getMedicineRepository();
        const [total, forms] = await Promise.all([
          repo.getTotalMedicineCount(),
          repo.getDosageForms(),
        ]);
        if (isMounted) {
          setGlobalTotalCount(total);
          setDosageForms(["All", ...forms]);
        }
      } catch (err) {
        console.error("Failed to load catalogue metadata:", err);
      }
    }
    initCatalogueMeta();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch paginated medicines whenever query, dosage form, page, or pageSize changes
  const fetchPage = React.useCallback(
    async (query: string, form: string, page: number, size: number) => {
      setIsLoading(true);
      try {
        const repo = getMedicineRepository();
        const offset = (page - 1) * size;
        const result = await repo.searchMedicinesPaginated({
          query: query.trim() || undefined,
          dosageForm: form !== "All" ? form : undefined,
          limit: size,
          offset,
        });

        if (query.trim() && result.medicines.length === 0) {
          try {
            const apiRes = await fetch(
              `/api/medicines/search?q=${encodeURIComponent(
                query.trim()
              )}&limit=${size}&hybrid=true`,
              { credentials: "same-origin" }
            );
            if (apiRes.ok) {
              const payload = await apiRes.json();
              if (payload?.data?.results && payload.data.results.length > 0) {
                setMedicines(payload.data.results);
                setMatchingCount(payload.data.totalResults);
                setTotalPages(1);
                return;
              }
            }
          } catch {
            // Fall back to standard empty local state
          }
        }

        setMedicines(result.medicines);
        setMatchingCount(result.totalCount);
        setTotalPages(Math.max(result.totalPages, 1));
      } catch (err) {
        console.error("Failed to fetch paginated medicines:", err);
        setMedicines([]);
        setMatchingCount(0);
        setTotalPages(1);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    fetchPage(activeSearchTerm, selectedDosageForm, currentPage, pageSize);
  }, [fetchPage, activeSearchTerm, selectedDosageForm, currentPage, pageSize]);

  const handleSelectFromAutocomplete = (med: Medicine) => {
    setActiveSearchTerm(med.brandName);
    setCurrentPage(1);
  };

  const handleFilterDosageForm = (form: string) => {
    setSelectedDosageForm(form);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setActiveSearchTerm("");
    setSelectedDosageForm("All");
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Helper for generating page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);

      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const fromRecord = matchingCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toRecord = Math.min(currentPage * pageSize, matchingCount);

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#EAE3D9] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-bold text-[#201C1A]">
                Bangladesh Medicine Catalogue
              </h1>
              <Badge variant="neutral" className="border-[#C4BCB3] text-[#201C1A] text-xs">
                {globalTotalCount.toLocaleString()} Total Indexed
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#7A746F] mt-1">
              Authoritative pharmaceutical index sourced from MedEx Bangladesh for clinical reference, dosage verification, and prescribing.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>MedEx Verified</span>
            </span>
          </div>
        </div>

        {/* Quick Search & Filters Card */}
        <div className="rounded-2xl border border-[#EAE3D9] bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#201C1A]">
            <span className="flex items-center gap-1.5">
              <Pill className="h-4 w-4 text-[#DE4F3C]" />
              <span>Fast Clinical Autocomplete</span>
            </span>
            <span className="text-[11px] text-[#7A746F]">
              Search across 1,200+ brands, generics, strengths & manufacturers
            </span>
          </div>

          <MedicineSearchAutocomplete
            onSelect={handleSelectFromAutocomplete}
            placeholder="Type brand name (e.g. Napa, Seclo, Maxpro) or generic (e.g. Paracetamol)..."
            showClinicalNotice={false}
            limit={15}
          />

          {/* Dosage Form Filter Tabs */}
          {dosageForms.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                <span className="text-[11px] font-medium text-[#7A746F] shrink-0 mr-1 flex items-center gap-1">
                  <SlidersHorizontal className="h-3 w-3" />
                  Form:
                </span>
                {dosageForms.map((form) => {
                  const isSelected = selectedDosageForm === form;
                  return (
                    <button
                      key={form}
                      type="button"
                      onClick={() => handleFilterDosageForm(form)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors shrink-0 ${
                        isSelected
                          ? "bg-[#201C1A] text-white shadow-xs"
                          : "bg-[#F8F5F0] text-[#7A746F] hover:bg-[#EAE3D9] hover:text-[#201C1A]"
                      }`}
                    >
                      {form}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filter Summary & Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#7A746F] bg-[#FAF8F5] p-3 rounded-xl border border-[#EAE3D9]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#201C1A]">
              Showing {fromRecord}–{toRecord} of {matchingCount.toLocaleString()} medicines
            </span>
            {selectedDosageForm !== "All" && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#EAE3D9] px-2 py-0.5 rounded-full text-[11px] text-[#201C1A]">
                Form: {selectedDosageForm}
              </span>
            )}
            {activeSearchTerm && (
              <span className="inline-flex items-center gap-1 bg-white border border-[#EAE3D9] px-2 py-0.5 rounded-full text-[11px] text-[#201C1A]">
                Query: &ldquo;{activeSearchTerm}&rdquo;
              </span>
            )}
            {(selectedDosageForm !== "All" || activeSearchTerm) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[#DE4F3C] hover:underline font-medium ml-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2 shrink-0">
            <label htmlFor="page-size-select" className="text-[11px]">
              Per page:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-lg border border-[#EAE3D9] bg-white px-2.5 py-1 text-xs font-medium text-[#201C1A] shadow-2xs focus:border-[#DE4F3C] focus:outline-hidden"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={96}>96</option>
            </select>
          </div>
        </div>

        {/* Results Grid */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl bg-[#F0ECE7]" />
              ))}
            </div>
          ) : medicines.length === 0 ? (
            <div className="rounded-2xl border border-[#EAE3D9] bg-white p-12 text-center">
              <Pill className="mx-auto h-10 w-10 text-[#C4BCB3] mb-3" />
              <h3 className="font-serif text-lg font-semibold text-[#201C1A]">
                No medicines found
              </h3>
              <p className="text-xs sm:text-sm text-[#7A746F] mt-1 max-w-sm mx-auto">
                No matching medications found for your search criteria. Try modifying your search term or selecting &ldquo;All&rdquo; dosage forms.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#201C1A] px-4 py-2 text-xs font-medium text-white hover:bg-[#342E2B] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Show All Medicines</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((med) => (
                <MedicineCard key={med.id} medicine={med} />
              ))}
            </div>
          )}

          {/* Agency-Grade Pagination Bar */}
          {!isLoading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#EAE3D9] pt-5">
              <div className="text-xs text-[#7A746F]">
                Page <span className="font-semibold text-[#201C1A]">{currentPage}</span> of{" "}
                <span className="font-semibold text-[#201C1A]">{totalPages}</span> ({matchingCount.toLocaleString()} total items)
              </div>

              <div className="flex items-center gap-1.5">
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  aria-label="First page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAE3D9] bg-white text-[#7A746F] hover:bg-[#F8F5F0] hover:text-[#201C1A] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAE3D9] bg-white text-[#7A746F] hover:bg-[#F8F5F0] hover:text-[#201C1A] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((p, idx) => {
                    if (typeof p === "string") {
                      return (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-1 text-xs text-[#7A746F]"
                        >
                          {p}
                        </span>
                      );
                    }
                    const isActive = p === currentPage;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-medium transition-colors ${
                          isActive
                            ? "bg-[#201C1A] text-white shadow-xs font-semibold"
                            : "border border-[#EAE3D9] bg-white text-[#201C1A] hover:bg-[#F8F5F0]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAE3D9] bg-white text-[#7A746F] hover:bg-[#F8F5F0] hover:text-[#201C1A] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  aria-label="Last page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#EAE3D9] bg-white text-[#7A746F] hover:bg-[#F8F5F0] hover:text-[#201C1A] disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronsRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </AdminShell>
  );
}
