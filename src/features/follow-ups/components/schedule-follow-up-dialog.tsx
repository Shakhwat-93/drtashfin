"use client";

import * as React from "react";
import { Calendar, CalendarClock, AlertCircle, Loader2 } from "lucide-react";
import { Patient } from "@/types/patient";
import { CreateFollowUpDTO, FollowUpPriority } from "@/types/follow-up";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface ScheduleFollowUpDialogProps {
  isOpen: boolean;
  patient: Patient;
  originatingConsultationId?: string;
  onClose: () => void;
  onSchedule: (dto: CreateFollowUpDTO) => Promise<void>;
}

export function ScheduleFollowUpDialog({
  isOpen,
  patient,
  originatingConsultationId,
  onClose,
  onSchedule,
}: ScheduleFollowUpDialogProps) {
  // Set default to 7 days from today
  const defaultDate = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  const [scheduledDate, setScheduledDate] = React.useState<string>(defaultDate);
  const [reason, setReason] = React.useState<string>("");
  const [priority, setPriority] = React.useState<FollowUpPriority>("routine");
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Quick preset helper
  const setPresetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setScheduledDate(d.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      setError("Please select a scheduled follow-up date.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSchedule({
        patientId: patient.patientId,
        chamberId: patient.chamberId,
        originatingConsultationId,
        scheduledDate,
        reason: reason.trim() || undefined,
        priority,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to schedule follow-up appointment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center gap-2 text-[#DE4F3C] mb-1">
            <CalendarClock className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Clinical Follow-up
            </span>
          </div>
          <ModalTitle>Schedule Follow-up</ModalTitle>
          <ModalDescription>
            Schedule a follow-up appointment for {patient.name} ({patient.patientId}).
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Date Presets */}
          <div>
            <Label className="text-xs text-[#7A746F] mb-1.5 block">
              Quick Timing Presets
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "+3 Days", days: 3 },
                { label: "+1 Week", days: 7 },
                { label: "+2 Weeks", days: 14 },
                { label: "+1 Month", days: 30 },
                { label: "+3 Months", days: 90 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setPresetDays(preset.days)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-[#EAE3D9] bg-[#FAF5EE]/60 hover:bg-[#FAF5EE] text-[#201C1A] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Follow-up Date */}
          <div>
            <Label htmlFor="scheduledDate" className="text-xs font-semibold text-[#201C1A]">
              Scheduled Date <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="scheduledDate"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority" className="text-xs font-semibold text-[#201C1A]">
              Priority
            </Label>
            <Select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value as FollowUpPriority)}
              className="mt-1"
            >
              <option value="routine">Routine Check-up</option>
              <option value="review">Treatment Review</option>
              <option value="urgent">Urgent / Close Monitoring</option>
            </Select>
          </div>

          {/* Reason */}
          <div>
            <Label htmlFor="reason" className="text-xs font-semibold text-[#201C1A]">
              Clinical Reason for Follow-up
            </Label>
            <Input
              id="reason"
              placeholder="e.g. Evaluate drug response, review repeat EEG / labs"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Instructions / Notes */}
          <div>
            <Label htmlFor="notes" className="text-xs font-semibold text-[#201C1A]">
              Doctor Notes & Instructions for Patient
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. Bring updated seizure diary, fasting lipid panel before visit"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 min-h-[70px]"
            />
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <>
                <Calendar className="h-3.5 w-3.5" />
                <span>Confirm Follow-up</span>
              </>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
