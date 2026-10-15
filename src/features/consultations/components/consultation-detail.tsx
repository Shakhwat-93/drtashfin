"use client";

import * as React from "react";
import Link from "next/link";
import {
  Edit2,
  ArrowLeft,
  CalendarClock,
  Printer,
  FileText,
  Clock,
  TrendingUp,
  Minus,
  TrendingDown,
  Calendar,
  FlaskConical,
  ExternalLink,
  Plus,
} from "lucide-react";
import { Consultation } from "@/types/consultation";
import { Patient } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useConsultationPrescription,
  PrescriptionCard,
} from "@/features/prescriptions";
import { getPrescriptionRepository } from "@/lib/data";
import {
  useDiagnosticReports,
  DiagnosticReportModal,
} from "@/features/diagnostic-reports";
import {
  useProcedures,
  ProcedureModal,
} from "@/features/procedures";
import {
  useDischarges,
  DischargeModal,
} from "@/features/discharges";

export interface ConsultationDetailProps {
  consultation: Consultation;
  patient: Patient;
  className?: string;
}

export function ConsultationDetail({
  consultation,
  patient,
  className,
}: ConsultationDetailProps) {
  const { prescription, refresh: refreshPrescription } =
    useConsultationPrescription(consultation.id);
  const { reports: linkedReports, refresh: refreshReports } =
    useDiagnosticReports(undefined, consultation.id);
  const [isReportModalOpen, setIsReportModalOpen] = React.useState(false);
  const { procedures: linkedProcedures, refresh: refreshProcedures } =
    useProcedures(undefined, consultation.id);
  const [isProcedureModalOpen, setIsProcedureModalOpen] = React.useState(false);
  const { discharges: linkedDischarges, refresh: refreshDischarges } =
    useDischarges(undefined, consultation.id);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = React.useState(false);

  const handleDeleteDraft = React.useCallback(
    async (draftId: string) => {
      if (
        window.confirm("Are you sure you want to discard this draft prescription?")
      ) {
        try {
          const repo = getPrescriptionRepository();
          await repo.deleteDraftPrescription(draftId);
          await refreshPrescription();
        } catch (err) {
          console.error("Failed to delete draft prescription:", err);
        }
      }
    },
    [refreshPrescription]
  );

  const formattedConsultationDate = new Date(
    consultation.consultationDate + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedFollowUp = consultation.nextFollowUp
    ? new Date(
        consultation.nextFollowUp + "T00:00:00"
      ).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const formattedCreated = new Date(consultation.createdAt).toLocaleString(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

  const formattedUpdated = new Date(consultation.updatedAt).toLocaleString(
    "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );

  return (
    <div className={cn("space-y-6 max-w-4xl mx-auto", className)}>
      {/* Top Bar Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/patients/${patient.patientId}`}>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Patient Profile</span>
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          {prescription ? (
            <Link
              href={`/patients/${patient.patientId}/prescriptions/${prescription.id}`}
            >
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>
                  View Rx ({prescription.prescriptionCode})
                </span>
              </Button>
            </Link>
          ) : (
            <Link
              href={`/patients/${patient.patientId}/prescriptions/new?consultationId=${consultation.id}`}
            >
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 h-8 text-xs font-medium"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Write Prescription</span>
              </Button>
            </Link>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>

          <Link
            href={`/patients/${patient.patientId}/consultations/${consultation.id}/edit`}
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Record</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Clinical Document Paper */}
      <div className="rounded-xl border border-[#EAE3D9] bg-white p-6 sm:p-10 shadow-xs space-y-8">
        {/* Document Header */}
        <div className="border-b border-[#EAE3D9] pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A746F]">
                  Clinical Consultation Record
                </p>
                {consultation.status && (
                  <Badge
                    variant={
                      consultation.status === "completed"
                        ? "success"
                        : consultation.status === "in-progress"
                        ? "warning"
                        : "neutral"
                    }
                    size="sm"
                    className="capitalize text-[10px] py-0"
                  >
                    {consultation.status}
                  </Badge>
                )}
                {consultation.isFollowUp && (
                  <Badge variant="warning" size="sm" className="text-[10px] py-0">
                    Follow-up Review
                  </Badge>
                )}
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#201C1A]">
                {formattedConsultationDate}
              </h1>
              {consultation.consultationTime && (
                <div className="flex items-center gap-1.5 text-xs text-[#7A746F] mt-1">
                  <Clock className="h-3.5 w-3.5 text-[#DE4F3C]" />
                  <span>{consultation.consultationTime}</span>
                </div>
              )}
            </div>

            {/* Patient Demographic Summary Badge */}
            <div className="rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] p-3 text-xs">
              <div className="font-semibold text-[#201C1A]">{patient.name}</div>
              <div className="flex items-center gap-2 text-[#7A746F] text-[11px] mt-0.5">
                <span className="font-mono">{patient.patientId}</span>
                <span>•</span>
                <span>{patient.age} yrs</span>
                <span>•</span>
                <span className="capitalize">{patient.gender}</span>
                {patient.weight && <span>• {patient.weight} kg</span>}
              </div>
            </div>
          </div>

          {/* Follow-up Visit Progress & Outcome Banner */}
          {consultation.isFollowUp && (
            <div className="mt-4 p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <CalendarClock className="h-4 w-4 text-amber-700" />
                  <span>Follow-up Assessment & Progress</span>
                </span>
                {consultation.clinicalOutcome && (
                  <Badge
                    variant={
                      consultation.clinicalOutcome === "improved"
                        ? "success"
                        : consultation.clinicalOutcome === "worsened"
                        ? "danger"
                        : "neutral"
                    }
                    size="sm"
                    className="capitalize gap-1 font-semibold"
                  >
                    {consultation.clinicalOutcome === "improved" && (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {consultation.clinicalOutcome === "unchanged" && (
                      <Minus className="h-3 w-3" />
                    )}
                    {consultation.clinicalOutcome === "worsened" && (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    Condition: {consultation.clinicalOutcome}
                  </Badge>
                )}
              </div>

              {consultation.progressNotes && (
                <p className="text-xs text-amber-950 leading-relaxed pt-1 border-t border-amber-200/60 whitespace-pre-wrap">
                  {consultation.progressNotes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* SECTION: HISTORY */}
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#FAF5EE] pb-1">
            History
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs">
            {consultation.chiefComplaint && (
              <div className="md:col-span-2">
                <span className="font-semibold text-[#201C1A] block mb-1">
                  Chief Complaint
                </span>
                <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                  {consultation.chiefComplaint}
                </p>
              </div>
            )}

            {consultation.birthHistory && (
              <div>
                <span className="font-semibold text-[#201C1A] block mb-1">
                  Birth History
                </span>
                <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                  {consultation.birthHistory}
                </p>
              </div>
            )}

            {consultation.familyHistory && (
              <div>
                <span className="font-semibold text-[#201C1A] block mb-1">
                  Family History
                </span>
                <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                  {consultation.familyHistory}
                </p>
              </div>
            )}

            {consultation.consanguinity && (
              <div>
                <span className="font-semibold text-[#201C1A] block mb-1">
                  Consanguinity
                </span>
                <Badge
                  variant={
                    consultation.consanguinity === "yes" ? "warning" : "neutral"
                  }
                  size="sm"
                  className="capitalize font-medium"
                >
                  {consultation.consanguinity}
                </Badge>
              </div>
            )}

            {consultation.drugHistory && (
              <div>
                <span className="font-semibold text-[#201C1A] block mb-1">
                  Drug History
                </span>
                <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                  {consultation.drugHistory}
                </p>
              </div>
            )}

            {consultation.others && (
              <div className="md:col-span-2">
                <span className="font-semibold text-[#201C1A] block mb-1">
                  Others
                </span>
                <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                  {consultation.others}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* SECTION: CLINICAL EXAMINATION */}
        {(consultation.clinicalExamination || consultation.clinicalNotes) && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#FAF5EE] pb-1">
              Clinical Examination & Assessment
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {consultation.clinicalExamination && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Examination Findings
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap bg-[#FAF5EE]/40 rounded-lg p-3.5 border border-[#EAE3D9]/60">
                    {consultation.clinicalExamination}
                  </p>
                </div>
              )}
              {consultation.clinicalNotes && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Doctor&apos;s Assessment Notes
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap bg-[#FAF5EE]/40 rounded-lg p-3.5 border border-[#EAE3D9]/60">
                    {consultation.clinicalNotes}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: INVESTIGATIONS */}
        {(consultation.investigationAdvised ||
          consultation.currentInvestigation) && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#FAF5EE] pb-1">
              Investigations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {consultation.investigationAdvised && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Investigation Advised
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.investigationAdvised}
                  </p>
                </div>
              )}

              {consultation.currentInvestigation && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Current Investigation
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.currentInvestigation}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: LINKED DIAGNOSTIC TEST REPORTS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#FAF5EE] pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Linked Diagnostic Reports ({linkedReports.length})</span>
            </h2>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-[#201C1A]"
              onClick={() => setIsReportModalOpen(true)}
            >
              <Plus className="h-3 w-3" />
              <span>Link New Report</span>
            </Button>
          </div>

          {linkedReports.length === 0 ? (
            <p className="text-xs text-[#7A746F] italic py-1">
              No diagnostic test reports or scans currently linked to this clinical consultation.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedReports.map((report) => (
                <div
                  key={report.id}
                  className="rounded-xl border border-[#EAE3D9] bg-white p-3.5 space-y-2 text-xs shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="neutral" size="sm" className="text-[10px] mb-1 font-semibold">
                        {report.category}
                      </Badge>
                      <h4 className="font-semibold text-[#201C1A] text-xs">
                        {report.testName}
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#7A746F] shrink-0">
                      {report.testDate}
                    </span>
                  </div>

                  {report.diagnosticCenter && (
                    <div className="text-[11px] text-[#7A746F]">
                      Lab: {report.diagnosticCenter}
                    </div>
                  )}

                  {report.doctorNotes && (
                    <p className="text-[11px] text-[#201C1A] bg-[#FAF5EE]/60 p-2 rounded-md border border-[#EAE3D9]/60 line-clamp-2">
                      {report.doctorNotes}
                    </p>
                  )}

                  <div className="pt-1.5 border-t border-[#FAF5EE] flex justify-end">
                    <a
                      href={report.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE4F3C] hover:underline"
                    >
                      <span>Open in Google Drive</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION: PROCEDURES & OPERATIONS */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#FAF5EE] pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                Procedures & Operations
              </h2>
              {linkedProcedures.length > 0 && (
                <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                  {linkedProcedures.length}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-[#201C1A]"
              onClick={() => setIsProcedureModalOpen(true)}
            >
              <Plus className="h-3 w-3 text-[#DE4F3C]" />
              <span>Link / Record Procedure</span>
            </Button>
          </div>

          {linkedProcedures.length === 0 ? (
            <p className="text-xs text-[#7A746F] italic py-1">
              No surgical operations or medical procedures currently linked to this visit.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedProcedures.map((proc) => (
                <div
                  key={proc.id}
                  className="rounded-xl border border-[#EAE3D9] bg-white p-3.5 space-y-2 text-xs shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge variant="neutral" size="sm" className="text-[10px] mb-1 font-semibold">
                        {proc.category}
                      </Badge>
                      <h4 className="font-semibold text-[#201C1A] text-xs">
                        {proc.procedureName}
                      </h4>
                    </div>
                    <span className="text-[11px] text-[#7A746F] shrink-0">
                      {proc.procedureDate}
                    </span>
                  </div>

                  {proc.hospitalFacility && (
                    <div className="text-[11px] text-[#7A746F]">
                      Hospital: {proc.hospitalFacility}
                    </div>
                  )}

                  {proc.performingDoctor && (
                    <div className="text-[11px] text-[#7A746F]">
                      Surgeon: {proc.performingDoctor}
                    </div>
                  )}

                  {proc.clinicalIndication && (
                    <p className="text-[11px] text-[#201C1A]">
                      <span className="font-semibold">Indication:</span> {proc.clinicalIndication}
                    </p>
                  )}

                  {proc.doctorNotes && (
                    <p className="text-[11px] text-[#201C1A] bg-[#FAF5EE]/60 p-2 rounded-md border border-[#EAE3D9]/60 line-clamp-2">
                      {proc.doctorNotes}
                    </p>
                  )}

                  {proc.driveUrl && (
                    <div className="pt-1.5 border-t border-[#FAF5EE] flex justify-end">
                      <a
                        href={proc.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE4F3C] hover:underline"
                      >
                        <span>Open in Google Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION: DISCHARGE & FINAL CLINICAL REPORT */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#FAF5EE] pb-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                Discharge & Final Clinical Report
              </h2>
              {linkedDischarges.length > 0 && (
                <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                  {linkedDischarges.length}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 text-[#201C1A]"
              onClick={() => setIsDischargeModalOpen(true)}
            >
              <Plus className="h-3 w-3 text-[#DE4F3C]" />
              <span>Link / Record Discharge</span>
            </Button>
          </div>

          {linkedDischarges.length === 0 ? (
            <p className="text-xs text-[#7A746F] italic py-1">
              No discharge or final summary documented for this consultation episode.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {linkedDischarges.map((dis) => (
                <div
                  key={dis.id}
                  className="rounded-xl border border-[#EAE3D9] bg-white p-3.5 space-y-2 text-xs shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Badge
                        variant={dis.status === "finalized" ? "success" : "warning"}
                        size="sm"
                        className="text-[10px] mb-1 font-semibold capitalize"
                      >
                        {dis.status}: {dis.conditionAtDischarge}
                      </Badge>
                      <h4 className="font-semibold text-[#201C1A] text-xs">
                        Discharged on {dis.dischargeDate}
                      </h4>
                    </div>
                  </div>

                  {dis.doctorName && (
                    <div className="text-[11px] text-[#7A746F]">
                      Clinician: {dis.doctorName}
                    </div>
                  )}

                  {dis.treatmentSummary && (
                    <p className="text-[11px] text-[#201C1A] bg-[#FAF5EE]/60 p-2 rounded-md border border-[#EAE3D9]/60 line-clamp-2">
                      {dis.treatmentSummary}
                    </p>
                  )}

                  {dis.driveUrl && (
                    <div className="pt-1.5 border-t border-[#FAF5EE] flex justify-end">
                      <a
                        href={dis.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#DE4F3C] hover:underline"
                      >
                        <span>Open in Google Drive</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION: DIAGNOSIS */}
        {(consultation.provisionalDiagnosis ||
          consultation.differentialDiagnosis) && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#FAF5EE] pb-1">
              Diagnosis
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {consultation.provisionalDiagnosis && (
                <div className="rounded-lg bg-[#FDF0EE]/50 border border-[#F9D0CA] p-3.5">
                  <span className="font-semibold text-[#DE4F3C] block mb-1">
                    Provisional Diagnosis
                  </span>
                  <p className="text-[#201C1A] leading-relaxed font-medium whitespace-pre-wrap">
                    {consultation.provisionalDiagnosis}
                  </p>
                </div>
              )}

              {consultation.differentialDiagnosis && (
                <div className="rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] p-3.5">
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Differential Diagnosis
                  </span>
                  <p className="text-[#7A746F] leading-relaxed whitespace-pre-wrap">
                    {consultation.differentialDiagnosis}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: MANAGEMENT & TREATMENT PLAN */}
        {(consultation.plan ||
          consultation.advice ||
          consultation.treatmentInstructions ||
          consultation.lifestyleInstructions ||
          consultation.treatmentStartDate ||
          consultation.treatmentReviewDate) && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#FAF5EE] pb-1">
              Management & Longitudinal Treatment Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {consultation.plan && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Plan / Medications
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.plan}
                  </p>
                </div>
              )}

              {consultation.advice && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    General Advice
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.advice}
                  </p>
                </div>
              )}

              {consultation.treatmentInstructions && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Treatment & Dosing Instructions
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.treatmentInstructions}
                  </p>
                </div>
              )}

              {consultation.lifestyleInstructions && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Lifestyle & Dietary Recommendations
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.lifestyleInstructions}
                  </p>
                </div>
              )}
            </div>

            {/* Treatment Course Duration & Review */}
            {(consultation.treatmentStartDate ||
              consultation.treatmentReviewDate) && (
              <div className="flex flex-wrap items-center gap-6 p-3 rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-xs">
                {consultation.treatmentStartDate && (
                  <div>
                    <span className="text-[#7A746F]">Treatment Start: </span>
                    <span className="font-semibold text-[#201C1A]">
                      {new Date(
                        consultation.treatmentStartDate + "T00:00:00"
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {consultation.treatmentReviewDate && (
                  <div>
                    <span className="text-[#7A746F]">Planned Review: </span>
                    <span className="font-semibold text-[#DE4F3C]">
                      {new Date(
                        consultation.treatmentReviewDate + "T00:00:00"
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* SECTION: PRESCRIPTION */}
        <section className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#FAF5EE] pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
              Prescription
            </h2>
            {prescription && (
              <Badge
                variant={
                  prescription.status === "finalized" ? "success" : "warning"
                }
                size="sm"
                className="text-[10px] uppercase font-mono tracking-wider"
              >
                {prescription.status}
              </Badge>
            )}
          </div>

          {prescription ? (
            <PrescriptionCard
              prescription={prescription}
              patientId={patient.patientId}
              onDeleteDraft={handleDeleteDraft}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-[#EAE3D9] p-5 text-center bg-[#FAF5EE]/30 print:hidden">
              <p className="text-xs text-[#7A746F] mb-3">
                No prescription has been created for this consultation record yet.
              </p>
              <Link
                href={`/patients/${patient.patientId}/prescriptions/new?consultationId=${consultation.id}`}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5 font-medium border-[#EAE3D9] text-[#201C1A] hover:bg-[#FAF5EE]"
                >
                  <FileText className="h-3.5 w-3.5 text-[#DE4F3C]" />
                  <span>Write Prescription for this Visit</span>
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* SECTION: NEXT FOLLOW-UP */}
        {formattedFollowUp && (
          <section className="border-t border-[#EAE3D9] pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-4 w-4 text-[#DE4F3C]" />
                <div className="text-xs">
                  <span className="text-[#7A746F]">Next Follow-up Scheduled: </span>
                  <span className="font-semibold text-[#201C1A]">
                    {formattedFollowUp}
                  </span>
                </div>
              </div>
              {consultation.followUpReason && (
                <div className="text-xs text-[#7A746F]">
                  <span className="font-medium text-[#201C1A]">Reason: </span>
                  <span>{consultation.followUpReason}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Audit Metadata Footer */}
        <div className="border-t border-[#EAE3D9] pt-4 flex flex-wrap items-center justify-between text-[11px] text-[#7A746F]">
          <div>
            Record ID: <span className="font-mono">{consultation.id}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Created: {formattedCreated}</span>
            <span>•</span>
            <span>Modified: {formattedUpdated}</span>
          </div>
        </div>

        {/* Link Diagnostic Report Modal */}
        <DiagnosticReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          patientId={patient.id}
          consultationId={consultation.id}
          onSuccess={refreshReports}
          consultations={[
            {
              id: consultation.id,
              consultationDate: consultation.consultationDate,
              provisionalDiagnosis: consultation.provisionalDiagnosis,
              chiefComplaint: consultation.chiefComplaint,
            },
          ]}
        />

        {/* Link Procedure Modal */}
        <ProcedureModal
          isOpen={isProcedureModalOpen}
          onClose={() => setIsProcedureModalOpen(false)}
          patientId={patient.id}
          consultationId={consultation.id}
          onSuccess={refreshProcedures}
          consultations={[
            {
              id: consultation.id,
              consultationDate: consultation.consultationDate,
              provisionalDiagnosis: consultation.provisionalDiagnosis,
              chiefComplaint: consultation.chiefComplaint,
            },
          ]}
        />

        {/* Link Discharge Modal */}
        <DischargeModal
          isOpen={isDischargeModalOpen}
          onClose={() => setIsDischargeModalOpen(false)}
          patientId={patient.id}
          consultationId={consultation.id}
          chamberId={consultation.chamberId || patient.chamberId}
          onSuccess={refreshDischarges}
          consultations={[
            {
              id: consultation.id,
              consultationDate: consultation.consultationDate,
              provisionalDiagnosis: consultation.provisionalDiagnosis,
              chiefComplaint: consultation.chiefComplaint,
            },
          ]}
        />
      </div>
    </div>
  );
}
