"use client";

import * as React from "react";
import { AlertTriangle, AlertCircle, Loader2 } from "lucide-react";
import { FollowUp, CancelFollowUpDTO } from "@/types/follow-up";
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

export interface CancelFollowUpDialogProps {
  isOpen: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onCancelConfirm: (id: string, dto: CancelFollowUpDTO) => Promise<void>;
}

export function CancelFollowUpDialog({
  isOpen,
  followUp,
  onClose,
  onCancelConfirm,
}: CancelFollowUpDialogProps) {
  const [reason, setReason] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (followUp) {
      setReason("");
      setError(null);
    }
  }, [followUp]);

  if (!followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please provide a cancellation reason.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onCancelConfirm(followUp.id, {
        cancellationReason: trimmed,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel follow-up appointment."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center gap-2 text-rose-600 mb-1">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Cancel Appointment
            </span>
          </div>
          <ModalTitle>Cancel Follow-up</ModalTitle>
          <ModalDescription>
            Are you sure you want to cancel this scheduled follow-up? Historical records will retain this entry with the specified reason.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <Label htmlFor="cancelReason" className="text-xs font-semibold text-[#201C1A]">
              Reason for Cancellation
            </Label>
            <Input
              id="cancelReason"
              placeholder="e.g. Patient fully recovered, moved abroad, or referred to surgery"
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
            Keep Follow-up
          </Button>
          <Button
            type="submit"
            variant="danger"
            size="sm"
            disabled={isSubmitting}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <span>Confirm Cancellation</span>
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
