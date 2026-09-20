"use client";

import * as React from "react";
import Link from "next/link";
import {
  Edit2,
  ArrowLeft,
  CalendarClock,
  Printer,
} from "lucide-react";
import { Consultation } from "@/types/consultation";
import { Patient } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A746F]">
                Clinical Consultation Record
              </p>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#201C1A] mt-1">
                {formattedConsultationDate}
              </h1>
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
        {consultation.clinicalExamination && (
          <section className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#FAF5EE] pb-1">
              Clinical Examination
            </h2>
            <p className="text-xs text-[#201C1A] leading-relaxed whitespace-pre-wrap bg-[#FAF5EE]/40 rounded-lg p-3.5 border border-[#EAE3D9]/60">
              {consultation.clinicalExamination}
            </p>
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

        {/* SECTION: MANAGEMENT & ADVICE */}
        {(consultation.plan || consultation.advice) && (
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] border-b border-[#FAF5EE] pb-1">
              Management & Advice
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {consultation.plan && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Plan
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.plan}
                  </p>
                </div>
              )}

              {consultation.advice && (
                <div>
                  <span className="font-semibold text-[#201C1A] block mb-1">
                    Advice
                  </span>
                  <p className="text-[#201C1A] leading-relaxed whitespace-pre-wrap">
                    {consultation.advice}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SECTION: NEXT FOLLOW-UP */}
        {formattedFollowUp && (
          <section className="border-t border-[#EAE3D9] pt-4">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-4 w-4 text-[#DE4F3C]" />
              <div className="text-xs">
                <span className="text-[#7A746F]">Next Follow-up Scheduled: </span>
                <span className="font-semibold text-[#201C1A]">
                  {formattedFollowUp}
                </span>
              </div>
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
      </div>
    </div>
  );
}
