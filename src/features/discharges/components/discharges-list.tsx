"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Calendar,
  Lock,
  History,
  FolderOpen,
  Search,
  Eye,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Patient } from "@/types/patient";
import { PatientDischarge, DischargeStatus } from "@/types/discharge";
import { useDischarges } from "../hooks/use-discharges";
import { DischargeModal } from "./discharge-modal";
import { DischargeDetailModal } from "./discharge-detail-modal";
import { DischargeAmendmentModal } from "./discharge-amendment-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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

export interface DischargesListProps {
  patient: Patient;
  consultationId?: string;
  className?: string;
}

export function DischargesList({
  patient,
  consultationId,
  className,
}: DischargesListProps) {
  const {
    discharges,
    isLoading,
    error,
    deleteDraftDischarge,
    finalizeDischarge,
    refresh,
  } = useDischarges(patient.patientId, consultationId);

  const { consultations } = useConsultations(patient.patientId);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [editingDischarge, setEditingDischarge] =
    React.useState<PatientDischarge | null>(null);
  const [viewingDischarge, setViewingDischarge] =
    React.useState<PatientDischarge | null>(null);
  const [amendingDischarge, setAmendingDischarge] =
    React.useState<PatientDischarge | null>(null);

  // Deletion modal
  const [dischargeToDelete, setDischargeToDelete] =
    React.useState<PatientDischarge | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = React.useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const filteredDischarges = React.useMemo(() => {
    let list = discharges;
    if (selectedStatus !== "all") {
      list = list.filter((d) => d.status === selectedStatus);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.finalDiagnosis.toLowerCase().includes(q) ||
          d.clinicalReason.toLowerCase().includes(q) ||
          d.treatmentSummary.toLowerCase().includes(q) ||
          d.conditionAtDischarge.toLowerCase().includes(q) ||
          d.dischargeInstructions.toLowerCase().includes(q)
      );
    }
    return list;
  }, [discharges, selectedStatus, searchQuery]);

  const handleOpenAdd = () => {
    setEditingDischarge(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (d: PatientDischarge) => {
    setEditingDischarge(d);
    setIsCreateModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!dischargeToDelete) return;
    try {
      setIsDeleting(true);
      const res = await deleteDraftDischarge(dischargeToDelete.id);
      if (res.success) {
        setActionSuccessMsg("Draft discharge record deleted successfully.");
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    } finally {
      setIsDeleting(false);
      setDischargeToDelete(null);
    }
  };

  const handleQuickFinalize = async (d: PatientDischarge) => {
    if (
      window.confirm(
        `Finalize discharge report for ${patient.name}? This will lock the clinical document for audit integrity.`
      )
    ) {
      const res = await finalizeDischarge(d.id);
      if (res.success) {
        setActionSuccessMsg("Discharge report finalized and locked successfully.");
        setTimeout(() => setActionSuccessMsg(null), 5000);
      }
    }
  };

  return (
    <div className={cn("space-y-4 pt-2", className)}>
      {/* Header with Title, Stats & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#EAE3D9]/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-bold text-[#201C1A]">
              Discharge & Final Clinical Reports
            </h3>
            {discharges.length > 0 && (
              <Badge variant="neutral" size="sm" className="font-mono text-xs">
                {discharges.length} {discharges.length === 1 ? "report" : "reports"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#7A746F] mt-0.5">
            Formal discharge documentation, final clinical assessments, care plans, and treatment completion records for {patient.name}.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 text-xs font-medium self-start sm:self-auto"
          onClick={handleOpenAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Discharge Report</span>
        </Button>
      </div>

      {/* Success Notification */}
      {actionSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters and Search */}
      {discharges.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-2">
          {/* Status Chips */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedStatus("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedStatus === "all"
                  ? "bg-[#201C1A] text-white shadow-xs"
                  : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] border border-[#EAE3D9]"
              }`}
            >
              All ({discharges.length})
            </button>
            <button
              onClick={() => setSelectedStatus("finalized")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedStatus === "finalized"
                  ? "bg-[#201C1A] text-white shadow-xs"
                  : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] border border-[#EAE3D9]"
              }`}
            >
              Finalized ({discharges.filter((d) => d.status === "finalized").length})
            </button>
            <button
              onClick={() => setSelectedStatus("draft")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedStatus === "draft"
                  ? "bg-[#201C1A] text-white shadow-xs"
                  : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] border border-[#EAE3D9]"
              }`}
            >
              Drafts ({discharges.filter((d) => d.status === "draft").length})
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7A746F]" />
            <Input
              placeholder="Search diagnosis, reason, treatment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-white border-[#EAE3D9]"
            />
          </div>
        </div>
      )}

      {/* Content Rendering */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <Card className="p-6 text-center border-rose-200 bg-rose-50/50">
          <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto mb-2" />
          <p className="text-xs text-rose-700 font-medium">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="mt-3 text-xs"
          >
            Retry Loading
          </Button>
        </Card>
      ) : discharges.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Discharge Reports Filed"
          description={`No patient discharge or final clinical reports have been documented for ${patient.name} yet.`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Discharge Report</span>
            </Button>
          }
        />
      ) : filteredDischarges.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-[#EAE3D9] rounded-2xl bg-[#FAF5EE]/30">
          <p className="text-xs text-[#7A746F]">
            No discharge reports match your current filter or search criteria.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStatus("all");
              setSearchQuery("");
            }}
            className="mt-3 text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredDischarges.map((d) => {
            const isFinalized = d.status === "finalized";
            return (
              <Card
                key={d.id}
                className="border border-[#EAE3D9] bg-white p-4.5 rounded-2xl shadow-xs transition-shadow hover:shadow-md space-y-3"
              >
                {/* Header row: Status, Date, Condition & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={isFinalized ? "success" : "warning"}
                        size="sm"
                        className="text-[10px] uppercase font-bold tracking-wider"
                      >
                        {d.status}
                      </Badge>

                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF5EE] text-[#201C1A] border border-[#EAE3D9]">
                        Condition: {d.conditionAtDischarge}
                      </span>

                      {d.amendmentNotes && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          <History className="h-3 w-3" />
                          <span>Amended</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-serif text-sm font-bold text-[#201C1A] pt-0.5">
                      {d.finalDiagnosis}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7A746F]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span className="font-medium text-[#201C1A]">
                          Discharged: {d.dischargeDate} {d.dischargeTime ? `(${d.dischargeTime})` : ""}
                        </span>
                      </div>
                      <div>
                        Clinician: {d.doctorName || "Dr. Tashfin"}
                      </div>
                    </div>
                  </div>

                  {/* Actions Header */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1"
                      onClick={() => setViewingDischarge(d)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View Report</span>
                    </Button>

                    {!isFinalized ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-[#7A746F] hover:text-[#201C1A]"
                          onClick={() => handleOpenEdit(d)}
                          title="Edit draft"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                          onClick={() => handleQuickFinalize(d)}
                          title="Finalize & lock report"
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => setDischargeToDelete(d)}
                          title="Delete draft"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1 text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                        onClick={() => setAmendingDischarge(d)}
                      >
                        <History className="h-3.5 w-3.5" />
                        <span>Amend</span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Reason & Treatment Summary */}
                <div className="space-y-1.5 text-xs text-[#201C1A] bg-[#FAF5EE]/50 p-3 rounded-xl border border-[#EAE3D9]/60">
                  <div>
                    <span className="font-semibold text-[#7A746F]">Clinical Reason: </span>
                    <span>{d.clinicalReason}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-[#7A746F]">Treatment Summary: </span>
                    <span className="line-clamp-2">{d.treatmentSummary}</span>
                  </div>
                </div>

                {/* Footer: Linked Visit, Follow-up & Drive URL */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#FAF5EE] text-xs">
                  <div className="flex items-center gap-3">
                    {d.consultationId ? (
                      <Link
                        href={`/patients/${patient.patientId}/consultations/${d.consultationId}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[#7A746F] hover:text-[#DE4F3C]"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span>
                          Linked Visit: {d.consultationDate || "Consultation record"}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-[11px] text-[#7A746F]">
                        Standalone discharge record
                      </span>
                    )}

                    {d.recommendedFollowUpDate && (
                      <span className="text-[11px] text-[#7A746F] border-l border-[#EAE3D9] pl-3">
                        Follow-up: <strong className="text-[#201C1A]">{d.recommendedFollowUpDate}</strong>
                      </span>
                    )}
                  </div>

                  {d.driveUrl && (
                    <a
                      href={d.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE4F3C] hover:underline"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                      <span>Supporting Doc in Drive</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Draft Modal */}
      <DischargeModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingDischarge(null);
        }}
        patientId={patient.id}
        consultationId={consultationId}
        existingDischarge={editingDischarge}
        onSuccess={refresh}
        consultations={consultations.map((c) => ({
          id: c.id,
          consultationDate: c.consultationDate,
          provisionalDiagnosis: c.provisionalDiagnosis,
          chiefComplaint: c.chiefComplaint,
        }))}
      />

      {/* View Full Report Detail Modal */}
      <DischargeDetailModal
        isOpen={Boolean(viewingDischarge)}
        onClose={() => setViewingDischarge(null)}
        discharge={viewingDischarge}
        onOpenAmendment={(d) => {
          setViewingDischarge(null);
          setAmendingDischarge(d);
        }}
        onOpenEditDraft={(d) => {
          setViewingDischarge(null);
          handleOpenEdit(d);
        }}
      />

      {/* Clinical Amendment Modal */}
      <DischargeAmendmentModal
        isOpen={Boolean(amendingDischarge)}
        onClose={() => setAmendingDischarge(null)}
        discharge={amendingDischarge}
        onSuccess={refresh}
      />

      {/* Safe Deletion Modal for Drafts */}
      {dischargeToDelete && (
        <Modal
          isOpen={Boolean(dischargeToDelete)}
          onClose={() => setDischargeToDelete(null)}
          className="max-w-md"
        >
          <div className="w-full">
            <ModalHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <ModalTitle className="text-base font-bold text-[#201C1A]">
                    Discard Draft Discharge Record?
                  </ModalTitle>
                  <ModalDescription className="text-xs text-[#7A746F]">
                    Confirm removal of unfinalized draft.
                  </ModalDescription>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="space-y-3 px-6 py-4 text-xs text-[#201C1A]">
              <p>
                Are you sure you want to discard the draft discharge record created on{" "}
                <strong>{dischargeToDelete.dischargeDate}</strong> for{" "}
                <strong>&ldquo;{dischargeToDelete.finalDiagnosis}&rdquo;</strong>?
              </p>
              <p className="text-[#7A746F]">
                This will delete the unfinalized draft from the database. Note: External Google Drive files remain untouched.
              </p>
            </ModalBody>

            <ModalFooter className="flex items-center justify-between px-6 py-3 border-t border-[#EAE3D9]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDischargeToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Discarding..." : "Confirm Discard"}
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}
