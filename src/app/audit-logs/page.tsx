"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  MessageSquare,
  Lock,
  FileCheck2,
  FileSpreadsheet,
  Settings,
  Server,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader, Button, Badge } from "@/components/ui";
import { useChamber } from "@/features/chamber";
import { DateRangePreset, SmsDeliveryReportRow } from "@/types/reports";
import {
  useMedicalReports,
  ReportsFilterBar,
  ReportsTable,
} from "@/features/reports";
import { cn } from "@/lib/utils";

function AuditLogsContent() {
  const { chambers } = useChamber();

  const [activeTab, setActiveTab] = React.useState<"sms" | "integrity" | "security">("sms");
  const [selectedChamberId, setSelectedChamberId] = React.useState<string>("all");
  const [selectedPreset, setSelectedPreset] = React.useState<DateRangePreset>("last30days");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [page, setPage] = React.useState<number>(1);
  const [isExporting, setIsExporting] = React.useState<boolean>(false);

  const {
    data: smsLogs,
    totalCount,
    totalPages,
    isLoading,
    refresh,
  } = useMedicalReports<SmsDeliveryReportRow>({
    reportType: "sms-delivery",
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
        type: "sms-delivery",
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
          label="SECURITY &amp; COMPLIANCE"
          title="System Audit Logs"
          description="Tamper-evident clinical audit trails, SMS transmission logs, authenticated clinician session monitoring, and record finalization integrity verification."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/reports?tab=sms-delivery">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#7A746F]" />
                  Reports View
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                  <Settings className="h-3.5 w-3.5 text-[#7A746F]" />
                  Security Settings
                </Button>
              </Link>
            </div>
          }
        />

        {/* Audit Category Tabs */}
        <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("sms")}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "sms"
                ? "bg-[#DE4F3C] text-white shadow-xs"
                : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:text-[#201C1A]"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            SMS Transmission Audit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("integrity")}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "integrity"
                ? "bg-[#DE4F3C] text-white shadow-xs"
                : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:text-[#201C1A]"
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            Clinical Record Integrity Ledger
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("security")}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
              activeTab === "security"
                ? "bg-[#DE4F3C] text-white shadow-xs"
                : "bg-white text-[#7A746F] border border-[#EAE3D9] hover:text-[#201C1A]"
            )}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Security &amp; RLS Status
          </button>
        </div>

        {activeTab === "sms" && (
          <div className="space-y-4">
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
              searchPlaceholder="Search SMS logs by masked phone, patient code, status..."
              onExportCsv={handleExportCsv}
              isExporting={isExporting}
              onRefresh={refresh}
              isLoading={isLoading}
            />

            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-[#DE4F3C]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                    SMS Gateway Dispatches ({totalCount} dispatches logged)
                  </h3>
                </div>
              </div>

              <ReportsTable
                activeTab="sms-delivery"
                onTabChange={() => {}}
                data={smsLogs}
                totalCount={totalCount}
                currentPage={page}
                totalPages={totalPages}
                pageSize={25}
                onPageChange={setPage}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}

        {activeTab === "integrity" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#EAE3D9] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#DE4F3C]">
                <FileCheck2 className="h-5 w-5" />
                <h4 className="font-serif font-bold text-sm text-[#201C1A]">
                  Prescription Tamper-Evidence
                </h4>
              </div>
              <p className="text-xs text-[#7A746F] leading-relaxed">
                Finalized clinical prescriptions are locked at the PostgreSQL database level via
                ROW LEVEL TRIGGER <code className="bg-[#FAF5EE] px-1 py-0.5 rounded font-mono text-[11px]">trg_prevent_finalized_prescription_update</code>.
                Any direct SQL update on medications, dosages, or advice is rejected by server constraints.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="success" className="text-[10px]">
                  Enforced at Database Layer
                </Badge>
                <Badge variant="neutral" className="text-[10px]">
                  SHA-256 PDF Verification
                </Badge>
              </div>
            </div>

            <div className="rounded-xl border border-[#EAE3D9] bg-white p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#DE4F3C]">
                <Lock className="h-5 w-5" />
                <h4 className="font-serif font-bold text-sm text-[#201C1A]">
                  Discharge Summary Finalization &amp; Amendments
                </h4>
              </div>
              <p className="text-xs text-[#7A746F] leading-relaxed">
                Hospital discharge reports follow strict medical legal integrity standards. Once finalized,
                the core summary cannot be modified or deleted. Post-discharge observations and corrections
                are stored exclusively as timestamped append-only clinical amendments.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <Badge variant="success" className="text-[10px]">
                  Append-Only Amendments
                </Badge>
                <Badge variant="neutral" className="text-[10px]">
                  Non-Destructive Deletion Policy
                </Badge>
              </div>
            </div>
          </div>
        )}

        {activeTab === "security" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#EAE3D9] bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-3">
                <ShieldCheck className="h-4 w-4 text-[#DE4F3C]" />
                <h4 className="font-serif font-bold text-sm text-[#201C1A]">
                  Active Security Controls &amp; Compliance Audit
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Row-Level Security (RLS)
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Active on all 15 clinical tables with <code className="font-mono">is_authorized_doctor()</code> check.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                    <KeyRound className="h-4 w-4 text-emerald-600" />
                    GoTrue Session Authentication
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    Strict HTTP-only cookie tokens with automatic rotation and CSRF protection.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-semibold text-xs">
                    <Server className="h-4 w-4 text-emerald-600" />
                    Security Headers &amp; TLS 1.3
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: SAMEORIGIN enforced.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </AdminShell>
  );
}

export default function AuditLogsPage() {
  return (
    <React.Suspense
      fallback={
        <AdminShell>
          <PageContainer className="space-y-6">
            <PageHeader
              label="SECURITY &amp; COMPLIANCE"
              title="System Audit Logs"
              description="Loading audit logs..."
            />
          </PageContainer>
        </AdminShell>
      }
    >
      <AuditLogsContent />
    </React.Suspense>
  );
}
