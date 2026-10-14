"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarClock,
  User,
  Building2,
  Clock,
  FileText,
  Stethoscope,
  CheckCircle2,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { FollowUp } from "@/types/follow-up";
import { SmsReminder } from "@/types/sms";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Badge,
  Button,
} from "@/components/ui";
import { formatDisplayDate, formatAppointmentTime, isOverdueInClinic, isTodayInClinic } from "@/lib/date-utils";
import { RescheduleFollowUpDialog } from "@/features/follow-ups/components/reschedule-follow-up-dialog";
import { CancelFollowUpDialog } from "@/features/follow-ups/components/cancel-follow-up-dialog";
import { CompleteFollowUpDialog } from "@/features/follow-ups/components/complete-follow-up-dialog";
import { getFollowUpRepository } from "@/lib/data";

export interface FollowUpDetailModalProps {
  followUp: FollowUp | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export function FollowUpDetailModal({
  followUp,
  isOpen,
  onClose,
  onUpdated,
}: FollowUpDetailModalProps) {
  const [rescheduleTarget, setRescheduleTarget] = React.useState<FollowUp | null>(null);
  const [cancelTarget, setCancelTarget] = React.useState<FollowUp | null>(null);
  const [completeTarget, setCompleteTarget] = React.useState<FollowUp | null>(null);
  const [smsReminders, setSmsReminders] = React.useState<SmsReminder[]>([]);

  React.useEffect(() => {
    if (!followUp?.id) {
      setSmsReminders([]);
      return;
    }
    let isCancelled = false;
    fetch(`/api/sms/reminders?followUpId=${followUp.id}`)
      .then((res) => (res.ok ? res.json() : { reminders: [] }))
      .then((data) => {
        if (!isCancelled) {
          setSmsReminders(data.reminders || []);
        }
      })
      .catch(() => {
        if (!isCancelled) setSmsReminders([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [followUp?.id]);

  if (!followUp) return null;

  const targetPatient = followUp.patientCode || followUp.patientId;
  const isOverdue = followUp.status === "scheduled" && isOverdueInClinic(followUp.scheduledDate);
  const isToday = followUp.status === "scheduled" && isTodayInClinic(followUp.scheduledDate);
  const timeStr = formatAppointmentTime(followUp.scheduledTime);

  const handleRescheduleConfirm = async (id: string, data: { scheduledDate: string; scheduledTime?: string; reason?: string }) => {
    const repo = getFollowUpRepository();
    await repo.rescheduleFollowUp(id, data);
    setRescheduleTarget(null);
    onUpdated?.();
    onClose();
  };

  const handleCancelConfirm = async (id: string, data: { cancellationReason: string }) => {
    const repo = getFollowUpRepository();
    await repo.cancelFollowUp(id, data);
    setCancelTarget(null);
    onUpdated?.();
    onClose();
  };

  const handleCompleteConfirm = async (id: string, data: { clinicalOutcome: "improved" | "unchanged" | "worsened"; outcomeNotes?: string }) => {
    const repo = getFollowUpRepository();
    await repo.completeFollowUp(id, data);
    setCompleteTarget(null);
    onUpdated?.();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
        <ModalHeader>
          <div className="flex items-center justify-between w-full pr-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[#DE4F3C]" />
              <div>
                <ModalTitle>Follow-up Appointment Details</ModalTitle>
                <ModalDescription>
                  Clinical appointment details and actions
                </ModalDescription>
              </div>
            </div>
            <Badge
              variant={
                followUp.status === "completed"
                  ? "success"
                  : followUp.status === "cancelled"
                  ? "neutral"
                  : isOverdue
                  ? "danger"
                  : isToday
                  ? "warning"
                  : "info"
              }
              className="capitalize"
            >
              {isOverdue ? "Overdue" : isToday ? "Due Today" : followUp.status}
            </Badge>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {/* Patient Card */}
          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE]/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-[#EAE3D9] text-[#DE4F3C]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-serif text-sm font-semibold text-[#201C1A]">
                  {followUp.patientName || "Unrecorded Patient"}
                </h4>
                <div className="flex items-center gap-2 text-xs text-[#7A746F]">
                  {followUp.patientCode && (
                    <span className="font-mono font-medium text-[#201C1A]">
                      {followUp.patientCode}
                    </span>
                  )}
                  {followUp.patientPhone && (
                    <>
                      <span>•</span>
                      <span>{followUp.patientPhone}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Link href={`/patients/${targetPatient}`}>
              <Button variant="outline" size="sm">
                Open File
              </Button>
            </Link>
          </div>

          {/* Appointment Timing & Chamber Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-[#EAE3D9] bg-white space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
                Scheduled Date & Time
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#201C1A]">
                <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
                <span>{formatDisplayDate(followUp.scheduledDate)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#7A746F]">
                <Clock className="h-3 w-3" />
                <span>{timeStr || "Time not specified"}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#EAE3D9] bg-white space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
                Location & Chamber
              </span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#201C1A]">
                <Building2 className="h-3.5 w-3.5 text-[#7A746F]" />
                <span>{followUp.chamberName || "Main Chamber"}</span>
              </div>
              {followUp.priority && (
                <div className="flex items-center gap-1 pt-0.5">
                  <Badge
                    variant={
                      followUp.priority === "urgent"
                        ? "danger"
                        : followUp.priority === "high"
                        ? "warning"
                        : "neutral"
                    }
                    size="sm"
                    className="capitalize text-[10px]"
                  >
                    {followUp.priority} Priority
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Reason & Clinical Notes */}
          <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-white space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#201C1A]">
              <FileText className="h-4 w-4 text-[#DE4F3C]" />
              <span>Clinical Reason for Follow-up</span>
            </div>
            <p className="text-xs text-[#59534E] leading-relaxed">
              {followUp.reason}
            </p>

            {followUp.notes && (
              <div className="mt-2 pt-2 border-t border-[#EAE3D9]/60">
                <span className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
                  Doctor&apos;s Instructions / Notes:
                </span>
                <p className="text-xs text-[#7A746F] italic mt-0.5">
                  &ldquo;{followUp.notes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Completed Outcome or Cancellation Status */}
          {followUp.status === "completed" && (
            <div className="p-3.5 rounded-xl border border-[#D1EAD8] bg-[#EBF5EE] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1F6B38]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Clinical Outcome: {followUp.clinicalOutcome || "Recorded"}</span>
              </div>
              {followUp.outcomeNotes && (
                <p className="text-xs text-[#1F6B38]/90 leading-relaxed">
                  {followUp.outcomeNotes}
                </p>
              )}
            </div>
          )}

          {followUp.status === "cancelled" && followUp.cancellationReason && (
            <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-[#FAF5EE] space-y-1">
              <span className="text-xs font-semibold text-[#7A746F]">
                Cancellation Reason:
              </span>
              <p className="text-xs text-[#59534E] leading-relaxed">
                {followUp.cancellationReason}
              </p>
            </div>
          )}

          {/* SMS Follow-up Reminder Details */}
          {smsReminders.length > 0 && (
            <div className="p-3.5 rounded-xl border border-[#EAE3D9] bg-white space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#201C1A]">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4 text-[#DE4F3C]" />
                  <span>Automated SMS Follow-up Reminders</span>
                </div>
                <span className="text-[11px] text-[#7A746F] font-mono">
                  {smsReminders.length} reminder{smsReminders.length > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-1.5 pt-1">
                {smsReminders.map((rem) => {
                  const isSent = rem.status === "sent";
                  const isFailed = rem.status === "failed";
                  const isSkipped = rem.status === "skipped";

                  return (
                    <div
                      key={rem.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#FAF5EE] text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="neutral"
                          className="text-[10px] uppercase font-bold tracking-wider shrink-0 bg-white"
                        >
                          {rem.reminderType.replace("_", " ")}
                        </Badge>
                        <span className="text-[11px] text-[#59534E] truncate">
                          {rem.recipientPhoneMasked || rem.recipientPhone} &bull; Target:{" "}
                          {new Date(rem.scheduledFor).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <Badge
                        variant={isSent ? "success" : isFailed ? "danger" : isSkipped ? "warning" : "info"}
                        className="text-[10px]"
                      >
                        {rem.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {followUp.status === "scheduled" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRescheduleTarget(followUp)}
                >
                  Reschedule
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#DE4F3C] hover:bg-[#FDF0EE]"
                  onClick={() => setCancelTarget(followUp)}
                >
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCompleteTarget(followUp)}
                >
                  Complete
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/patients/${targetPatient}/consultations/new?isFollowUp=true&originatingConsultationId=${followUp.id}`}
            >
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Stethoscope className="h-4 w-4" />}
              >
                Record Visit
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Action Dialogs */}
      {rescheduleTarget && (
        <RescheduleFollowUpDialog
          followUp={rescheduleTarget}
          isOpen={true}
          onClose={() => setRescheduleTarget(null)}
          onReschedule={handleRescheduleConfirm}
        />
      )}

      {cancelTarget && (
        <CancelFollowUpDialog
          followUp={cancelTarget}
          isOpen={true}
          onClose={() => setCancelTarget(null)}
          onCancelConfirm={handleCancelConfirm}
        />
      )}

      {completeTarget && (
        <CompleteFollowUpDialog
          followUp={completeTarget}
          isOpen={true}
          onClose={() => setCompleteTarget(null)}
          onComplete={handleCompleteConfirm}
        />
      )}
    </>
  );
}
