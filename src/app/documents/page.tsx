"use client";

import * as React from "react";
import Link from "next/link";
import { FolderOpen, LogOut, FlaskConical, FileSpreadsheet, Users } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader, Button } from "@/components/ui";
import { useChamber } from "@/features/chamber";
import { DateRangePreset, ReportType } from "@/types/reports";
import {
  useMedicalReports,
  ReportsFilterBar,
  ReportsTable,
} from "@/features/reports";
import { cn } from "@/lib/utils";

function DocumentsContent() {
  const { chambers } = useChamber();

  const [documentType, setDocumentType] = React.useState<"diagnostics-procedures" | "discharges">("diagnostics-procedures");
  const [selectedChamberId, setSelectedChamberId] = React.useState<string>("all");
  const [selectedPreset, setSelectedPreset] = React.useState<DateRangePreset>("last30days");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  const {
    data: documentRows,
    totalCount,
    totalPages,
    isLoading,
    refresh,
  } = useMedicalReports({
    reportType: documentType,
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
        type: documentType,
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
          label="CLINICAL ARCHIVES"
          title="Documents & Evidence"
          description="Centralized medical repository for patient diagnostic test reports, hospital discharge summaries, and verified external medical documentation."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/reports">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#7A746F]" />
                  Reports Center
                </Button>
              </Link>
              <Link href="/patients">
                <Button variant="primary" size="sm" className="h-9 gap-1.5 text-xs shadow-xs">
                  <Users className="h-3.5 w-3.5" />
                  Patient Files
                </Button>
              </Link>
            </div>
          }
        />

        {/* Document Category Toggle */}
        <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-3">
          <button
            type="button"
            onClick={() => {
              setDocumentType("diagnostics-procedures");
              setPage(1);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              documentType === "diagnostics-procedures"
                ? "bg-[#DE4F3C] text-white shadow-xs"
                : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:text-[#201C1A]"
            )}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Diagnostic Reports &amp; Scans
          </button>
          <button
            type="button"
            onClick={() => {
              setDocumentType("discharges");
              setPage(1);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              documentType === "discharges"
                ? "bg-[#DE4F3C] text-white shadow-xs"
                : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:text-[#201C1A]"
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
            Hospital Discharge Summaries
          </button>
        </div>

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
          searchPlaceholder={`Search ${documentType === "discharges" ? "discharges" : "diagnostic documents"}...`}
          onExportCsv={handleExportCsv}
          isExporting={isExporting}
          onRefresh={refresh}
          isLoading={isLoading}
        />

        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#DE4F3C]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                {documentType === "discharges"
                  ? `Discharge Summaries (${totalCount} documents)`
                  : `Diagnostic & Lab Archives (${totalCount} files)`}
              </h3>
            </div>
          </div>

          <ReportsTable
            activeTab={documentType as ReportType}
            onTabChange={(t) => {
              if (t === "discharges" || t === "diagnostics-procedures") {
                setDocumentType(t);
                setPage(1);
              }
            }}
            data={documentRows}
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

export default function DocumentsPage() {
  return (
    <React.Suspense
      fallback={
        <AdminShell>
          <PageContainer className="space-y-6">
            <PageHeader
              label="CLINICAL ARCHIVES"
              title="Documents & Evidence"
              description="Loading documents archive..."
            />
          </PageContainer>
        </AdminShell>
      }
    >
      <DocumentsContent />
    </React.Suspense>
  );
}
