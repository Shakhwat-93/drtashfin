"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Stethoscope,
  Plus,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader, Button } from "@/components/ui";
import { useChamber } from "@/features/chamber";
import { DateRangePreset, ReportType } from "@/types/reports";
import {
  useMedicalReports,
  useClinicalDashboard,
  ReportsFilterBar,
  ReportsTable,
  DashboardKpiGrid,
  ClinicalActivityChart,
  DistributionCards,
} from "@/features/reports";
import { NewEncounterModal } from "@/features/consultations";

const VALID_TABS: ReportType[] = [
  "patient-activity",
  "consultations",
  "prescriptions",
  "follow-ups",
  "diagnostics-procedures",
  "diagnostic-procedures",
  "discharges",
  "sms-delivery",
];

const TAB_LABELS: Record<string, string> = {
  "patient-activity": "Patient Activity",
  "consultations": "Consultations",
  "prescriptions": "Prescriptions",
  "follow-ups": "Follow-ups",
  "diagnostics-procedures": "Diagnostics & Procedures",
  "diagnostic-procedures": "Diagnostics & Procedures",
  "discharges": "Discharges",
  "sms-delivery": "SMS Audit",
};

function ConsultationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { chambers } = useChamber();

  const tabParam = searchParams.get("tab") as ReportType | null;
  const analyticsParam = searchParams.get("analytics") === "true";

  // Active Tab state
  const [activeTab, setActiveTab] = React.useState<ReportType>(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      return tabParam === "diagnostic-procedures" ? "diagnostics-procedures" : tabParam;
    }
    return "consultations";
  });

  // Filter States
  const [selectedChamberId, setSelectedChamberId] = React.useState<string>("all");
  const [selectedPreset, setSelectedPreset] = React.useState<DateRangePreset>("last30days");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  // Analytics View toggle
  const [showAnalytics, setShowAnalytics] = React.useState<boolean>(analyticsParam);

  // New Encounter Modal
  const [isNewEncounterOpen, setIsNewEncounterOpen] = React.useState<boolean>(false);

  // Synchronize URL tab parameter if it changes
  React.useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) {
      const normalized = tabParam === "diagnostic-procedures" ? "diagnostics-procedures" : tabParam;
      setActiveTab(normalized);
    }
  }, [tabParam]);

  // Tab switching handler
  const handleTabChange = (tab: ReportType) => {
    const normalized = tab === "diagnostic-procedures" ? "diagnostics-procedures" : tab;
    setActiveTab(normalized);
    setPage(1);

    const params = new URLSearchParams(window.location.search);
    params.set("tab", normalized);
    router.replace(`/consultations?${params.toString()}`, { scroll: false });
  };

  // Chamber filter change
  const handleChamberChange = (c: string) => {
    setSelectedChamberId(c);
    setPage(1);
  };

  // Preset filter change
  const handlePresetChange = (p: DateRangePreset) => {
    setSelectedPreset(p);
    setPage(1);
  };

  // Search input change
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setPage(1);
  };

  // 1. Fetch Paginated Reports for the Active Tab
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

  // 2. Fetch Dashboard Analytics if Analytics View is Open
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

  // Unified refresh
  const handleRefresh = () => {
    refreshTable();
    if (showAnalytics) {
      refreshDashboard();
    }
  };

  // Handle successful encounter creation
  const handleEncounterSuccess = () => {
    refreshTable();
    if (showAnalytics) {
      refreshDashboard();
    }
  };

  // Export CSV handler matching current active tab and filters
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
      let filename = `${activeTab}-export.csv`;
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
    } catch (err) {
      console.error("Export CSV failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const selectedChamberObj = chambers.find((c) => c.id === selectedChamberId);

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Printable Header (Visible only when printing) */}
        <div className="hidden print:block pb-4 mb-4 border-b border-[#201C1A]">
          <h1 className="text-xl font-bold font-serif text-[#201C1A]">
            Dr. Mohammad Rubaiath Tashfin
          </h1>
          <p className="text-xs text-[#7A746F]">
            M.B.B.S., M.S. (Ortho-Surgery) — Paediatric Orthopaedic Surgeon
          </p>
          <div className="mt-2 text-xs flex flex-wrap items-center justify-between gap-2 text-[#201C1A]">
            <span>Registry: <strong>{TAB_LABELS[activeTab] || activeTab}</strong></span>
            <span>Chamber: <strong>{selectedChamberObj ? selectedChamberObj.name : "All Chambers"}</strong></span>
            <span>Date Range: <strong>{selectedPreset}</strong></span>
            <span>Total Records: <strong>{totalCount}</strong></span>
            <span>Printed: <strong>{new Date().toLocaleDateString("en-GB")}</strong></span>
          </div>
        </div>

        {/* Page Header with Real Functional Actions */}
        <PageHeader
          label="CLINICAL ENCOUNTERS &amp; MEDICAL REGISTRIES"
          title="Patient Consultations"
          description="Unified clinical register of examinations, provisional diagnoses, drug history, and management plans across all clinic chambers."
          actions={
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <Button
                variant={showAnalytics ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAnalytics((prev) => !prev)}
                className={`h-9 gap-1.5 text-xs font-semibold transition-all ${
                  showAnalytics
                    ? "bg-[#201C1A] text-white hover:bg-[#332E2B]"
                    : "text-[#201C1A] hover:bg-[#FAF5EE]"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5 text-[#DE4F3C]" />
                <span>Analytics &amp; Graphs</span>
                {showAnalytics ? (
                  <ChevronUp className="h-3 w-3 ml-0.5 text-white/70" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-0.5 text-[#7A746F]" />
                )}
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsNewEncounterOpen(true)}
                className="h-9 gap-1.5 text-xs font-semibold shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>New Encounter</span>
              </Button>
            </div>
          }
        />

        {/* Filter Bar with Chamber Selector, Date Presets, Quick Refresh, Search, Export CSV, and Print */}
        <ReportsFilterBar
          selectedChamberId={selectedChamberId}
          onChamberChange={handleChamberChange}
          chambers={chambers}
          selectedPreset={selectedPreset}
          onPresetChange={handlePresetChange}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          searchPlaceholder={`Search ${TAB_LABELS[activeTab]?.toLowerCase() || "records"} by patient, ID, diagnosis, complaint...`}
          onExportCsv={handleExportCsv}
          isExporting={isExporting}
          onRefresh={handleRefresh}
          isLoading={isTableLoading || isDashboardLoading}
        />

        {/* Integrated Analytics & Graphs Panel (Toggleable directly on the Consultations route) */}
        {showAnalytics && (
          <div className="space-y-5 sm:space-y-6 p-3.5 sm:p-5 rounded-2xl border border-[#EAE3D9] bg-[#FAF5EE]/50 animate-in fade-in slide-in-from-top-2 duration-200 print:hidden min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#EAE3D9]">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-7 w-7 shrink-0 rounded-lg bg-white border border-[#EAE3D9] flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-[#DE4F3C]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A] break-words">
                    Clinical Practice Analytics &amp; Trends
                  </h3>
                  <p className="text-[11px] text-[#7A746F] break-words">
                    Real-time aggregated metrics for {selectedChamberObj ? selectedChamberObj.name : "all clinic chambers"}.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link href="/reports?tab=consultations">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-[11px] gap-1 text-[#DE4F3C] hover:bg-[#DE4F3C]/5"
                  >
                    <span>Full Analytics Hub</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnalytics(false)}
                  className="h-7 px-2.5 text-[11px] text-[#7A746F]"
                >
                  Hide
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <DashboardKpiGrid data={dashboardData} isLoading={isDashboardLoading} />

            {/* Daily Trends & Chamber Distribution */}
            {dashboardData && (
              <div className="space-y-6 pt-2">
                <ClinicalActivityChart
                  trends={dashboardData.dailyTrends || dashboardData.trends || []}
                />
                <DistributionCards data={dashboardData} />
              </div>
            )}
          </div>
        )}

        {/* Medical Registries Table (Supports all 7 tabs seamlessly) */}
        <div className="pt-2 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <Stethoscope className="h-4 w-4 text-[#DE4F3C] shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A] break-words">
                {TAB_LABELS[activeTab] || activeTab} Registry ({totalCount} {totalCount === 1 ? "record" : "records"})
              </h3>
            </div>
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

        {/* Functional "New Encounter" Modal Workflow */}
        <NewEncounterModal
          isOpen={isNewEncounterOpen}
          onClose={() => setIsNewEncounterOpen(false)}
          onSuccess={handleEncounterSuccess}
          defaultChamberId={selectedChamberId}
          chambers={chambers}
        />
      </PageContainer>
    </AdminShell>
  );
}

export default function ConsultationsPage() {
  return (
    <React.Suspense
      fallback={
        <AdminShell>
          <PageContainer className="space-y-6">
            <PageHeader
              label="CLINICAL ENCOUNTERS"
              title="Patient Consultations"
              description="Loading consultations registry..."
            />
          </PageContainer>
        </AdminShell>
      }
    >
      <ConsultationsContent />
    </React.Suspense>
  );
}
