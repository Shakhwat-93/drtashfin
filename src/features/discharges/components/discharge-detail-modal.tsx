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
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  ExternalLink,
  Lock,
  FileText,
  Calendar,
  History,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";

export interface DischargeDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  discharge: PatientDischarge | null;
  onOpenAmendment?: (discharge: PatientDischarge) => void;
  onOpenEditDraft?: (discharge: PatientDischarge) => void;
}

export function DischargeDetailModal({
  isOpen,
  onClose,
  discharge,
  onOpenAmendment,
  onOpenEditDraft,
}: DischargeDetailModalProps) {
  if (!discharge) return null;

  const isFinalized = discharge.status === "finalized";

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="w-full">
        <ModalHeader className="print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <ModalTitle className="text-lg font-serif font-bold text-[#201C1A]">
                    Patient Discharge Report
                  </ModalTitle>
                  <Badge
                    variant={isFinalized ? "success" : "warning"}
                    size="sm"
                    className="text-[10px] uppercase font-bold tracking-wider"
                  >
                    {discharge.status}
                  </Badge>
                </div>
                <ModalDescription className="text-xs text-[#7A746F]">
                  Discharged on {discharge.dischargeDate} {discharge.dischargeTime ? `at ${discharge.dischargeTime}` : ""}
                </ModalDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs h-8"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </Button>
          </div>
        </ModalHeader>

        <ModalBody className="space-y-4 max-h-[75vh] overflow-y-auto px-6 py-4 text-xs">
          {/* Header Summary Box */}
          <div className="p-4 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-[#7A746F] block text-[11px]">Patient Name</span>
              <span className="font-semibold text-[#201C1A] text-xs">
                {discharge.patientName || "—"}
              </span>
            </div>
            <div>
              <span className="text-[#7A746F] block text-[11px]">Patient ID</span>
              <span className="font-mono font-semibold text-[#201C1A] text-xs">
                {discharge.patientCode || "—"}
              </span>
            </div>
            <div>
              <span className="text-[#7A746F] block text-[11px]">Discharge Date</span>
              <span className="font-semibold text-[#201C1A] text-xs">
                {discharge.dischargeDate}
              </span>
            </div>
            <div>
              <span className="text-[#7A746F] block text-[11px]">Condition at Discharge</span>
              <Badge variant="neutral" size="sm" className="font-medium text-[11px] mt-0.5">
                {discharge.conditionAtDischarge}
              </Badge>
            </div>
          </div>

          {/* Final Diagnosis */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block">
              Final Diagnosis / Clinical Assessment
            </span>
            <div className="p-3 rounded-xl bg-white border border-[#EAE3D9] font-medium text-[#201C1A] text-xs leading-relaxed">
              {discharge.finalDiagnosis}
            </div>
          </div>

          {/* Clinical Reason */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block">
              Reason for Discharge
            </span>
            <div className="p-3 rounded-xl bg-white border border-[#EAE3D9] text-[#201C1A] text-xs leading-relaxed">
              {discharge.clinicalReason}
            </div>
          </div>

          {/* Summary of Treatment Provided */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block">
              Summary of Treatment Provided
            </span>
            <div className="p-3 rounded-xl bg-white border border-[#EAE3D9] text-[#201C1A] text-xs leading-relaxed whitespace-pre-wrap">
              {discharge.treatmentSummary}
            </div>
          </div>

          {/* Discharge Instructions & Care Guidance */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block">
              Discharge Instructions & Care Guidance
            </span>
            <div className="p-3 rounded-xl bg-white border border-[#EAE3D9] text-[#201C1A] text-xs leading-relaxed whitespace-pre-wrap">
              {discharge.dischargeInstructions}
            </div>
          </div>

          {/* Medication Instructions */}
          {discharge.medicationInstructions && (
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block">
                Post-Discharge Medication Instructions
              </span>
              <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/70 text-[#201C1A] text-xs leading-relaxed whitespace-pre-wrap">
                {discharge.medicationInstructions}
              </div>
            </div>
          )}

          {/* Recommended Follow-up */}
          {(discharge.recommendedFollowUpDate || discharge.followUpInstructions) && (
            <div className="p-3.5 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9] space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[#201C1A]">
                <Calendar className="h-4 w-4 text-[#DE4F3C]" />
                <span>Recommended Follow-up</span>
              </div>
              {discharge.recommendedFollowUpDate && (
                <div className="text-xs">
                  <span className="text-[#7A746F]">Target Date: </span>
                  <span className="font-semibold text-[#201C1A]">
                    {discharge.recommendedFollowUpDate}
                  </span>
                </div>
              )}
              {discharge.followUpInstructions && (
                <p className="text-xs text-[#7A746F]">
                  Instructions: {discharge.followUpInstructions}
                </p>
              )}
            </div>
          )}

          {/* Complications */}
          {discharge.complications && (
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block">
                Complications or Unresolved Concerns
              </span>
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-950 text-xs">
                {discharge.complications}
              </div>
            </div>
          )}

          {/* Supporting Google Drive Link */}
          {discharge.driveUrl && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF5EE] border border-[#EAE3D9]">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#DE4F3C]" />
                <span className="text-xs font-medium text-[#201C1A]">
                  Supporting Google Drive Report / Summary
                </span>
              </div>
              <a
                href={discharge.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#EAE3D9] text-xs font-semibold text-[#DE4F3C] hover:bg-[#FDF0EE]"
              >
                <span>Open in Drive</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Amendment History */}
          {discharge.amendmentNotes && (
            <div className="space-y-1.5 pt-2 border-t border-[#EAE3D9]">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                <History className="h-4 w-4 text-purple-600" />
                <span>Permanent Clinical Amendment Trail</span>
              </div>
              <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 text-purple-950 text-xs whitespace-pre-wrap leading-relaxed">
                {discharge.amendmentNotes}
              </div>
            </div>
          )}

          {/* Audit Metadata Footer */}
          <div className="pt-3 border-t border-[#FAF5EE] flex flex-wrap items-center justify-between text-[11px] text-[#7A746F]">
            <div>
              Responsible Clinician: <span className="font-semibold text-[#201C1A]">{discharge.doctorName || "Dr. Tashfin"}</span>
            </div>
            <div className="flex items-center gap-3">
              {isFinalized && discharge.finalizedAt && (
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <Lock className="h-3 w-3" />
                  <span>Finalized on {discharge.finalizedAt.split("T")[0]}</span>
                </span>
              )}
              <span>Created: {discharge.createdAt.split("T")[0]}</span>
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="flex items-center justify-between px-6 py-3 border-t border-[#EAE3D9] print:hidden">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <div className="flex items-center gap-2">
            {!isFinalized && onOpenEditDraft && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenEditDraft(discharge);
                }}
              >
                Edit Draft
              </Button>
            )}

            {isFinalized && onOpenAmendment && (
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onClose();
                  onOpenAmendment(discharge);
                }}
              >
                <History className="h-3.5 w-3.5" />
                <span>Add Amendment</span>
              </Button>
            )}
          </div>
        </ModalFooter>
      </div>
    </Modal>
  );
}
