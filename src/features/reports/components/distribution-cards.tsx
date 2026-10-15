"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { ClinicalDashboardData } from "@/types/reports";

export interface DistributionCardsProps {
  data: ClinicalDashboardData | null;
}

export function DistributionCards({ data }: DistributionCardsProps) {
  if (!data) return null;

  const { range, lifetime } = data;

  // 1. Follow-up status distribution in range
  const totalFollowUps =
    range.followUpsCount ??
    (range.upcomingFollowUps + range.completedFollowUps + range.overdueFollowUps);
  const pendingCount = range.pendingFollowUpsCount ?? range.upcomingFollowUps ?? 0;
  const completedCount = range.completedFollowUpsCount ?? range.completedFollowUps ?? 0;
  const overdueCount = range.overdueFollowUpsCount ?? range.overdueFollowUps ?? 0;

  const pendingPct = totalFollowUps > 0 ? Math.round((pendingCount / totalFollowUps) * 100) : 0;
  const completedPct = totalFollowUps > 0 ? Math.round((completedCount / totalFollowUps) * 100) : 0;
  const overduePct = totalFollowUps > 0 ? Math.round((overdueCount / totalFollowUps) * 100) : 0;

  // 2. Chamber distribution from lifetime data
  const totalPatients = lifetime.totalPatients ?? 0;
  const chamberItems = Object.entries(lifetime.chamberBreakdown || {}).map(([name, count]) => ({
    name,
    count,
    pct: totalPatients > 0 ? Math.round((count / totalPatients) * 100) : 0,
  }));

  // 3. Clinical Interventions Breakdown
  const diagCount = range.diagnosticReportsCount ?? range.diagnosticReports ?? 0;
  const procCount = range.proceduresCount ?? range.procedures ?? 0;
  const disCount = range.dischargesCount ?? range.finalizedDischarges ?? 0;
  const totalInterventions = diagCount + procCount + disCount;
  const diagPct = totalInterventions > 0 ? Math.round((diagCount / totalInterventions) * 100) : 0;
  const procPct = totalInterventions > 0 ? Math.round((procCount / totalInterventions) * 100) : 0;
  const disPct = totalInterventions > 0 ? Math.round((disCount / totalInterventions) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* CARD 1: Follow-up Compliance & Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
            Follow-up Status Distribution
          </CardTitle>
          <div className="text-base font-bold text-[#201C1A]">
            {totalFollowUps} Follow-ups in Period
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7A746F]">Completed</span>
              <span className="font-semibold text-emerald-600">
                {range.completedFollowUpsCount} ({completedPct}%)
              </span>
            </div>
            <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${completedPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7A746F]">Pending / Scheduled</span>
              <span className="font-semibold text-[#201C1A]">
                {range.pendingFollowUpsCount} ({pendingPct}%)
              </span>
            </div>
            <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#201C1A] h-2 rounded-full transition-all duration-300"
                style={{ width: `${pendingPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7A746F]">Overdue</span>
              <span className="font-semibold text-[#DE4F3C]">
                {range.overdueFollowUpsCount} ({overduePct}%)
              </span>
            </div>
            <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#DE4F3C] h-2 rounded-full transition-all duration-300"
                style={{ width: `${overduePct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CARD 2: Patient Chamber Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
            Patient Base by Chamber
          </CardTitle>
          <div className="text-base font-bold text-[#201C1A]">
            {totalPatients} Total Registered Patients
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {chamberItems.length > 0 ? (
            chamberItems.map((item) => (
              <div key={item.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#7A746F] truncate max-w-[170px]">
                    {item.name}
                  </span>
                  <span className="font-semibold text-[#201C1A]">
                    {item.count} ({item.pct}%)
                  </span>
                </div>
                <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#DE4F3C] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-xs text-[#7A746F] py-4 text-center">
              No chamber distribution data available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD 3: Interventions & Procedures */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
            Clinical Interventions
          </CardTitle>
          <div className="text-base font-bold text-[#201C1A]">
            {totalInterventions} Documented in Period
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7A746F]">Diagnostic Reports</span>
              <span className="font-semibold text-[#201C1A]">
                {range.diagnosticReportsCount} ({diagPct}%)
              </span>
            </div>
            <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${diagPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7A746F]">Procedures & Surgeries</span>
              <span className="font-semibold text-[#201C1A]">
                {range.proceduresCount} ({procPct}%)
              </span>
            </div>
            <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#DE4F3C] h-2 rounded-full transition-all duration-300"
                style={{ width: `${procPct}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7A746F]">Patient Discharges</span>
              <span className="font-semibold text-[#201C1A]">
                {range.dischargesCount} ({disPct}%)
              </span>
            </div>
            <div className="w-full bg-[#EAE3D9] h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${disPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
