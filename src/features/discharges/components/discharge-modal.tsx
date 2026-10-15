"use client";

import * as React from "react";
import {
  PatientDischarge,
  DISCHARGE_CONDITIONS,
  DischargeCondition,
} from "@/types/discharge";
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
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import {
  ShieldAlert,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  FolderOpen,
  Calendar,
  Lock,
} from "lucide-react";

export interface DischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  consultationId?: string | null;
  chamberId?: string | null;
  existingDischarge?: PatientDischarge | null;
  onSuccess: () => void;
  consultations?: Array<{
    id: string;
    consultationDate: string;
    provisionalDiagnosis?: string;
    chiefComplaint?: string;
  }>;
}

export function DischargeModal({
  isOpen,
  onClose,
  patientId,
  consultationId: defaultConsultationId,
  chamberId,
  existingDischarge,
  onSuccess,
  consultations = [],
}: DischargeModalProps) {
  const isEditing = Boolean(existingDischarge);

  const [dischargeDate, setDischargeDate] = React.useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [dischargeTime, setDischargeTime] = React.useState("");
  const [conditionAtDischarge, setConditionAtDischarge] =
    React.useState<DischargeCondition>("Improved");
  const [clinicalReason, setClinicalReason] = React.useState("");
  const [finalDiagnosis, setFinalDiagnosis] = React.useState("");
  const [treatmentSummary, setTreatmentSummary] = React.useState("");
  const [dischargeInstructions, setDischargeInstructions] = React.useState("");
  const [medicationInstructions, setMedicationInstructions] = React.useState("");
  const [recommendedFollowUpDate, setRecommendedFollowUpDate] = React.useState("");
  const [followUpInstructions, setFollowUpInstructions] = React.useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = React.useState(false);
  const [complications, setComplications] = React.useState("");
  const [driveUrl, setDriveUrl] = React.useState("");
  const [selectedConsultationId, setSelectedConsultationId] = React.useState<string>("");

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showFinalizeConfirm, setShowFinalizeConfirm] = React.useState(false);

  // Live Google Drive validation state
  const driveValidation = React.useMemo(() => {
    if (!driveUrl.trim()) return null;
    return validateAndNormalizeGoogleDriveUrl(driveUrl.trim());
  }, [driveUrl]);

  // Sync form state when editing or opening
  React.useEffect(() => {
    if (existingDischarge) {
      setDischargeDate(existingDischarge.dischargeDate);
      setDischargeTime(existingDischarge.dischargeTime || "");
      setConditionAtDischarge(existingDischarge.conditionAtDischarge);
      setClinicalReason(existingDischarge.clinicalReason);
      setFinalDiagnosis(existingDischarge.finalDiagnosis);
      setTreatmentSummary(existingDischarge.treatmentSummary);
      setDischargeInstructions(existingDischarge.dischargeInstructions);
      setMedicationInstructions(existingDischarge.medicationInstructions || "");
      setRecommendedFollowUpDate(existingDischarge.recommendedFollowUpDate || "");
      setFollowUpInstructions(existingDischarge.followUpInstructions || "");
      setScheduleFollowUp(false);
      setComplications(existingDischarge.complications || "");
      setDriveUrl(existingDischarge.driveUrl || "");
      setSelectedConsultationId(existingDischarge.consultationId || "");
    } else {
      setDischargeDate(new Date().toISOString().split("T")[0]);
      setDischargeTime("");
      setConditionAtDischarge("Improved");
      setClinicalReason("");
      setFinalDiagnosis("");
      setTreatmentSummary("");
      setDischargeInstructions("");
      setMedicationInstructions("");
      setRecommendedFollowUpDate("");
      setFollowUpInstructions("");
      setScheduleFollowUp(false);
      setComplications("");
      setDriveUrl("");
      setSelectedConsultationId(defaultConsultationId || "");
    }
    setError(null);
    setShowFinalizeConfirm(false);
  }, [existingDischarge, defaultConsultationId, isOpen]);

  const handleSave = async (statusToSet: "draft" | "finalized") => {
    setError(null);

    if (!dischargeDate) {
      setError("Discharge date is required");
      return;
    }
    if (!clinicalReason.trim()) {
      setError("Clinical reason for discharge is required");
      return;
    }
    if (!finalDiagnosis.trim()) {
      setError("Final diagnosis or clinical assessment is required");
      return;
    }
    if (!treatmentSummary.trim()) {
      setError("Treatment summary is required");
      return;
    }
    if (!dischargeInstructions.trim()) {
      setError("Discharge instructions are required");
      return;
    }

    let normalizedDriveUrl: string | null = null;
    if (driveUrl.trim()) {
      const driveCheck = validateAndNormalizeGoogleDriveUrl(driveUrl.trim());
      if (!driveCheck.isValid || !driveCheck.normalizedUrl) {
        setError(driveCheck.error || "Must be a valid HTTPS Google Drive URL");
        return;
      }
      normalizedDriveUrl = driveCheck.normalizedUrl;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        dischargeDate,
        dischargeTime: dischargeTime.trim() || null,
        conditionAtDischarge,
        clinicalReason: clinicalReason.trim(),
        finalDiagnosis: finalDiagnosis.trim(),
        treatmentSummary: treatmentSummary.trim(),
        dischargeInstructions: dischargeInstructions.trim(),
        medicationInstructions: medicationInstructions.trim() || null,
        recommendedFollowUpDate: recommendedFollowUpDate || null,
        followUpInstructions: followUpInstructions.trim() || null,
        scheduleFollowUp: scheduleFollowUp && Boolean(recommendedFollowUpDate),
        followUpChamberId: chamberId || null,
        complications: complications.trim() || null,
        driveUrl: normalizedDriveUrl,
        consultationId: selectedConsultationId || null,
        status: statusToSet,
      };

      if (isEditing && existingDischarge) {
        // If already finalized, error out
        if (existingDischarge.status === "finalized") {
          throw new Error("Finalized records cannot be modified directly. Use amendment.");
        }

        const res = await fetch(`/api/discharges/${existingDischarge.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update discharge record");
        }

        // If user explicitly chose to finalize
        if (statusToSet === "finalized") {
          const finRes = await fetch(`/api/discharges/${existingDischarge.id}/finalize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ confirmed: true }),
          });
          const finData = await finRes.json();
          if (!finRes.ok) {
            throw new Error(finData.error || "Failed to finalize discharge record");
          }
        }
      } else {
        const res = await fetch("/api/discharges", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            patientId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to record discharge");
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save discharge record";
      setError(msg);
    } finally {
      setIsSubmitting(false);
      setShowFinalizeConfirm(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl">
      <div className="w-full">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle className="text-lg font-serif font-bold text-[#201C1A]">
                {isEditing ? "Edit Discharge Report" : "Record Patient Discharge & Final Clinical Report"}
              </ModalTitle>
              <ModalDescription className="text-xs text-[#7A746F]">
                Document treatment conclusion, final assessment, and discharge guidance while preserving lifetime medical records.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={(e) => e.preventDefault()}>
          <ModalBody className="space-y-4 max-h-[72vh] overflow-y-auto px-6 py-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Date, Time & Condition at Discharge */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Discharge Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Discharge Time
                </label>
                <Input
                  type="time"
                  value={dischargeTime}
                  onChange={(e) => setDischargeTime(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Condition at Discharge <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={conditionAtDischarge}
                  onChange={(e) => setConditionAtDischarge(e.target.value as DischargeCondition)}
                  className="h-9 text-xs"
                >
                  {DISCHARGE_CONDITIONS.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Final Diagnosis & Clinical Assessment */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Final Diagnosis & Clinical Assessment <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Acute appendicitis, successfully resolved post-laparoscopy"
                value={finalDiagnosis}
                onChange={(e) => setFinalDiagnosis(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Clinical Reason for Discharge */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Clinical Reason for Discharge <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="e.g. Clinical recovery achieved, vitals stable, surgical wound intact"
                value={clinicalReason}
                onChange={(e) => setClinicalReason(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Summary of Treatment Provided */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Summary of Treatment Provided <span className="text-rose-500">*</span>
              </label>
              <Textarea
                required
                placeholder="Procedures performed, medications administered, clinical response, and key hospital course events..."
                value={treatmentSummary}
                onChange={(e) => setTreatmentSummary(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Discharge Instructions & Patient Care Guidance */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Discharge Instructions & Care Guidance <span className="text-rose-500">*</span>
              </label>
              <Textarea
                required
                placeholder="Activity restrictions, wound care, red-flag symptoms requiring emergency attention, diet guidelines..."
                value={dischargeInstructions}
                onChange={(e) => setDischargeInstructions(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Medication Instructions */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Post-Discharge Medication Instructions
              </label>
              <Textarea
                placeholder="Explicit medications, dosages, duration, and instructions to continue at home..."
                value={medicationInstructions}
                onChange={(e) => setMedicationInstructions(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>

            {/* Complications or Unresolved Concerns */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Complications or Residual Clinical Concerns (Optional)
              </label>
              <Input
                placeholder="e.g. Mild postoperative seroma, none observed"
                value={complications}
                onChange={(e) => setComplications(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Follow-up Integration */}
            <div className="p-3.5 rounded-xl bg-[#FAF5EE]/70 border border-[#EAE3D9] space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#DE4F3C]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                  Post-Discharge Follow-up (Optional)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#201C1A]">
                    Recommended Follow-up Date
                  </label>
                  <Input
                    type="date"
                    value={recommendedFollowUpDate}
                    onChange={(e) => setRecommendedFollowUpDate(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#201C1A]">
                    Follow-up Instructions
                  </label>
                  <Input
                    placeholder="e.g. Suture removal, wound inspection, histopathology review"
                    value={followUpInstructions}
                    onChange={(e) => setFollowUpInstructions(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              {recommendedFollowUpDate && (
                <label className="flex items-center gap-2 pt-1 text-xs text-[#201C1A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleFollowUp}
                    onChange={(e) => setScheduleFollowUp(e.target.checked)}
                    className="rounded text-[#DE4F3C] focus:ring-[#DE4F3C] h-4 w-4"
                  />
                  <span>
                    Automatically schedule in Doctor Follow-up Calendar & In-App Alerts
                  </span>
                </label>
              )}
            </div>

            {/* Related Consultation */}
            {consultations.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Link to Originating Visit / Consultation
                </label>
                <Select
                  value={selectedConsultationId}
                  onChange={(e) => setSelectedConsultationId(e.target.value)}
                  className="h-9 text-xs"
                >
                  <option value="">— Standalone / Not linked to a specific visit —</option>
                  {consultations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.consultationDate}{" "}
                      {c.provisionalDiagnosis ? `(${c.provisionalDiagnosis})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Google Drive Link-Only URL Input & Verification */}
            <div className="space-y-2 pt-2 border-t border-[#EAE3D9]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#201C1A] flex items-center gap-1.5">
                  <FolderOpen className="h-3.5 w-3.5 text-[#DE4F3C]" />
                  <span>Supporting Google Drive Link</span>
                  <span className="text-[10px] text-[#7A746F] font-normal">
                    (Optional Discharge Summary / Signed Certificate)
                  </span>
                </label>
                {driveValidation && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      driveValidation.isValid ? "text-emerald-700" : "text-rose-600"
                    }`}
                  >
                    {driveValidation.isValid ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Valid {driveValidation.resourceType === "folder" ? "Folder" : "File"} Link</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                        <span>Invalid Drive URL</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <Input
                type="url"
                placeholder="https://drive.google.com/file/d/.../view or folder link"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                className={`h-9 text-xs ${
                  driveValidation && !driveValidation.isValid
                    ? "border-rose-400 focus-visible:ring-rose-400"
                    : driveValidation && driveValidation.isValid
                    ? "border-emerald-400 focus-visible:ring-emerald-400"
                    : ""
                }`}
              />

              {driveValidation?.isValid && driveValidation.normalizedUrl && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-xs">
                  <span className="text-[#7A746F] truncate max-w-[400px]">
                    Verified: {driveValidation.normalizedUrl}
                  </span>
                  <a
                    href={driveValidation.normalizedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#DE4F3C] hover:underline shrink-0"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Medico-Legal Link-Only Notice */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900">
                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  <strong>Link-Only Architecture:</strong> The application only registers clinical metadata and your external Google Drive link. Discharge certificates and physical files are never uploaded or duplicated on this server. Deleting a draft removes only the database entry.
                </p>
              </div>
            </div>

            {/* Finalization Confirmation Alert */}
            {showFinalizeConfirm && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <Lock className="h-4 w-4" />
                  <span>Confirm Final Clinical Discharge</span>
                </div>
                <p>
                  Finalizing locks this discharge report for audit and medico-legal integrity. Once finalized, the core text cannot be silently edited (only formal clinical amendments can be appended).
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() => handleSave("finalized")}
                  >
                    {isSubmitting ? "Finalizing..." : "Yes, Finalize & Lock"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFinalizeConfirm(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || showFinalizeConfirm}
                onClick={() => handleSave("draft")}
              >
                {isSubmitting ? "Saving..." : "Save as Draft"}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isSubmitting || (driveValidation !== null && !driveValidation.isValid)}
                onClick={() => setShowFinalizeConfirm(true)}
                className="gap-1.5"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Finalize Report</span>
              </Button>
            </div>
          </ModalFooter>
        </form>
      </div>
    </Modal>
  );
}
