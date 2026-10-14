"use client";

import * as React from "react";
import { CalendarClock, AlertCircle, Loader2 } from "lucide-react";
import { FollowUp, RescheduleFollowUpDTO } from "@/types/follow-up";
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
import { Label } from "@/components/ui/label";

export interface RescheduleFollowUpDialogProps {
  isOpen: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onReschedule: (id: string, dto: RescheduleFollowUpDTO) => Promise<void>;
}

export function RescheduleFollowUpDialog({
  isOpen,
  followUp,
  onClose,
  onReschedule,
}: RescheduleFollowUpDialogProps) {
  const [newDate, setNewDate] = React.useState<string>("");
  const [reason, setReason] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (followUp) {
      setNewDate(followUp.scheduledDate);
      setReason("");
      setError(null);
    }
  }, [followUp]);

  if (!followUp) return null;

  const formattedCurrentDate = new Date(
    followUp.scheduledDate + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setError("Please pick a new follow-up date.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onReschedule(followUp.id, {
        scheduledDate: newDate,
        reason: reason.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to reschedule follow-up appointment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <CalendarClock className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Reschedule
            </span>
          </div>
          <ModalTitle>Reschedule Follow-up</ModalTitle>
          <ModalDescription>
            Change the scheduled follow-up date for this patient.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] p-3 text-xs space-y-1">
            <div className="text-[#7A746F]">Currently Scheduled:</div>
            <div className="font-semibold text-[#201C1A]">
              {formattedCurrentDate}
            </div>
            {followUp.reason && (
              <div className="text-[#7A746F] text-[11px] pt-1 border-t border-[#EAE3D9]/60">
                Reason: {followUp.reason}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="newDate" className="text-xs font-semibold text-[#201C1A]">
              New Scheduled Date <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="newDate"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="rescheduleReason" className="text-xs font-semibold text-[#201C1A]">
              Reason for Rescheduling
            </Label>
            <Input
              id="rescheduleReason"
              placeholder="e.g. Patient travel, delayed lab reports, chamber closed"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
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
                <span>Updating...</span>
              </>
            ) : (
              <span>Confirm New Date</span>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
