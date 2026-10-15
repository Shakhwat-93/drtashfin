"use client";

import * as React from "react";
import {
  DiagnosticReport,
  DIAGNOSTIC_REPORT_CATEGORIES,
  DiagnosticReportCategory,
} from "@/types/diagnostic-report";
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
import {
  validateAndNormalizeGoogleDriveUrl,
} from "@/lib/drive/drive-url-utils";
import {
  ShieldAlert,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  FolderOpen,
} from "lucide-react";

export interface DiagnosticReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  consultationId?: string | null;
  existingReport?: DiagnosticReport | null;
  onSuccess: () => void;
  consultations?: Array<{
    id: string;
    consultationDate: string;
    provisionalDiagnosis?: string;
    chiefComplaint?: string;
  }>;
}

export function DiagnosticReportModal({
  isOpen,
  onClose,
  patientId,
  consultationId: defaultConsultationId,
  existingReport,
  onSuccess,
  consultations = [],
}: DiagnosticReportModalProps) {
  const isEditing = Boolean(existingReport);

  const [testName, setTestName] = React.useState("");
  const [category, setCategory] = React.useState<DiagnosticReportCategory>("Blood Test");
  const [testDate, setTestDate] = React.useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [diagnosticCenter, setDiagnosticCenter] = React.useState("");
  const [doctorNotes, setDoctorNotes] = React.useState("");
  const [driveUrl, setDriveUrl] = React.useState("");
  const [selectedConsultationId, setSelectedConsultationId] = React.useState<string>("");

  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Live Google Drive validation state
  const driveValidation = React.useMemo(() => {
    if (!driveUrl.trim()) return null;
    return validateAndNormalizeGoogleDriveUrl(driveUrl.trim());
  }, [driveUrl]);

  // Sync state when editing or opening
  React.useEffect(() => {
    if (existingReport) {
      setTestName(existingReport.testName);
      setCategory(existingReport.category);
      setTestDate(existingReport.testDate);
      setDiagnosticCenter(existingReport.diagnosticCenter || "");
      setDoctorNotes(existingReport.doctorNotes || "");
      setDriveUrl(existingReport.driveUrl);
      setSelectedConsultationId(existingReport.consultationId || "");
    } else {
      setTestName("");
      setCategory("Blood Test");
      setTestDate(new Date().toISOString().split("T")[0]);
      setDiagnosticCenter("");
      setDoctorNotes("");
      setDriveUrl("");
      setSelectedConsultationId(defaultConsultationId || "");
    }
    setError(null);
  }, [existingReport, defaultConsultationId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!testName.trim()) {
      setError("Please provide the investigation or test name.");
      return;
    }

    if (!testDate) {
      setError("Please specify the test date.");
      return;
    }

    if (!driveUrl.trim()) {
      setError("Please provide the Google Drive link.");
      return;
    }

    const val = validateAndNormalizeGoogleDriveUrl(driveUrl.trim());
    if (!val.isValid || !val.normalizedUrl) {
      setError(
        val.error ||
          "Please enter a valid secure HTTPS Google Drive link (drive.google.com or docs.google.com)."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        testName: testName.trim(),
        category,
        testDate,
        diagnosticCenter: diagnosticCenter.trim() || null,
        doctorNotes: doctorNotes.trim() || null,
        driveUrl: val.normalizedUrl,
        consultationId: selectedConsultationId ? selectedConsultationId : null,
      };

      if (isEditing && existingReport) {
        const res = await fetch(`/api/diagnostic-reports/${existingReport.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to update diagnostic report");
        }
      } else {
        const res = await fetch("/api/diagnostic-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            patientId,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to create diagnostic report");
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <ModalHeader>
        <ModalTitle>
          {isEditing ? "Edit Diagnostic Report Reference" : "Add Diagnostic Test Report"}
        </ModalTitle>
        <ModalDescription>
          Store report metadata and an external Google Drive link. The file is never uploaded to or copied by the application.
        </ModalDescription>
      </ModalHeader>

      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4 max-h-[72vh] overflow-y-auto px-1">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Test Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-[#201C1A]">
                Test / Report Name <span className="text-[#DE4F3C]">*</span>
              </label>
              <Input
                placeholder="e.g., Complete Blood Count (CBC) with ESR"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#201C1A]">
                Category <span className="text-[#DE4F3C]">*</span>
              </label>
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as DiagnosticReportCategory)}
              >
                {DIAGNOSTIC_REPORT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Test Date & Diagnostic Center */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#201C1A]">
                Test Date <span className="text-[#DE4F3C]">*</span>
              </label>
              <Input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#201C1A]">
                Laboratory / Diagnostic Center
              </label>
              <Input
                placeholder="e.g., Popular Diagnostic, Ibn Sina"
                value={diagnosticCenter}
                onChange={(e) => setDiagnosticCenter(e.target.value)}
              />
            </div>
          </div>

          {/* Related Consultation */}
          {consultations.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#201C1A]">
                Link to Consultation (Optional)
              </label>
              <Select
                value={selectedConsultationId}
                onChange={(e) => setSelectedConsultationId(e.target.value)}
              >
                <option value="">None / Standalone Patient Report</option>
                {consultations.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.consultationDate} — {c.provisionalDiagnosis || c.chiefComplaint || "Routine Consultation"}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {/* Google Drive Link */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#201C1A]">
                Google Drive URL <span className="text-[#DE4F3C]">*</span>
              </label>
              {driveValidation?.isValid && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  <span>
                    Valid Google {driveValidation.resourceType === "folder" ? "Folder" : "File"} Link
                  </span>
                </span>
              )}
            </div>
            <Input
              type="url"
              placeholder="https://drive.google.com/file/d/... or /drive/folders/..."
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              required
            />
            <p className="text-[11px] text-[#7A746F] leading-relaxed">
              Paste the shareable Google Drive link to the PDF, scan, or folder containing this report.
            </p>
          </div>

          {/* Link Verification & Preview Badge */}
          {driveValidation && driveValidation.isValid && driveValidation.normalizedUrl && (
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-xs">
              <div className="flex items-center gap-2 text-[#201C1A]">
                {driveValidation.resourceType === "folder" ? (
                  <FolderOpen className="h-4 w-4 text-[#DE4F3C]" />
                ) : (
                  <FileCheck className="h-4 w-4 text-[#DE4F3C]" />
                )}
                <span className="font-medium truncate max-w-[280px]">
                  {driveValidation.normalizedUrl}
                </span>
              </div>
              <a
                href={driveValidation.normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE4F3C] hover:underline shrink-0 ml-2"
              >
                <span>Test Link</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {/* Doctor Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#201C1A]">
              Doctor&apos;s Clinical Notes / Findings (Optional)
            </label>
            <Textarea
              rows={3}
              placeholder="Key clinical impressions, notable values, or follow-up notes..."
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
            />
          </div>

          {/* Security & Access Reminder Banner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1 text-xs text-amber-950">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
              <span>Google Drive Access & Sharing Permissions Reminder</span>
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              The application stores this URL reference only. Please ensure you have set proper sharing permissions on Google Drive so authorized clinicians can open it.
            </p>
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
            disabled={isSubmitting || (driveValidation !== null && !driveValidation.isValid)}
          >
            {isSubmitting
              ? isEditing
                ? "Saving..."
                : "Adding..."
              : isEditing
              ? "Update Report"
              : "Save Diagnostic Report"}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
