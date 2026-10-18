"use client";

import * as React from "react";
import Link from "next/link";
import { FileText, Plus, FileSpreadsheet } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader, Button } from "@/components/ui";
import { useChamber } from "@/features/chamber";
import { DateRangePreset, PrescriptionReportRow } from "@/types/reports";
import {
  useMedicalReports,
  ReportsFilterBar,
  ReportsTable,
} from "@/features/reports";

function PrescriptionsContent() {
  const { chambers } = useChamber();

  const [selectedChamberId, setSelectedChamberId] = React.useState<string>("all");
  const [selectedPreset, setSelectedPreset] = React.useState<DateRangePreset>("last30days");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  const {
    data: prescriptions,
    totalCount,
    totalPages,
    isLoading,
    refresh,
  } = useMedicalReports<PrescriptionReportRow>({
    reportType: "prescriptions",
    chamberId: selectedChamberId,
    preset: selectedPreset,
    startDate: selectedPreset === "custom" ? startDate : undefined,
    endDate: selectedPreset === "custom" ? endDate : undefined,
    searchQuery,
    page,
    pageSize: 25,
  });

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const query = new URLSearchParams({
        type: "prescriptions",
        chamberId: selectedChamberId,
        preset: selectedPreset,
      });
      if (selectedPreset === "custom") {
        if (startDate) query.set("startDate", startDate);
        if (endDate) query.set("endDate", endDate);
      }
      if (searchQuery.trim()) query.set("searchQuery", searchQuery.trim());

      window.open(`/api/reports/export?${query.toString()}`, "_blank");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        <PageHeader
          label="PHARMACOTHERAPY REGISTRY"
          title="Prescriptions"
          description="Complete registry of finalized and draft clinical prescriptions, dosage instructions, patient instructions, and verified PDF archives."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/reports?tab=prescriptions">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#7A746F]" />
                  Analytics &amp; Graphs
                </Button>
              </Link>
              <Link href="/patients">
                <Button variant="primary" size="sm" className="h-9 gap-1.5 text-xs shadow-xs">
                  <Plus className="h-3.5 w-3.5" />
                  New Prescription
                </Button>
              </Link>
            </div>
          }
        />

        <ReportsFilterBar
          selectedChamberId={selectedChamberId}
          onChamberChange={(c) => {
            setSelectedChamberId(c);
            setPage(1);
          }}
          chambers={chambers}
          selectedPreset={selectedPreset}
          onPresetChange={(p) => {
            setSelectedPreset(p);
            setPage(1);
          }}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(1);
          }}
          searchPlaceholder="Search prescriptions by patient name, prescription ID, status..."
          onExportCsv={handleExportCsv}
          isExporting={isExporting}
          onRefresh={refresh}
          isLoading={isLoading}
        />

        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#DE4F3C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                Prescriptions Register ({totalCount} {totalCount === 1 ? "record" : "records"})
              </h3>
            </div>
          </div>

          <ReportsTable
            activeTab="prescriptions"
            onTabChange={() => {}}
            data={prescriptions}
            totalCount={totalCount}
            currentPage={page}
            totalPages={totalPages}
            pageSize={25}
            onPageChange={setPage}
            isLoading={isLoading}
          />
        </div>
      </PageContainer>
    </AdminShell>
  );
}

export default function PrescriptionsPage() {
  return (
    <React.Suspense
      fallback={
        <AdminShell>
          <PageContainer className="space-y-6">
            <PageHeader
              label="PHARMACOTHERAPY REGISTRY"
              title="Prescriptions"
              description="Loading prescriptions registry..."
            />
          </PageContainer>
        </AdminShell>
      }
    >
      <PrescriptionsContent />
    </React.Suspense>
  );
}
