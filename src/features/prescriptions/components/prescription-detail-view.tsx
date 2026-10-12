"use client";

import * as React from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Edit2,
  Calendar,
  Building2,
  ShieldCheck,
  Share2,
} from "lucide-react";
import { Patient } from "@/types/patient";
import { Prescription } from "@/types/prescription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface PrescriptionDetailViewProps {
  prescription: Prescription;
  patient: Patient;
  className?: string;
}

export function PrescriptionDetailView({
  prescription,
  patient,
  className,
}: PrescriptionDetailViewProps) {
  const isFinalized = prescription.status === "finalized";

  const formattedDate = new Date(
    prescription.prescriptionDate + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedFollowUp = prescription.followUpDate
    ? new Date(
        prescription.followUpDate + "T00:00:00"
      ).toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className={cn("space-y-6 max-w-4xl mx-auto", className)}>
      {/* Top Action Bar (hidden on print) */}
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
          {!isFinalized && (
            <Link
              href={`/patients/${patient.patientId}/prescriptions/${prescription.id}/edit`}
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Draft</span>
              </Button>
            </Link>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 h-8 text-xs shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Prescription</span>
          </Button>
        </div>
      </div>

      {/* Main Clinical Prescription Paper */}
      <div className="rounded-2xl border border-[#EAE3D9] bg-white p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
        {/* Clinician & Clinic Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-[#201C1A] pb-6">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#201C1A] tracking-tight">
              Dr. Tashfin
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#DE4F3C] mt-0.5">
              MBBS, BCS (Health), Clinical Specialist
            </p>
            <p className="text-xs text-[#7A746F] mt-1">
              Doctor-Patient Management & Clinical Consultation Practice
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="flex items-center sm:justify-end gap-2">
              <span className="font-mono text-sm font-bold text-[#201C1A]">
                {prescription.prescriptionCode}
              </span>
              {isFinalized ? (
                <Badge variant="success" className="text-[10px] px-2 py-0.5">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                  Finalized
                </Badge>
              ) : (
                <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  Draft
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#7A746F]">{formattedDate}</p>
          </div>
        </div>

        {/* Patient Identity Strip */}
        <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-4 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-[#7A746F] block text-[11px]">Patient Name:</span>
              <strong className="text-sm font-serif font-bold text-[#201C1A]">
                {patient.name}
              </strong>
            </div>
            <div>
              <span className="text-[#7A746F] block text-[11px]">Patient ID:</span>
              <span className="font-mono font-semibold text-[#201C1A]">
                {patient.patientId}
              </span>
            </div>
            <div>
              <span className="text-[#7A746F] block text-[11px]">Age / Gender:</span>
              <span className="font-medium text-[#201C1A]">
                {patient.age} yrs • {patient.gender}
              </span>
            </div>
            <div>
              <span className="text-[#7A746F] block text-[11px]">Weight / Blood:</span>
              <span className="font-medium text-[#201C1A]">
                {patient.weight ? `${patient.weight} kg` : "—"} • {patient.bloodGroup || "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Prescription Body: The Classic ℞ Section */}
        <div className="pt-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#EAE3D9] pb-2">
            <span className="font-serif text-3xl font-black text-[#201C1A]">
              ℞
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#7A746F]">
              Medications & Treatment Plan ({prescription.items.length})
            </span>
          </div>

          {prescription.items.length === 0 ? (
            <p className="text-xs italic text-[#7A746F] py-4">No medications listed.</p>
          ) : (
            <div className="space-y-4">
              {prescription.items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-[#EAE3D9]/80 bg-white p-4 space-y-2 hover:border-[#C4BCB3] transition-colors"
                >
                  {/* Top Item Row */}
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FAF5EE] border border-[#EAE3D9] text-[11px] font-bold text-[#DE4F3C]">
                        {index + 1}
                      </span>
                      <h3 className="font-serif text-base font-bold text-[#201C1A]">
                        {item.brandName}
                      </h3>
                      {item.strength && (
                        <span className="rounded-full bg-[#EAE3D9] px-2 py-0.5 text-[10px] font-semibold text-[#201C1A]">
                          {item.strength}
                        </span>
                      )}
                      {item.dosageForm && (
                        <span className="rounded-md border border-[#EAE3D9] px-1.5 py-0.5 text-[10px] font-medium text-[#7A746F]">
                          {item.dosageForm}
                        </span>
                      )}
                    </div>

                    {/* Frequency & Duration Pill */}
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-[#201C1A] px-2.5 py-1 font-mono text-xs font-bold text-white shadow-2xs">
                        {item.frequency}
                      </span>
                      {item.duration && (
                        <span className="text-xs font-medium text-[#7A746F]">
                          for {item.duration}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Generic Name & Manufacturer */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-[#7A746F] pl-7">
                    <span>
                      Generic: <em className="text-[#504A45]">{item.genericName}</em>
                    </span>
                    {item.manufacturer && (
                      <span className="text-[11px] text-[#7A746F]">
                        {item.manufacturer}
                      </span>
                    )}
                  </div>

                  {/* Instructions & Route */}
                  <div className="flex flex-wrap items-center gap-3 pl-7 pt-1 text-xs text-[#504A45]">
                    {item.dose && (
                      <span className="inline-flex items-center gap-1 font-medium">
                        Dose: <span className="text-[#201C1A]">{item.dose}</span>
                      </span>
                    )}
                    {item.route && item.route !== "Oral" && (
                      <span className="rounded bg-sky-50 text-sky-800 border border-sky-200 px-1.5 py-0.2 text-[10px] font-medium">
                        Route: {item.route}
                      </span>
                    )}
                    {item.timingInstructions && (
                      <span className="inline-flex items-center gap-1 text-[#DE4F3C] font-medium">
                        • {item.timingInstructions}
                      </span>
                    )}
                    {item.specialInstructions && (
                      <span className="inline-flex items-center gap-1 italic text-[#7A746F]">
                        • {item.specialInstructions}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Advice Section */}
        {prescription.advice && (
          <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-5 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
              Advice & Patient Instructions
            </h4>
            <div className="text-xs leading-relaxed text-[#504A45] whitespace-pre-line">
              {prescription.advice}
            </div>
          </div>
        )}

        {/* Follow-up Section */}
        {formattedFollowUp && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-700" />
              <span>
                <strong>Next Review Date: </strong>
                {formattedFollowUp}
                {prescription.followUpInstructions && ` — ${prescription.followUpInstructions}`}
              </span>
            </div>
          </div>
        )}

        {/* Signature & Medico-Legal Footer */}
        <div className="pt-8 border-t border-[#EAE3D9] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div className="text-[10px] text-[#7A746F] space-y-0.5">
            <p>Generated via Doctor Tashfin Patient Management System.</p>
            <p>MedEx Bangladesh Verified Pharmaceutical Sourcing.</p>
            {isFinalized && prescription.finalizedAt && (
              <p className="font-mono text-emerald-700">
                Locked & Finalized at: {new Date(prescription.finalizedAt).toUTCString()}
              </p>
            )}
          </div>

          <div className="text-right sm:min-w-[200px] border-t border-[#201C1A] pt-2">
            <p className="font-serif text-sm font-bold text-[#201C1A]">
              Dr. Tashfin
            </p>
            <p className="text-[11px] text-[#7A746F]">Attending Clinician</p>
          </div>
        </div>
      </div>
    </div>
  );
}
