"use client";

import * as React from "react";
import {
  PatientProcedure,
  PROCEDURE_CATEGORIES,
  ProcedureCategory,
} from "@/types/procedure";
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
  Activity,
  FolderOpen,
} from "lucide-react";

export interface ProcedureModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  consultationId?: string | null;
  existingProcedure?: PatientProcedure | null;
  onSuccess: () => void;
  consultations?: Array<{
    id: string;
    consultationDate: string;
    provisionalDiagnosis?: string;
    chiefComplaint?: string;
  }>;
}

export function ProcedureModal({
  isOpen,
  onClose,
  patientId,
  consultationId: defaultConsultationId,
  existingProcedure,
  onSuccess,
  consultations = [],
}: ProcedureModalProps) {
  const isEditing = Boolean(existingProcedure);

  const [procedureName, setProcedureName] = React.useState("");
  const [category, setCategory] = React.useState<ProcedureCategory>("Surgery");
  const [procedureDate, setProcedureDate] = React.useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [hospitalFacility, setHospitalFacility] = React.useState("");
  const [performingDoctor, setPerformingDoctor] = React.useState("");
  const [clinicalIndication, setClinicalIndication] = React.useState("");
  const [doctorNotes, setDoctorNotes] = React.useState("");
  const [outcome, setOutcome] = React.useState("");
  const [complications, setComplications] = React.useState("");
  const [recoveryNotes, setRecoveryNotes] = React.useState("");
  const [driveUrl, setDriveUrl] = React.useState("");
  const [selectedConsultationId, setSelectedConsultationId] = React.useState<string>("");

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Live Google Drive validation state
  const driveValidation = React.useMemo(() => {
    if (!driveUrl.trim()) return null;
    return validateAndNormalizeGoogleDriveUrl(driveUrl.trim());
  }, [driveUrl]);

  // Sync form state when editing or opening
  React.useEffect(() => {
    if (existingProcedure) {
      setProcedureName(existingProcedure.procedureName);
      setCategory(existingProcedure.category);
      setProcedureDate(existingProcedure.procedureDate);
      setHospitalFacility(existingProcedure.hospitalFacility || "");
      setPerformingDoctor(existingProcedure.performingDoctor || "");
      setClinicalIndication(existingProcedure.clinicalIndication || "");
      setDoctorNotes(existingProcedure.doctorNotes || "");
      setOutcome(existingProcedure.outcome || "");
      setComplications(existingProcedure.complications || "");
      setRecoveryNotes(existingProcedure.recoveryNotes || "");
      setDriveUrl(existingProcedure.driveUrl || "");
      setSelectedConsultationId(existingProcedure.consultationId || "");
    } else {
      setProcedureName("");
      setCategory("Surgery");
      setProcedureDate(new Date().toISOString().split("T")[0]);
      setHospitalFacility("");
      setPerformingDoctor("");
      setClinicalIndication("");
      setDoctorNotes("");
      setOutcome("");
      setComplications("");
      setRecoveryNotes("");
      setDriveUrl("");
      setSelectedConsultationId(defaultConsultationId || "");
    }
    setError(null);
  }, [existingProcedure, defaultConsultationId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!procedureName.trim()) {
      setError("Procedure or operation name is required");
      return;
    }

    if (!procedureDate) {
      setError("Procedure date is required");
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
        procedureName: procedureName.trim(),
        category,
        procedureDate,
        hospitalFacility: hospitalFacility.trim() || null,
        performingDoctor: performingDoctor.trim() || null,
        clinicalIndication: clinicalIndication.trim() || null,
        doctorNotes: doctorNotes.trim() || null,
        outcome: outcome.trim() || null,
        complications: complications.trim() || null,
        recoveryNotes: recoveryNotes.trim() || null,
        driveUrl: normalizedDriveUrl,
        consultationId: selectedConsultationId || null,
      };

      if (isEditing && existingProcedure) {
        const res = await fetch(`/api/procedures/${existingProcedure.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update procedure");
        }
      } else {
        const res = await fetch("/api/procedures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            patientId,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to record procedure");
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save procedure record";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="w-full">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9]">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <ModalTitle className="text-lg font-serif font-bold text-[#201C1A]">
                {isEditing ? "Edit Procedure Record" : "Record Operation or Medical Procedure"}
              </ModalTitle>
              <ModalDescription className="text-xs text-[#7A746F]">
                Log surgical operations, minor interventions, or diagnostic procedures. Google Drive links are stored as direct references only.
              </ModalDescription>
            </div>
          </div>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <ModalBody className="space-y-4 max-h-[72vh] overflow-y-auto px-6 py-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Core Identifiers: Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Procedure / Operation Name <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. Laparoscopic Appendectomy, Excision Biopsy"
                  value={procedureName}
                  onChange={(e) => setProcedureName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Category <span className="text-rose-500">*</span>
                </label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProcedureCategory)}
                  className="h-9 text-xs"
                >
                  {PROCEDURE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Date, Facility & Operating Surgeon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Procedure Date <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="date"
                  required
                  value={procedureDate}
                  onChange={(e) => setProcedureDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Hospital / Medical Center
                </label>
                <Input
                  placeholder="e.g. Popular Medical College Hospital"
                  value={hospitalFacility}
                  onChange={(e) => setHospitalFacility(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Performing Doctor / Surgeon
                </label>
                <Input
                  placeholder="e.g. Prof. Dr. Tashfin"
                  value={performingDoctor}
                  onChange={(e) => setPerformingDoctor(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Clinical Indication & Outcome */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Clinical Indication
                </label>
                <Input
                  placeholder="e.g. Acute appendicitis with localized peritonitis"
                  value={clinicalIndication}
                  onChange={(e) => setClinicalIndication(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Clinical Outcome
                </label>
                <Input
                  placeholder="e.g. Uneventful recovery, successful excision"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Operative Notes / Doctor Notes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#201C1A]">
                Doctor&apos;s Operative Notes & Findings
              </label>
              <Textarea
                placeholder="Key operative steps, intraoperative findings, pathology specimens sent, tissue observations..."
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Complications & Post-Op Recovery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Complications (if any)
                </label>
                <Input
                  placeholder="e.g. Mild wound erythema, none reported"
                  value={complications}
                  onChange={(e) => setComplications(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Recovery & Follow-up Instructions
                </label>
                <Input
                  placeholder="e.g. Suture removal in 7 days, wound dressing"
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Related Consultation */}
            {consultations.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#201C1A]">
                  Link to Consultation / Visit
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
                  <span className="text-[10px] text-[#7A746F] font-normal">(Optional Operative Note / Discharge Summary)</span>
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
                  <strong>Link-Only Architecture:</strong> The application only registers metadata and your external Google Drive link. Operative reports, surgical photographs, and discharge summaries are never uploaded or stored on this server. Deleting this procedure record removes only the clinical database reference.
                </p>
              </div>
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
              disabled={isSubmitting || (driveValidation !== null && !driveValidation.isValid)}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Activity className="h-3.5 w-3.5" />
                  <span>{isEditing ? "Update Procedure" : "Save Procedure Record"}</span>
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      </div>
    </Modal>
  );
}
