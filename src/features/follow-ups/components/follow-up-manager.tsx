"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  TrendingUp,
  Minus,
  TrendingDown,
} from "lucide-react";
import { Patient } from "@/types/patient";
import { FollowUp, ClinicalOutcome } from "@/types/follow-up";
import { useFollowUps } from "../hooks/use-follow-ups";
import { ScheduleFollowUpDialog } from "./schedule-follow-up-dialog";
import { RescheduleFollowUpDialog } from "./reschedule-follow-up-dialog";
import { CancelFollowUpDialog } from "./cancel-follow-up-dialog";
import { CompleteFollowUpDialog } from "./complete-follow-up-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface FollowUpManagerProps {
  patient: Patient;
  className?: string;
}

type TabFilter = "upcoming" | "overdue" | "completed" | "cancelled" | "all";

export function FollowUpManager({ patient, className }: FollowUpManagerProps) {
  const router = useRouter();
  const {
    followUps,
    upcomingFollowUps,
    overdueFollowUps,
    completedFollowUps,
    cancelledFollowUps,
    isLoading,
    error,
    refresh,
    scheduleFollowUp,
    rescheduleFollowUp,
    cancelFollowUp,
    completeFollowUp,
  } = useFollowUps(patient.patientId);

  const [activeTab, setActiveTab] = React.useState<TabFilter>("upcoming");

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(false);
  const [rescheduleTarget, setRescheduleTarget] = React.useState<FollowUp | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<FollowUp | null>(null);
  const [completeTarget, setCompleteTarget] = React.useState<FollowUp | null>(null);

  const handleStartConsultation = (f: FollowUp) => {
    router.push(
      `/patients/${patient.patientId}/consultations/new?isFollowUp=true&originatingConsultationId=${
        f.originatingConsultationId || ""
      }`
    );
  };

  const getFilteredList = (): FollowUp[] => {
    switch (activeTab) {
      case "upcoming":
        return upcomingFollowUps;
      case "overdue":
        return overdueFollowUps;
      case "completed":
        return completedFollowUps;
      case "cancelled":
        return cancelledFollowUps;
      case "all":
      default:
        return followUps;
    }
  };

  const filteredList = getFilteredList();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center pb-2">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
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
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#EAE3D9]/60">
        <div>
          <h3 className="font-serif text-base font-bold text-[#201C1A]">
            Follow-up Appointments & Outcomes
          </h3>
          <p className="text-xs text-[#7A746F]">
            Schedule and track clinical reviews, post-treatment assessments, and patient outcomes over time.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsScheduleOpen(true)}
          className="gap-1.5 text-xs h-8 shrink-0 self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Schedule Follow-up</span>
        </Button>
      </div>

      {/* Tab Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("upcoming")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeTab === "upcoming"
              ? "bg-[#201C1A] text-white shadow-xs"
              : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] hover:bg-[#EAE3D9]/60"
          )}
        >
          <span>Upcoming</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              activeTab === "upcoming"
                ? "bg-white/20 text-white"
                : "bg-[#EAE3D9] text-[#201C1A]"
            )}
          >
            {upcomingFollowUps.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("overdue")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeTab === "overdue"
              ? "bg-rose-700 text-white shadow-xs"
              : overdueFollowUps.length > 0
              ? "bg-rose-100/70 text-rose-800 hover:bg-rose-100"
              : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] hover:bg-[#EAE3D9]/60"
          )}
        >
          <span>Overdue</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              activeTab === "overdue"
                ? "bg-white/20 text-white"
                : overdueFollowUps.length > 0
                ? "bg-rose-600 text-white"
                : "bg-[#EAE3D9] text-[#201C1A]"
            )}
          >
            {overdueFollowUps.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("completed")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeTab === "completed"
              ? "bg-emerald-700 text-white shadow-xs"
              : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] hover:bg-[#EAE3D9]/60"
          )}
        >
          <span>Completed</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              activeTab === "completed"
                ? "bg-white/20 text-white"
                : "bg-[#EAE3D9] text-[#201C1A]"
            )}
          >
            {completedFollowUps.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("cancelled")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeTab === "cancelled"
              ? "bg-[#201C1A] text-white shadow-xs"
              : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] hover:bg-[#EAE3D9]/60"
          )}
        >
          <span>Cancelled</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              activeTab === "cancelled"
                ? "bg-white/20 text-white"
                : "bg-[#EAE3D9] text-[#201C1A]"
            )}
          >
            {cancelledFollowUps.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
            activeTab === "all"
              ? "bg-[#201C1A] text-white shadow-xs"
              : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] hover:bg-[#EAE3D9]/60"
          )}
        >
          <span>All Records</span>
          <span
            className={cn(
              "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
              activeTab === "all"
                ? "bg-white/20 text-white"
                : "bg-[#EAE3D9] text-[#201C1A]"
            )}
          >
            {followUps.length}
          </span>
        </button>
      </div>

      {/* Follow-ups List */}
      {filteredList.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={
            activeTab === "upcoming"
              ? "No Upcoming Follow-ups"
              : activeTab === "overdue"
              ? "No Overdue Follow-ups"
              : activeTab === "completed"
              ? "No Completed Follow-up Records"
              : activeTab === "cancelled"
              ? "No Cancelled Follow-ups"
              : "No Follow-up Appointments Recorded"
          }
          description={
            activeTab === "upcoming"
              ? "All follow-up appointments for this patient are up to date or completed."
              : activeTab === "overdue"
              ? "Great! There are no overdue appointments requiring doctor review."
              : `Clinical review dates and long-term progress assessments will appear here.`
          }
          action={
            activeTab === "upcoming" || activeTab === "all" ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsScheduleOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Schedule Next Follow-up</span>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredList.map((f) => {
            const isOverdue = f.status === "scheduled" && f.scheduledDate < todayStr;
            const isToday = f.status === "scheduled" && f.scheduledDate === todayStr;

            const formattedDate = new Date(
              f.scheduledDate + "T00:00:00"
            ).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={f.id}
                className={cn(
                  "rounded-xl border p-4 bg-white transition-all shadow-xs",
                  isOverdue
                    ? "border-rose-300 bg-rose-50/20"
                    : isToday
                    ? "border-amber-300 bg-amber-50/20"
                    : "border-[#EAE3D9] hover:border-[#DE4F3C]/40"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#201C1A]">
                        <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span>{formattedDate}</span>
                      </div>

                      {/* Status & Overdue Badges */}
                      {isOverdue && (
                        <Badge variant="danger" size="sm" className="font-semibold">
                          Overdue
                        </Badge>
                      )}
                      {isToday && (
                        <Badge variant="warning" size="sm" className="font-semibold">
                          Today
                        </Badge>
                      )}

                      <Badge
                        variant={
                          f.status === "completed"
                            ? "success"
                            : f.status === "cancelled"
                            ? "neutral"
                            : "info"
                        }
                        size="sm"
                        className="capitalize"
                      >
                        {f.status}
                      </Badge>

                      {/* Priority Badge */}
                      {f.priority && f.priority !== "routine" && (
                        <Badge
                          variant={f.priority === "urgent" ? "danger" : "warning"}
                          size="sm"
                          className="capitalize"
                        >
                          {f.priority}
                        </Badge>
                      )}

                      {/* Clinical Outcome Badge */}
                      {f.clinicalOutcome && (
                        <Badge
                          variant={
                            f.clinicalOutcome === "improved"
                              ? "success"
                              : f.clinicalOutcome === "worsened"
                              ? "danger"
                              : "neutral"
                          }
                          size="sm"
                          className="capitalize gap-1 font-semibold"
                        >
                          {f.clinicalOutcome === "improved" && (
                            <TrendingUp className="h-3 w-3" />
                          )}
                          {f.clinicalOutcome === "unchanged" && (
                            <Minus className="h-3 w-3" />
                          )}
                          {f.clinicalOutcome === "worsened" && (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          Outcome: {f.clinicalOutcome}
                        </Badge>
                      )}
                    </div>

                    {/* Reason */}
                    {f.reason && (
                      <p className="text-xs font-medium text-[#201C1A]">
                        {f.reason}
                      </p>
                    )}

                    {/* Instructions / Notes */}
                    {f.notes && (
                      <p className="text-[11px] text-[#7A746F] leading-relaxed">
                        Instructions: {f.notes}
                      </p>
                    )}

                    {/* Clinical Outcome Notes */}
                    {f.outcomeNotes && (
                      <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-2.5 text-[11px] text-emerald-950 mt-1">
                        <span className="font-semibold">Outcome Notes: </span>
                        <span>{f.outcomeNotes}</span>
                      </div>
                    )}

                    {/* Cancellation Reason */}
                    {f.cancellationReason && (
                      <div className="rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] p-2.5 text-[11px] text-[#7A746F] mt-1">
                        <span className="font-semibold">Cancelled: </span>
                        <span>{f.cancellationReason}</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons for Scheduled / Active Items */}
                  {f.status === "scheduled" && (
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t border-[#EAE3D9]/60 sm:border-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setCompleteTarget(f)}
                        className="h-7 px-2.5 text-xs gap-1 font-medium bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Complete</span>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRescheduleTarget(f)}
                        className="h-7 px-2.5 text-xs gap-1 text-[#7A746F] hover:text-[#201C1A]"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reschedule</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelTarget(f)}
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ScheduleFollowUpDialog
        isOpen={isScheduleOpen}
        patient={patient}
        onClose={() => setIsScheduleOpen(false)}
        onSchedule={async (dto) => {
          await scheduleFollowUp(dto);
        }}
      />

      <RescheduleFollowUpDialog
        isOpen={Boolean(rescheduleTarget)}
        followUp={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onReschedule={async (id, dto) => {
          await rescheduleFollowUp(id, dto);
        }}
      />

      <CancelFollowUpDialog
        isOpen={Boolean(cancelTarget)}
        followUp={cancelTarget}
        onClose={() => setCancelTarget(null)}
        onCancelConfirm={async (id, dto) => {
          await cancelFollowUp(id, dto);
        }}
      />

      <CompleteFollowUpDialog
        isOpen={Boolean(completeTarget)}
        followUp={completeTarget}
        onClose={() => setCompleteTarget(null)}
        onComplete={async (id, dto) => {
          await completeFollowUp(id, dto);
        }}
        onStartConsultation={handleStartConsultation}
      />
    </div>
  );
}
