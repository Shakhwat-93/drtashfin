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
  Clock,
  Building2,
  TrendingUp,
  Minus,
  TrendingDown,
  FileText,
} from "lucide-react";
import { Patient } from "@/types/patient";
import { useConsultations } from "../hooks/use-consultations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getChamberById, getChamberByPrefix } from "@/types/chamber";
import { cn } from "@/lib/utils";

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

  // Newest consultation first
  const sortedConsultations = React.useMemo(() => {
    return [...consultations].sort((a, b) => {
      const dateA = new Date(a.consultationDate).getTime();
      const dateB = new Date(b.consultationDate).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [consultations]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#EAE3D9] bg-white p-5 space-y-3 shadow-xs"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-24" />
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

  if (sortedConsultations.length === 0) {
    return (
      <EmptyState
        icon={Stethoscope}
        title="No Consultations Recorded Yet"
        description="Clinical examination notes, diagnoses, treatment plans, and recommended follow-ups will be organized chronologically here."
        action={
          <Link href={`/patients/${patient.patientId}/consultations/new`}>
            <Button variant="primary" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Start First Consultation</span>
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className={className}>
      {/* Top action header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#EAE3D9]/60 mb-6">
        <div>
          <h3 className="font-serif text-base font-bold text-[#201C1A]">
            Chronological Consultation Timeline
          </h3>
          <p className="text-xs text-[#7A746F]">
            Showing{" "}
            <span className="font-semibold text-[#201C1A]">
              {sortedConsultations.length}
            </span>{" "}
            {sortedConsultations.length === 1 ? "clinical visit" : "clinical visits"} (newest first).
          </p>
        </div>

        <Link href={`/patients/${patient.patientId}/consultations/new`}>
          <Button variant="primary" size="sm" className="gap-1.5 h-8 text-xs">
            <Plus className="h-3.5 w-3.5" />
            <span>New Consultation</span>
          </Button>
        </Link>
      </div>

      {/* Timeline track */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2 sm:before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#EAE3D9]">
        {sortedConsultations.map((c, index) => {
          const formattedDate = new Date(
            c.consultationDate + "T00:00:00"
          ).toLocaleDateString("en-US", {
            weekday: "short",
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

          const chamber =
            getChamberById(c.chamberId) ||
            getChamberByPrefix(patient.patientId.split("-")[0]);

          const diagnosisSummary =
            c.provisionalDiagnosis ||
            c.chiefComplaint ||
            "Routine clinical consultation";

          return (
            <div key={c.id} className="relative group">
              {/* Timeline Node Bullet */}
              <div
                className={cn(
                  "absolute -left-6 sm:-left-8 top-4 h-4 w-4 rounded-full border-2 border-white shadow-xs transition-colors",
                  index === 0
                    ? "bg-[#DE4F3C] ring-4 ring-[#DE4F3C]/15"
                    : "bg-[#7A746F] group-hover:bg-[#DE4F3C]"
                )}
              />

              {/* Consultation Card */}
              <div className="rounded-xl border border-[#EAE3D9] bg-white p-5 shadow-xs hover:border-[#DE4F3C]/40 transition-all space-y-3">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#201C1A]">
                        <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span>{formattedDate}</span>
                      </div>

                      {c.consultationTime && (
                        <div className="flex items-center gap-1 text-[11px] text-[#7A746F]">
                          <Clock className="h-3 w-3 text-[#7A746F]" />
                          <span>{c.consultationTime}</span>
                        </div>
                      )}

                      {/* Chamber Badge */}
                      {chamber && (
                        <Badge variant="neutral" size="sm" className="gap-1 text-[10px]">
                          <Building2 className="h-3 w-3 text-[#7A746F]" />
                          <span>{chamber.name}</span>
                        </Badge>
                      )}

                      {/* Status Badge */}
                      {c.status && (
                        <Badge
                          variant={
                            c.status === "completed"
                              ? "success"
                              : c.status === "in-progress"
                              ? "warning"
                              : "neutral"
                          }
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {c.status}
                        </Badge>
                      )}

                      {/* Follow-up & Outcome Badge */}
                      {c.isFollowUp && (
                        <Badge
                          variant={
                            c.clinicalOutcome === "improved"
                              ? "success"
                              : c.clinicalOutcome === "worsened"
                              ? "danger"
                              : "neutral"
                          }
                          size="sm"
                          className="gap-1 text-[10px] capitalize font-semibold"
                        >
                          {c.clinicalOutcome === "improved" && (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {c.clinicalOutcome === "unchanged" && (
                            <Minus className="h-3 w-3" />
                          )}
                          {c.clinicalOutcome === "worsened" && (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>
                            {c.clinicalOutcome
                              ? `Follow-up: ${c.clinicalOutcome}`
                              : "Follow-up Visit"}
                          </span>
                        </Badge>
                      )}
                    </div>

                    {/* Diagnosis / Primary Focus */}
                    <h4 className="text-sm font-semibold text-[#201C1A] pt-0.5">
                      {diagnosisSummary}
                    </h4>
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

                {/* Progress Notes if Follow-up */}
                {c.progressNotes && (
                  <div className="rounded-lg bg-amber-50/70 border border-amber-200/70 p-2.5 text-xs text-amber-950">
                    <span className="font-semibold">Progress vs. Prior Visit: </span>
                    <span className="leading-relaxed">{c.progressNotes}</span>
                  </div>
                )}

                {/* Clinical Notes / Assessment */}
                {c.clinicalNotes && (
                  <div className="text-xs text-[#201C1A] leading-relaxed bg-[#FAF5EE]/50 rounded-lg p-2.5 border border-[#EAE3D9]/60">
                    <span className="font-semibold text-[#7A746F] block text-[11px] mb-0.5">
                      Clinical Assessment:
                    </span>
                    <span className="line-clamp-2">{c.clinicalNotes}</span>
                  </div>
                )}

                {/* Treatment Instructions / Plan */}
                {(c.treatmentInstructions || c.plan) && (
                  <div className="text-xs text-[#7A746F] flex items-start gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-[#DE4F3C] shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      <strong className="font-medium text-[#201C1A]">Treatment: </strong>
                      {c.treatmentInstructions || c.plan}
                    </span>
                  </div>
                )}

                {/* Recommended Next Follow-up */}
                {formattedFollowUp && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#FAF5EE] text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                      <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Recommended Follow-up: {formattedFollowUp}</span>
                    </div>
                    {c.followUpReason && (
                      <span className="text-[11px] text-[#7A746F]">
                        Reason: {c.followUpReason}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

