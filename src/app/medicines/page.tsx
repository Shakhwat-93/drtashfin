"use client";

import * as React from "react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { MedicineSearchAutocomplete, MedicineCard } from "@/features/medicines";
import { Medicine } from "@/types/medicine";
import { getMedicineRepository } from "@/lib/data";
import { Pill, ShieldCheck, Database, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function MedicinesPage() {
  const [medicines, setMedicines] = React.useState<Medicine[]>([]);
  const [dosageForms, setDosageForms] = React.useState<string[]>([]);
  const [selectedDosageForm, setSelectedDosageForm] = React.useState<string>("All");
  const [isLoading, setIsLoading] = React.useState(true);
  const [totalCount, setTotalCount] = React.useState(0);
  const [activeSearchTerm, setActiveSearchTerm] = React.useState<string>("");

  const loadData = React.useCallback(async (query = "", dosageForm = "") => {
    setIsLoading(true);
    try {
      const repo = getMedicineRepository();
      const [list, count, forms] = await Promise.all([
        repo.searchMedicines({
          query: query || undefined,
          dosageForm: dosageForm && dosageForm !== "All" ? dosageForm : undefined,
          limit: 30,
        }),
        repo.getTotalMedicineCount(),
        repo.getDosageForms(),
      ]);

      setMedicines(list);
      setTotalCount(count);
      setDosageForms(["All", ...forms]);
    } catch (err) {
      console.error("Failed to load medicine catalogue:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectFromAutocomplete = (med: Medicine) => {
    setActiveSearchTerm(med.brandName);
    loadData(med.brandName, selectedDosageForm);
  };

  const handleFilterDosageForm = (form: string) => {
    setSelectedDosageForm(form);
    loadData(activeSearchTerm, form);
  };

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
                {totalCount} Items
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#7A746F] mt-1">
              Verified pharmaceutical index sourced from MedEx Bangladesh for clinical reference and prescribing.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Verified Catalogue</span>
            </span>
          </div>
        </div>

        {/* Search Bar Section */}
        <div className="rounded-2xl border border-[#EAE3D9] bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#201C1A]">
            <span className="flex items-center gap-1.5">
              <Pill className="h-4 w-4 text-[#DE4F3C]" />
              <span>Quick Medicine Search & Autocomplete</span>
            </span>
            <span className="text-[11px] text-[#7A746F]">
              Search by Brand (e.g. Napa) or Generic (e.g. Paracetamol)
            </span>
          </div>

          <MedicineSearchAutocomplete
            onSelect={handleSelectFromAutocomplete}
            placeholder="Type brand name or generic compound..."
            showClinicalNotice={false}
          />

          {/* Dosage Form Filter Tabs */}
          {dosageForms.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              <span className="text-[11px] font-medium text-[#7A746F] shrink-0 mr-1">
                Dosage Form:
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
                        ? "bg-[#201C1A] text-white"
                        : "bg-[#F8F5F0] text-[#7A746F] hover:bg-[#EAE3D9] hover:text-[#201C1A]"
                    }`}
                  >
                    {form}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#7A746F]">
            <span>
              Showing {medicines.length} medicine records
              {selectedDosageForm !== "All" && ` • Filtered by ${selectedDosageForm}`}
              {activeSearchTerm && ` • Matching "${activeSearchTerm}"`}
            </span>
            {activeSearchTerm && (
              <button
                type="button"
                onClick={() => {
                  setActiveSearchTerm("");
                  loadData("", selectedDosageForm);
                }}
                className="text-[#DE4F3C] hover:underline"
              >
                Clear Search Filter
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : medicines.length === 0 ? (
            <div className="rounded-2xl border border-[#EAE3D9] bg-white p-12 text-center">
              <Pill className="mx-auto h-8 w-8 text-[#C4BCB3] mb-2" />
              <h3 className="font-serif text-base font-semibold text-[#201C1A]">
                No medicines found
              </h3>
              <p className="text-xs text-[#7A746F] mt-1 max-w-sm mx-auto">
                No matching medications found for your criteria. Try adjusting the search term or clearing the dosage form filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((med) => (
                <MedicineCard key={med.id} medicine={med} />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </AdminShell>
  );
}
