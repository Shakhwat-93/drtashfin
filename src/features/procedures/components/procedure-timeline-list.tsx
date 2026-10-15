"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  Calendar,
  Building,
  User,
  FileText,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  Search,
} from "lucide-react";
import { Patient } from "@/types/patient";
import {
  PatientProcedure,
  ProcedureCategory,
  PROCEDURE_CATEGORIES,
} from "@/types/procedure";
import { useProcedures } from "../hooks/use-procedures";
import { ProcedureModal } from "./procedure-modal";
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

export interface ProcedureTimelineListProps {
  patient: Patient;
  consultationId?: string;
  className?: string;
}

const CATEGORY_STYLES: Record<
  ProcedureCategory,
  { variant: "primary" | "neutral" | "info" | "warning" | "success" | "danger" }
> = {
  Surgery: { variant: "danger" },
  "Minor Procedure": { variant: "warning" },
  "Diagnostic Procedure": { variant: "info" },
  "Therapeutic Procedure": { variant: "primary" },
  Other: { variant: "neutral" },
};

export function ProcedureTimelineList({
  patient,
  consultationId,
  className,
}: ProcedureTimelineListProps) {
  const {
    procedures,
    isLoading,
    error,
    deleteProcedure,
    refresh,
  } = useProcedures(patient.patientId, consultationId);

  const { consultations } = useConsultations(patient.patientId);

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingProcedure, setEditingProcedure] = React.useState<PatientProcedure | null>(null);

  // Deletion confirmation modal
  const [procedureToDelete, setProcedureToDelete] = React.useState<PatientProcedure | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = React.useState<string | null>(null);

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const filteredProcedures = React.useMemo(() => {
    let list = procedures;
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.procedureName.toLowerCase().includes(q) ||
          p.hospitalFacility?.toLowerCase().includes(q) ||
          p.performingDoctor?.toLowerCase().includes(q) ||
          p.clinicalIndication?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [procedures, selectedCategory, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingProcedure(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (procedure: PatientProcedure) => {
    setEditingProcedure(procedure);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!procedureToDelete) return;

    try {
      setIsDeleting(true);
      const res = await deleteProcedure(procedureToDelete.id);
      if (res.success) {
        setDeleteSuccessMsg(
          `Procedure "${procedureToDelete.procedureName}" removed from patient record. Note: Supporting Google Drive files remain untouched.`
        );
        setTimeout(() => setDeleteSuccessMsg(null), 5000);
      }
    } finally {
      setIsDeleting(false);
      setProcedureToDelete(null);
    }
  };

  return (
    <div className={cn("space-y-4 pt-2", className)}>
      {/* Header with Title, Stats & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-[#EAE3D9]/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-base font-bold text-[#201C1A]">
              Operations & Medical Procedures
            </h3>
            {procedures.length > 0 && (
              <Badge variant="neutral" size="sm" className="font-mono text-xs">
                {procedures.length} {procedures.length === 1 ? "record" : "records"}
              </Badge>
            )}
          </div>
          <p className="text-xs text-[#7A746F] mt-0.5">
            Chronological surgical history, operative summaries, and procedure logs for {patient.name}.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          className="gap-1.5 text-xs font-medium self-start sm:self-auto"
          onClick={handleOpenAddModal}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Record Procedure</span>
        </Button>
      </div>

      {/* Temporary Success Notification */}
      {deleteSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{deleteSuccessMsg}</span>
          </div>
          <button
            onClick={() => setDeleteSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      {procedures.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1 pb-2">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                selectedCategory === "all"
                  ? "bg-[#201C1A] text-white shadow-xs"
                  : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] border border-[#EAE3D9]"
              }`}
            >
              All ({procedures.length})
            </button>
            {PROCEDURE_CATEGORIES.map((cat) => {
              const count = procedures.filter((p) => p.category === cat).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-[#201C1A] text-white shadow-xs"
                      : "bg-[#FAF5EE] text-[#7A746F] hover:text-[#201C1A] border border-[#EAE3D9]"
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7A746F]" />
            <Input
              placeholder="Search procedure, hospital, surgeon..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs bg-white border-[#EAE3D9]"
            />
          </div>
        </div>
      )}

      {/* Content Rendering: Loading / Error / Empty / List */}
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
      ) : procedures.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No Operations or Procedures Recorded"
          description={`No surgical operations or medical procedures have been recorded for ${patient.name} yet.`}
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddModal}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Record First Procedure</span>
            </Button>
          }
        />
      ) : filteredProcedures.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-[#EAE3D9] rounded-2xl bg-[#FAF5EE]/30">
          <p className="text-xs text-[#7A746F]">
            No procedures match your current filter or search criteria.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="mt-3 text-xs"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredProcedures.map((proc) => {
            const style = CATEGORY_STYLES[proc.category] || { variant: "neutral" };
            return (
              <Card
                key={proc.id}
                className="border border-[#EAE3D9] bg-white p-4.5 rounded-2xl shadow-xs transition-shadow hover:shadow-md space-y-3"
              >
                {/* Header row: Category, Name, Date & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={style.variant}
                        size="sm"
                        className="text-[10px] uppercase font-bold tracking-wider"
                      >
                        {proc.category}
                      </Badge>
                      <h4 className="font-serif text-sm font-bold text-[#201C1A]">
                        {proc.procedureName}
                      </h4>
                    </div>

                    {/* Metadata line: Date, Hospital, Doctor */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7A746F] pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span className="font-medium text-[#201C1A]">
                          {proc.procedureDate}
                        </span>
                      </div>
                      {proc.hospitalFacility && (
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-[#7A746F]" />
                          <span>{proc.hospitalFacility}</span>
                        </div>
                      )}
                      {proc.performingDoctor && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[#7A746F]" />
                          <span>By: {proc.performingDoctor}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-[#7A746F] hover:text-[#201C1A]"
                      onClick={() => handleOpenEditModal(proc)}
                      title="Edit procedure record"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => setProcedureToDelete(proc)}
                      title="Remove procedure reference"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Clinical Indication & Outcome */}
                {(proc.clinicalIndication || proc.outcome) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-[#FAF5EE]">
                    {proc.clinicalIndication && (
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
                          Indication:
                        </span>
                        <p className="text-[#201C1A]">{proc.clinicalIndication}</p>
                      </div>
                    )}
                    {proc.outcome && (
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-[#7A746F] uppercase tracking-wider">
                          Outcome:
                        </span>
                        <p className="text-emerald-700 font-medium">{proc.outcome}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Doctor Operative Notes */}
                {proc.doctorNotes && (
                  <div className="text-xs text-[#201C1A] bg-[#FAF5EE]/60 p-3 rounded-xl border border-[#EAE3D9]/60 space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] block">
                      Operative Notes & Findings:
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed">{proc.doctorNotes}</p>
                  </div>
                )}

                {/* Complications & Post-Op Recovery */}
                {(proc.complications || proc.recoveryNotes) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-amber-50/30 p-2.5 rounded-xl border border-amber-200/50">
                    {proc.complications && (
                      <div>
                        <span className="text-[11px] font-bold text-amber-900 block">
                          Complications:
                        </span>
                        <p className="text-amber-800">{proc.complications}</p>
                      </div>
                    )}
                    {proc.recoveryNotes && (
                      <div>
                        <span className="text-[11px] font-bold text-[#7A746F] block">
                          Recovery & Follow-up:
                        </span>
                        <p className="text-[#201C1A]">{proc.recoveryNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Linked Consultation & Supporting Drive URL */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#FAF5EE] text-xs">
                  <div>
                    {proc.consultationId ? (
                      <Link
                        href={`/patients/${patient.patientId}/consultations/${proc.consultationId}`}
                        className="inline-flex items-center gap-1.5 text-xs text-[#7A746F] hover:text-[#DE4F3C]"
                      >
                        <FileText className="h-3.5 w-3.5 text-[#DE4F3C]" />
                        <span>
                          Linked Visit: {proc.consultationDate || "Consultation record"}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-[11px] text-[#7A746F]">
                        Standalone procedure record
                      </span>
                    )}
                  </div>

                  {proc.driveUrl ? (
                    <a
                      href={proc.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-xs font-semibold text-[#DE4F3C] hover:bg-[#FDF0EE] transition-colors"
                    >
                      <FolderOpen className="h-3.5 w-3.5 text-[#DE4F3C]" />
                      <span>View Report in Google Drive</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#7A746F]">
                      No external document attached
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Procedure Modal */}
      <ProcedureModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProcedure(null);
        }}
        patientId={patient.id}
        consultationId={consultationId}
        existingProcedure={editingProcedure}
        onSuccess={refresh}
        consultations={consultations.map((c) => ({
          id: c.id,
          consultationDate: c.consultationDate,
          provisionalDiagnosis: c.provisionalDiagnosis,
          chiefComplaint: c.chiefComplaint,
        }))}
      />

      {/* Safe Deletion Confirmation Modal */}
      {procedureToDelete && (
        <Modal
          isOpen={Boolean(procedureToDelete)}
          onClose={() => setProcedureToDelete(null)}
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
                    Remove Procedure Record?
                  </ModalTitle>
                  <ModalDescription className="text-xs text-[#7A746F]">
                    Confirm removal from clinical patient timeline.
                  </ModalDescription>
                </div>
              </div>
            </ModalHeader>

            <ModalBody className="space-y-3 px-6 py-4 text-xs text-[#201C1A]">
              <p>
                Are you sure you want to remove the record for{" "}
                <strong>&ldquo;{procedureToDelete.procedureName}&rdquo;</strong> performed on{" "}
                <strong>{procedureToDelete.procedureDate}</strong>?
              </p>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <strong>Important Note:</strong>
                <p>
                  This action removes only the clinical database reference in this system. Any files or folders in your Google Drive will remain completely untouched and preserved.
                </p>
              </div>
            </ModalBody>

            <ModalFooter className="flex items-center justify-between px-6 py-3 border-t border-[#EAE3D9]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setProcedureToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="gap-1.5"
              >
                {isDeleting ? "Removing..." : "Confirm Removal"}
              </Button>
            </ModalFooter>
          </div>
        </Modal>
      )}
    </div>
  );
}
