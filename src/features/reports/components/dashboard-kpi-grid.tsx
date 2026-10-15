"use client";

import * as React from "react";
import {
  Users,
  Stethoscope,
  FileText,
  CalendarClock,
  Activity,
  FlaskConical,
  MessageSquare,
  LogOut,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, CardContent, Badge, Skeleton } from "@/components/ui";
import { ClinicalDashboardData } from "@/types/reports";

export interface DashboardKpiGridProps {
  data: ClinicalDashboardData | null;
  isLoading: boolean;
}

export function DashboardKpiGrid({ data, isLoading }: DashboardKpiGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-36" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { lifetime, range, dateRange, chamberLabel } = data;

  return (
    <div className="space-y-6">
      {/* SECTION 1: Selected Period Highlights */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#DE4F3C]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
              Period Activity — {chamberLabel}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#7A746F]">
            {dateRange.startDate} to {dateRange.endDate} ({dateRange.label})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Consultations Card */}
          <Card className="hover:border-[#DFD7CB] transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A746F]">
                Consultations
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C]">
                <Stethoscope className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-4">
              <div className="text-2xl font-bold font-serif text-[#201C1A]">
                {range.consultationsCount}
              </div>
              <p className="text-xs text-[#7A746F] mt-1">
                Conducted in chosen period
              </p>
            </CardContent>
          </Card>

          {/* Prescriptions Card */}
          <Card className="hover:border-[#DFD7CB] transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A746F]">
                Prescriptions
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#201C1A]">
                <FileText className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-4">
              <div className="text-2xl font-bold font-serif text-[#201C1A]">
                {range.prescriptionsCount}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="success" className="text-[10px] py-0 px-1.5">
                  {range.finalizedPrescriptionsCount ?? range.finalizedPrescriptions} Finalized
                </Badge>
                {(range.draftPrescriptionsCount ?? 0) > 0 && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1.5">
                    {range.draftPrescriptionsCount} Draft
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Follow-ups Card */}
          <Card className="hover:border-[#DFD7CB] transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A746F]">
                Follow-ups Scheduled
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#201C1A]">
                <CalendarClock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-4">
              <div className="text-2xl font-bold font-serif text-[#201C1A]">
                {range.followUpsCount ?? (range.upcomingFollowUps + range.completedFollowUps + range.overdueFollowUps)}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge variant="neutral" className="text-[10px] py-0 px-1.5">
                  {range.pendingFollowUpsCount ?? range.upcomingFollowUps} Pending
                </Badge>
                <Badge variant="success" className="text-[10px] py-0 px-1.5">
                  {range.completedFollowUpsCount ?? range.completedFollowUps} Done
                </Badge>
                {(range.overdueFollowUpsCount ?? 0) > 0 && (
                  <Badge variant="danger" className="text-[10px] py-0 px-1.5">
                    {range.overdueFollowUpsCount} Overdue
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* New Registered Patients */}
          <Card className="hover:border-[#DFD7CB] transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A746F]">
                New Patients
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#201C1A]">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-4">
              <div className="text-2xl font-bold font-serif text-[#201C1A]">
                {range.newPatientsCount}
              </div>
              <p className="text-xs text-[#7A746F] mt-1">
                Registered during period
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Metric Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="p-3 rounded-xl border border-[#EAE3D9] bg-white flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EE] text-[#DE4F3C]">
              <FlaskConical className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs text-[#7A746F]">Diagnostic Reports</div>
              <div className="text-sm font-bold text-[#201C1A]">
                {range.diagnosticReportsCount}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[#EAE3D9] bg-white flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EE] text-[#DE4F3C]">
              <Activity className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs text-[#7A746F]">Procedures / OT</div>
              <div className="text-sm font-bold text-[#201C1A]">
                {range.proceduresCount}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[#EAE3D9] bg-white flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EE] text-[#DE4F3C]">
              <LogOut className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs text-[#7A746F]">Discharges</div>
              <div className="text-sm font-bold text-[#201C1A]">
                {range.dischargesCount}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-[#EAE3D9] bg-white flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FAF5EE] text-[#DE4F3C]">
              <MessageSquare className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-xs text-[#7A746F]">SMS Delivered</div>
              <div className="text-sm font-bold text-[#201C1A]">
                {range.smsDeliveredCount} / {range.smsSentCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Lifetime Practice Totals */}
      <div className="pt-2">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-[#DE4F3C]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
            Lifetime Practice Totals — {chamberLabel}
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/60">
            <div className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
              Total Patients
            </div>
            <div className="text-xl font-bold font-serif text-[#201C1A] mt-1">
              {lifetime.totalPatients}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/60">
            <div className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
              Consultations
            </div>
            <div className="text-xl font-bold font-serif text-[#201C1A] mt-1">
              {lifetime.totalConsultations}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/60">
            <div className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
              Prescriptions
            </div>
            <div className="text-xl font-bold font-serif text-[#201C1A] mt-1">
              {lifetime.totalPrescriptions}
            </div>
            <div className="text-[10px] text-[#7A746F] mt-0.5">
              {lifetime.totalFinalizedPrescriptions ?? lifetime.totalPrescriptions} finalized
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/60">
            <div className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
              Follow-ups
            </div>
            <div className="text-xl font-bold font-serif text-[#201C1A] mt-1">
              {lifetime.totalFollowUps ?? 0}
            </div>
            <div className="text-[10px] text-[#7A746F] mt-0.5">
              {lifetime.totalCompletedFollowUps ?? 0} completed
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/60">
            <div className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
              Procedures & OT
            </div>
            <div className="text-xl font-bold font-serif text-[#201C1A] mt-1">
              {lifetime.totalProcedures}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/60">
            <div className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
              Discharges
            </div>
            <div className="text-xl font-bold font-serif text-[#201C1A] mt-1">
              {lifetime.totalDischarges}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
