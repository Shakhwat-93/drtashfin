"use client";

import * as React from "react";
import Link from "next/link";
import {
  FlaskConical,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Calendar,
  Building,
  FileText,
  AlertTriangle,
  FolderOpen,
  FileCheck,
  Check,
} from "lucide-react";
import { Patient } from "@/types/patient";
import {
  DiagnosticReport,
  DiagnosticReportCategory,
} from "@/types/diagnostic-report";
import { useDiagnosticReports } from "../hooks/use-diagnostic-reports";
import { DiagnosticReportModal } from "./diagnostic-report-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { useConsultations } from "@/features/consultations/hooks/use-consultations";
import { cn } from "@/lib/utils";

export interface DiagnosticReportsListProps {
  patient: Patient;
  consultationId?: string;
  className?: string;
}

const CATEGORY_STYLES: Record<
  DiagnosticReportCategory,
  { variant: "primary" | "neutral" | "info" | "warning" | "success" | "danger"; icon: typeof FlaskConical }
> = {
  "Blood Test": { variant: "danger", icon: FlaskConical },
  "Urine Test": { variant: "warning", icon: FlaskConical },
  "X-ray": { variant: "info", icon: FileCheck },
  "USG": { variant: "info", icon: FileCheck },
  "ECG": { variant: "danger", icon: FileCheck },
  "CT Scan": { variant: "primary", icon: FileCheck },
  "MRI": { variant: "primary", icon: FileCheck },
  "Pathology": { variant: "neutral", icon: FlaskConical },
  "Other": { variant: "neutral", icon: FolderOpen },
};

export function DiagnosticReportsList({
  patient,
  consultationId,
  className,
}: DiagnosticReportsListProps) {
  const {
    reports,
    isLoading,
    error,
    deleteReport,
    refresh,
  } = useDiagnosticReports(patient.patientId, consultationId);

  const { consultations } = useConsultations(patient.patientId);

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingReport, setEditingReport] = React.useState<DiagnosticReport | null>(null);

  // Deletion confirmation state
  const [reportToDelete, setReportToDelete] = React.useState<DiagnosticReport | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = React.useState<string | null>(null);

  // Filter state
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");

  const filteredReports = React.useMemo(() => {
    if (selectedCategory === "all") return reports;
    return reports.filter((r) => r.category === selectedCategory);
  }, [reports, selectedCategory]);

  const handleOpenAddModal = () => {
    setEditingReport(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (report: DiagnosticReport) => {
    setEditingReport(report);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reportToDelete) return;
    try {
      setIsDeleting(true);
      const res = await deleteReport(reportToDelete.id);
      if (res.success) {
        setDeleteSuccessMsg(
          `Report reference "${reportToDelete.testName}" removed. Your Google Drive file remains untouched.`
        );
        setTimeout(() => setDeleteSuccessMsg(null), 5000);
      }
    } finally {
      setIsDeleting(false);
      setReportToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#EAE3D9]/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-bold text-[#201C1A]">
              Diagnostic Test Reports
            </h3>
            <Badge variant="neutral" size="sm" className="font-mono">
              {reports.length}
            </Badge>
          </div>
          <p className="text-xs text-[#7A746F] pt-0.5">
            External Google Drive investigation references and laboratory reports for {patient.name}.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 h-8 text-xs font-medium shrink-0"
          onClick={handleOpenAddModal}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Diagnostic Report</span>
        </Button>
      </div>

      {/* Success Notification */}
      {deleteSuccessMsg && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-900 animate-in fade-in">
          <Check className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{deleteSuccessMsg}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs text-rose-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Category Filter Pills (if reports exist) */}
      {reports.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
              selectedCategory === "all"
                ? "bg-[#201C1A] text-white border-[#201C1A]"
                : "bg-white text-[#7A746F] border-[#EAE3D9] hover:bg-[#FAF5EE]"
            )}
          >
            All Reports ({reports.length})
          </button>
          {Array.from(new Set(reports.map((r) => r.category))).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors border",
                selectedCategory === cat
                  ? "bg-[#201C1A] text-white border-[#201C1A]"
                  : "bg-white text-[#7A746F] border-[#EAE3D9] hover:bg-[#FAF5EE]"
              )}
            >
              {cat} ({reports.filter((r) => r.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={reports.length === 0 ? "No Diagnostic Reports" : "No Reports Match Filter"}
          description={
            reports.length === 0
              ? `No laboratory investigations or diagnostic scans have been registered for ${patient.name}.`
              : "No diagnostic reports found under the selected category."
          }
          action={
            reports.length === 0 ? (
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5"
                onClick={handleOpenAddModal}
              >
                <Plus className="h-4 w-4" />
                <span>Add First Report</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                Show All Reports
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-3.5">
          {filteredReports.map((report) => {
            const formattedDate = new Date(
              report.testDate + "T00:00:00"
            ).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const categoryMeta =
              CATEGORY_STYLES[report.category] || CATEGORY_STYLES["Other"];

            return (
              <Card
                key={report.id}
                className="border border-[#EAE3D9] bg-white p-4.5 sm:p-5 shadow-xs hover:border-[#DE4F3C]/30 transition-all rounded-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  {/* Left Column: Report Details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={categoryMeta.variant}
                        size="sm"
                        className="text-[11px] font-semibold"
                      >
                        {report.category}
                      </Badge>

                      <div className="flex items-center gap-1.5 text-xs text-[#7A746F]">
                        <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span className="font-medium text-[#201C1A]">
                          {formattedDate}
                        </span>
                      </div>

                      {report.diagnosticCenter && (
                        <div className="flex items-center gap-1.5 text-xs text-[#7A746F]">
                          <Building className="h-3.5 w-3.5 text-[#7A746F]" />
                          <span>{report.diagnosticCenter}</span>
                        </div>
                      )}
                    </div>

                    {/* Test Name */}
                    <h4 className="font-serif text-base font-bold text-[#201C1A] tracking-tight">
                      {report.testName}
                    </h4>

                    {/* Doctor Clinical Notes */}
                    {report.doctorNotes && (
                      <div className="rounded-lg bg-[#FAF5EE]/60 border border-[#EAE3D9]/70 p-3 text-xs text-[#201C1A] leading-relaxed">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block mb-0.5">
                          Doctor&apos;s Notes:
                        </span>
                        <p className="whitespace-pre-wrap">{report.doctorNotes}</p>
                      </div>
                    )}

                    {/* Consultation Link Reference */}
                    {report.consultationId && (
                      <div className="flex items-center gap-1.5 text-xs text-[#7A746F] pt-0.5">
                        <FileText className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span>
                          Linked to Consultation:{" "}
                          <Link
                            href={`/patients/${patient.patientId}/consultations/${report.consultationId}`}
                            className="font-medium text-[#201C1A] hover:text-[#DE4F3C] underline underline-offset-2"
                          >
                            {report.consultationDate || "View Clinical Visit"}
                          </Link>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2.5 shrink-0 border-t sm:border-t-0 border-[#EAE3D9]/60 pt-3 sm:pt-0">
                    {/* Open Google Drive Link */}
                    <a
                      href={report.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9] hover:bg-[#DE4F3C] hover:text-white transition-colors shadow-2xs group"
                    >
                      <span>Open Google Drive Report</span>
                      <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>

                    {/* Edit and Delete Actions */}
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-[#7A746F] hover:text-[#201C1A]"
                        onClick={() => handleOpenEditModal(report)}
                        title="Edit report metadata"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50"
                        onClick={() => setReportToDelete(report)}
                        title="Remove report reference"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <DiagnosticReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        patientId={patient.id}
        consultationId={consultationId}
        existingReport={editingReport}
        onSuccess={refresh}
        consultations={consultations}
      />

      {/* Deletion Confirmation Modal */}
      <Modal
        isOpen={Boolean(reportToDelete)}
        onClose={() => setReportToDelete(null)}
        className="max-w-md"
      >
        <ModalHeader>
          <ModalTitle className="text-rose-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <span>Remove Report Reference</span>
          </ModalTitle>
          <ModalDescription>
            Confirm removal of this diagnostic report from the patient&apos;s timeline.
          </ModalDescription>
        </ModalHeader>

        <ModalBody className="space-y-3 text-xs">
          <p className="text-[#201C1A] leading-relaxed">
            Are you sure you want to remove the reference for{" "}
            <strong className="font-semibold text-[#201C1A]">
              &ldquo;{reportToDelete?.testName}&rdquo;
            </strong>
            ?
          </p>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1 text-xs text-amber-950">
            <div className="font-semibold text-amber-900">
              Important: Google Drive Protection
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              This only removes the report entry from Dr. Tashfin system. Your original file in Google Drive will <strong>never</strong> be deleted, modified, or altered.
            </p>
          </div>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setReportToDelete(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleConfirmDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Removing..." : "Confirm Removal"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
