"use client";

import * as React from "react";
import { PatientDischarge } from "@/types/discharge";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, History, ShieldCheck } from "lucide-react";

export interface DischargeAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  discharge: PatientDischarge | null;
  onSuccess: () => void;
}

export function DischargeAmendmentModal({
  isOpen,
  onClose,
  discharge,
  onSuccess,
}: DischargeAmendmentModalProps) {
  const [amendmentNotes, setAmendmentNotes] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setAmendmentNotes("");
    setError(null);
  }, [isOpen, discharge]);

  if (!discharge) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!amendmentNotes.trim()) {
      setError("Please describe the amendment or clinical correction.");
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch(`/api/discharges/${discharge.id}/amend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amendmentNotes: amendmentNotes.trim(),
          amendedBy: "Dr. Tashfin",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to append amendment");
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to append amendment";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <div className="w-full">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9]">
              <History className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle className="text-base font-bold text-[#201C1A]">
                Clinical Amendment to Finalized Report
              </ModalTitle>
              <ModalDescription className="text-xs text-[#7A746F]">
                Add an auditable clinical correction or post-discharge update.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-3.5 px-6 py-4 text-xs">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="h-4 w-4 text-amber-700" />
                <span>Immutable Finalized Report Protection</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                The original finalized report for <strong>{discharge.dischargeDate}</strong> cannot be altered or deleted. Your amendment will be recorded with your clinician credentials and a permanent audit timestamp.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Amendment Details & Clinical Rationale <span className="text-rose-500">*</span>
              </label>
              <Textarea
                required
                rows={4}
                placeholder="e.g. Histopathology report received post-discharge confirming benign pathology; wound culture sensitivity added; medication dosage adjusted..."
                value={amendmentNotes}
                onChange={(e) => setAmendmentNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </ModalBody>

          <ModalFooter className="flex items-center justify-between px-6 py-3 border-t border-[#EAE3D9]">
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
              <History className="h-3.5 w-3.5" />
              <span>{isSubmitting ? "Saving..." : "Record Amendment"}</span>
            </Button>
          </ModalFooter>
        </form>
      </div>
    </Modal>
  );
}
