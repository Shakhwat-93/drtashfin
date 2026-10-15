"use client";

import * as React from "react";
import { BarChart3 } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui";
import { useChamber } from "@/features/chamber";
import { DateRangePreset, ReportType } from "@/types/reports";
import {
  useClinicalDashboard,
  useMedicalReports,
  ReportsFilterBar,
  DashboardKpiGrid,
  ClinicalActivityChart,
  DistributionCards,
  ReportsTable,
} from "@/features/reports";

export default function MedicalReportsPage() {
  const { chambers } = useChamber();

  // Filters State
  const [selectedChamberId, setSelectedChamberId] = React.useState<string>("all");
  const [selectedPreset, setSelectedPreset] = React.useState<DateRangePreset>("last30days");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Table State
  const [activeTab, setActiveTab] = React.useState<ReportType>("patient-activity");
  const [page, setPage] = React.useState<number>(1);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  // When changing filters or tab, reset to page 1
  const handleChamberChange = (chamberId: string) => {
    setSelectedChamberId(chamberId);
    setPage(1);
  };

  const handlePresetChange = (preset: DateRangePreset) => {
    setSelectedPreset(preset);
    setPage(1);
  };

  const handleTabChange = (tab: ReportType) => {
    setActiveTab(tab);
    setPage(1);
    setSearchQuery("");
  };

  // 1. Fetch Dashboard Metrics & Aggregations
  const {
    data: dashboardData,
    isLoading: isDashboardLoading,
    refresh: refreshDashboard,
  } = useClinicalDashboard({
    chamberId: selectedChamberId,
    preset: selectedPreset,
    startDate: selectedPreset === "custom" ? startDate : undefined,
    endDate: selectedPreset === "custom" ? endDate : undefined,
  });

  // 2. Fetch Detailed Paginated Report Data
  const {
    data: reportRows,
    totalCount,
    totalPages,
    isLoading: isTableLoading,
    refresh: refreshTable,
  } = useMedicalReports({
    reportType: activeTab,
    chamberId: selectedChamberId,
    preset: selectedPreset,
    startDate: selectedPreset === "custom" ? startDate : undefined,
    endDate: selectedPreset === "custom" ? endDate : undefined,
    searchQuery,
    page,
    pageSize: 25,
  });

  const handleRefresh = () => {
    refreshDashboard();
    refreshTable();
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const query = new URLSearchParams({
        type: activeTab,
        chamberId: selectedChamberId,
        preset: selectedPreset,
      });
      if (selectedPreset === "custom") {
        if (startDate) query.set("startDate", startDate);
        if (endDate) query.set("endDate", endDate);
      }
      if (searchQuery.trim()) query.set("searchQuery", searchQuery.trim());

      const url = `/api/reports/export?${query.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to generate CSV export (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("Content-Disposition");
      let filename = `${activeTab}-report.csv`;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const matches = contentDisposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) filename = matches[1];
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch {
      // Gracefully handle error without window.alert
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Header */}
        <PageHeader
          label="ANALYTICS & REPORTING"
          title="Clinical Dashboard & Medical Reports"
          description="Chamber-aware practice statistics, patient compliance, procedure outcomes, and verified exportable records."
        />

        {/* Filters & Export Bar */}
        <ReportsFilterBar
          chambers={chambers}
          selectedChamberId={selectedChamberId}
          onChamberChange={handleChamberChange}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={`Search within ${activeTab.replace("-", " ")} records...`}
          onExportCsv={handleExportCsv}
          isExporting={isExporting}
          onRefresh={handleRefresh}
          isLoading={isDashboardLoading || isTableLoading}
        />

        {/* Visual Analytics Grid */}
        <DashboardKpiGrid data={dashboardData} isLoading={isDashboardLoading} />

        {/* Daily Activity Chart & Distribution Cards */}
        {dashboardData && (
          <div className="space-y-6">
            <ClinicalActivityChart trends={dashboardData.dailyTrends || dashboardData.trends || []} />
            <DistributionCards data={dashboardData} />
          </div>
        )}

        {/* Detailed Medical Records Table */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-[#DE4F3C]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
              Detailed Clinical Records & Registries
            </h3>
          </div>

          <ReportsTable
            activeTab={activeTab}
            onTabChange={handleTabChange}
            data={reportRows}
            totalCount={totalCount}
            currentPage={page}
            totalPages={totalPages}
            pageSize={25}
            onPageChange={setPage}
            isLoading={isTableLoading}
          />
        </div>
      </PageContainer>
    </AdminShell>
  );
}
