"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import {
  usePatients,
  PatientFilters,
  PatientListTable,
} from "@/features/patients";
import { Gender } from "@/types/common";

export default function PatientsPage() {
  const [search, setSearch] = React.useState<string>("");
  const [gender, setGender] = React.useState<Gender | undefined>(undefined);
  const [page, setPage] = React.useState<number>(1);
  const pageSize = 10;

  const {
    patients,
    total,
    isLoading,
  } = usePatients({
    search,
    gender,
    page,
    pageSize,
  });

  const totalPages = Math.ceil(total / pageSize) || 1;

  // Reset to page 1 when search or gender filter changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleGenderChange = (val?: Gender) => {
    setGender(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setGender(undefined);
    setPage(1);
  };

  const startRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, total);

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Page Header */}
        <PageHeader
          title="Patients"
          description="Manage patient records, registrations, and access full clinical profiles."
          actions={
            <Link href="/patients/new">
              <Button variant="primary" className="gap-2">
                <Plus className="h-4 w-4" />
                <span>New Patient</span>
              </Button>
            </Link>
          }
        />

        {/* Filters and Search Bar */}
        <PatientFilters
          search={search}
          onSearchChange={handleSearchChange}
          gender={gender}
          onGenderChange={handleGenderChange}
          totalCount={total}
        />

        {/* Patient Table */}
        <div className="space-y-4">
          <PatientListTable
            patients={patients}
            isLoading={isLoading}
            hasFilter={Boolean(search || gender)}
            onResetFilters={handleResetFilters}
          />

          {/* Pagination Controls */}
          {!isLoading && total > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
              <div className="text-xs text-[#7A746F]">
                Showing{" "}
                <span className="font-semibold text-[#201C1A]">
                  {startRecord}–{endRecord}
                </span>{" "}
                of <span className="font-semibold text-[#201C1A]">{total}</span>{" "}
                patients
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1 h-8 px-2.5 text-xs"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Previous</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const pageNum = i + 1;
                    // Only display first, last, and window around current page
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      Math.abs(pageNum - page) <= 1
                    ) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                            pageNum === page
                              ? "bg-[#DE4F3C] text-white shadow-xs font-semibold"
                              : "border border-[#EAE3D9] bg-white text-[#201C1A] hover:bg-[#FAF5EE]"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    if (
                      (pageNum === 2 && page > 3) ||
                      (pageNum === totalPages - 1 && page < totalPages - 2)
                    ) {
                      return (
                        <span
                          key={pageNum}
                          className="px-1 text-xs text-[#7A746F]"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1 h-8 px-2.5 text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </AdminShell>
  );
}
