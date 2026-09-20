"use client";

import * as React from "react";
import Link from "next/link";
import {
  Stethoscope,
  Plus,
  Calendar,
  CalendarClock,
  Eye,
  Edit2,
} from "lucide-react";
import { Patient } from "@/types/patient";
import { useConsultations } from "../hooks/use-consultations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export interface ConsultationHistoryListProps {
  patient: Patient;
  className?: string;
}

export function ConsultationHistoryList({
  patient,
  className,
}: ConsultationHistoryListProps) {
  const { consultations, isLoading, error } = useConsultations(
    patient.patientId
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#EAE3D9] bg-white p-4 space-y-2.5 shadow-xs"
          >
            <div className="flex justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
        {error}
      </div>
    );
  }

  if (consultations.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="No Consultations Recorded Yet"
        description="Clinical examination notes, diagnoses, and treatment plans will be organized chronologically here."
        action={
          <Link href={`/patients/${patient.patientId}/consultations/new`}>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Start New Consultation</span>
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className={className}>
      {/* Top action header */}
      <div className="flex items-center justify-between pb-4">
        <div className="text-xs text-[#7A746F]">
          <span className="font-semibold text-[#201C1A]">
            {consultations.length}
          </span>{" "}
          {consultations.length === 1 ? "consultation record" : "consultation records"}
        </div>

        <Link href={`/patients/${patient.patientId}/consultations/new`}>
          <Button variant="primary" size="sm" className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>New Consultation</span>
          </Button>
        </Link>
      </div>

      {/* Consultations List */}
      <div className="space-y-3">
        {consultations.map((c) => {
          const formattedDate = new Date(
            c.consultationDate + "T00:00:00"
          ).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          const formattedFollowUp = c.nextFollowUp
            ? new Date(c.nextFollowUp + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null;

          const diagnosisSummary =
            c.provisionalDiagnosis ||
            c.chiefComplaint ||
            "Clinical consultation";

          return (
            <div
              key={c.id}
              className="rounded-xl border border-[#EAE3D9] bg-white p-4 shadow-xs hover:border-[#DE4F3C]/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#201C1A]">
                      <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
                      <span>{formattedDate}</span>
                    </div>

                    {c.consanguinity && (
                      <Badge
                        variant={c.consanguinity === "yes" ? "warning" : "neutral"}
                        size="sm"
                      >
                        Consanguinity: {c.consanguinity}
                      </Badge>
                    )}

                    {formattedFollowUp && (
                      <div className="flex items-center gap-1 text-[11px] text-[#7A746F]">
                        <CalendarClock className="h-3 w-3 text-emerald-600" />
                        <span>Next Follow-up: {formattedFollowUp}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#201C1A] font-medium line-clamp-2 leading-relaxed">
                    {diagnosisSummary}
                  </p>

                  {c.plan && (
                    <p className="text-[11px] text-[#7A746F] line-clamp-1">
                      Plan: {c.plan}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t border-[#EAE3D9]/60 sm:border-0">
                  <Link
                    href={`/patients/${patient.patientId}/consultations/${c.id}`}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-[#201C1A] hover:text-[#DE4F3C]"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>View</span>
                    </Button>
                  </Link>

                  <Link
                    href={`/patients/${patient.patientId}/consultations/${c.id}/edit`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 px-2.5 text-xs text-[#7A746F] hover:text-[#201C1A]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
