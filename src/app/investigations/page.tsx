"use client";

import * as React from "react";
import Link from "next/link";
import { FlaskConical, Plus, FileSpreadsheet } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader, Button } from "@/components/ui";
import { useChamber } from "@/features/chamber";
import { DateRangePreset, DiagnosticProcedureReportRow } from "@/types/reports";
import {
  useMedicalReports,
  ReportsFilterBar,
  ReportsTable,
} from "@/features/reports";

function InvestigationsContent() {
  const { chambers } = useChamber();

  const [selectedChamberId, setSelectedChamberId] = React.useState<string>("all");
  const [selectedPreset, setSelectedPreset] = React.useState<DateRangePreset>("last30days");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  const {
    data: reports,
    totalCount,
    totalPages,
    isLoading,
    refresh,
  } = useMedicalReports<DiagnosticProcedureReportRow>({
    reportType: "diagnostics-procedures",
    recordType: "diagnostic",
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
        type: "diagnostics-procedures",
        recordType: "diagnostic",
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
          label="DIAGNOSTIC TEST REGISTRY"
          title="Diagnostic Investigations"
          description="Centralized medical repository for laboratory test results, pathology, radiology, imaging scans, and Google Drive diagnostic evidence."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/reports?tab=diagnostics-procedures">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#7A746F]" />
                  Analytics &amp; Graphs
                </Button>
              </Link>
              <Link href="/patients">
                <Button variant="primary" size="sm" className="h-9 gap-1.5 text-xs shadow-xs">
                  <Plus className="h-3.5 w-3.5" />
                  Upload / Link Test
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
          searchPlaceholder="Search investigations by test name, category, diagnostic center..."
          onExportCsv={handleExportCsv}
          isExporting={isExporting}
          onRefresh={refresh}
          isLoading={isLoading}
        />

        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-[#DE4F3C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                Diagnostic Test Reports ({totalCount} {totalCount === 1 ? "report" : "reports"})
              </h3>
            </div>
          </div>

          <ReportsTable
            activeTab="diagnostics-procedures"
            onTabChange={() => {}}
            data={reports}
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

export default function InvestigationsPage() {
  return (
    <React.Suspense
      fallback={
        <AdminShell>
          <PageContainer className="space-y-6">
            <PageHeader
              label="DIAGNOSTIC TEST REGISTRY"
              title="Diagnostic Investigations"
              description="Loading diagnostic investigations..."
            />
          </PageContainer>
        </AdminShell>
      }
    >
      <InvestigationsContent />
    </React.Suspense>
  );
}
