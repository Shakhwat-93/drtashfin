"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Loader2, TrendingUp, Minus, TrendingDown } from "lucide-react";
import { FollowUp, CompleteFollowUpDTO, ClinicalOutcome } from "@/types/follow-up";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface CompleteFollowUpDialogProps {
  isOpen: boolean;
  followUp: FollowUp | null;
  onClose: () => void;
  onComplete: (id: string, dto: CompleteFollowUpDTO) => Promise<void>;
  onStartConsultation?: (followUp: FollowUp) => void;
}

export function CompleteFollowUpDialog({
  isOpen,
  followUp,
  onClose,
  onComplete,
  onStartConsultation,
}: CompleteFollowUpDialogProps) {
  const [outcome, setOutcome] = React.useState<ClinicalOutcome>("improved");
  const [outcomeNotes, setOutcomeNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (followUp) {
      setOutcome("improved");
      setOutcomeNotes("");
      setError(null);
    }
  }, [followUp]);

  if (!followUp) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onComplete(followUp.id, {
        clinicalOutcome: outcome,
        outcomeNotes: outcomeNotes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to record follow-up completion."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const outcomeOptions: Array<{
    value: ClinicalOutcome;
    label: string;
    description: string;
    icon: typeof TrendingUp;
    activeBorder: string;
    activeBg: string;
    textColor: string;
  }> = [
    {
      value: "improved",
      label: "Improved",
      description: "Symptoms relieved, positive treatment response observed.",
      icon: TrendingUp,
      activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20",
      activeBg: "bg-emerald-50/70",
      textColor: "text-emerald-700",
    },
    {
      value: "unchanged",
      label: "Unchanged",
      description: "Condition stable, neither significant improvement nor deterioration.",
      icon: Minus,
      activeBorder: "border-sky-500 ring-2 ring-sky-500/20",
      activeBg: "bg-sky-50/70",
      textColor: "text-sky-700",
    },
    {
      value: "worsened",
      label: "Worsened",
      description: "Symptoms worsened or new complications developed. Requires modification.",
      icon: TrendingDown,
      activeBorder: "border-rose-500 ring-2 ring-rose-500/20",
      activeBg: "bg-rose-50/70",
      textColor: "text-rose-700",
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <div className="flex items-center gap-2 text-emerald-600 mb-1">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Follow-up Review
            </span>
          </div>
          <ModalTitle>Complete Follow-up & Record Outcome</ModalTitle>
          <ModalDescription>
            Document the clinical outcome of this visit for long-term longitudinal tracking.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Clinical Outcome Selection */}
          <div>
            <Label className="text-xs font-semibold text-[#201C1A] mb-2 block">
              Clinical Assessment Outcome <span className="text-rose-500">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {outcomeOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(opt.value)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border text-left transition-all",
                      isSelected
                        ? `${opt.activeBorder} ${opt.activeBg}`
                        : "border-[#EAE3D9] bg-white hover:border-[#DE4F3C]/40"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs mb-1">
                      <Icon className={cn("h-4 w-4", opt.textColor)} />
                      <span className={isSelected ? opt.textColor : "text-[#201C1A]"}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#7A746F] leading-tight line-clamp-2">
                      {opt.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Outcome Notes */}
          <div>
            <Label htmlFor="outcomeNotes" className="text-xs font-semibold text-[#201C1A]">
              Clinical Progress & Outcome Remarks
            </Label>
            <Textarea
              id="outcomeNotes"
              placeholder="e.g. Seizure frequency reduced by 80%, tolerating medication well with minimal sedation."
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              className="mt-1 min-h-[85px]"
            />
          </div>
        </ModalBody>

        <ModalFooter className="flex-col sm:flex-row gap-2">
          {onStartConsultation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onStartConsultation(followUp);
              }}
              className="w-full sm:w-auto text-xs"
            >
              Start Follow-up Consultation
            </Button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
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
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark as Completed</span>
                </>
              )}
            </Button>
          </div>
        </ModalFooter>
      </form>
    </Modal>
  );
}
