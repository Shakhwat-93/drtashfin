"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  ChevronRight,
  Edit2,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Download,
} from "lucide-react";
import { Prescription } from "@/types/prescription";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PrescriptionCardProps {
  prescription: Prescription;
  patientId: string;
  onDeleteDraft?: (id: string) => void;
  className?: string;
}

export function PrescriptionCard({
  prescription,
  patientId,
  onDeleteDraft,
  className,
}: PrescriptionCardProps) {
  const isDraft = prescription.status === "draft";

  const formattedDate = new Date(
    prescription.prescriptionDate + "T00:00:00"
  ).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const formattedFollowUp = prescription.followUpDate
    ? new Date(
        prescription.followUpDate + "T00:00:00"
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div
      className={cn(
        "group rounded-2xl border border-[#EAE3D9] bg-white p-5 shadow-xs transition-all hover:border-[#C4BCB3] hover:shadow-md",
        isDraft && "border-amber-200 bg-amber-50/20",
        className
      )}
    >
      <div className="flex flex-col gap-4">
        {/* Top Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE3D9]/70 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg border",
                isDraft
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800"
              )}
            >
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#201C1A]">
                  {prescription.prescriptionCode}
                </span>
                {isDraft ? (
                  <Badge variant="warning" className="text-[10px] px-2 py-0.5">
                    <Clock className="h-2.5 w-2.5 mr-1" />
                    Draft
                  </Badge>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="success" className="text-[10px] px-2 py-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                      Finalized
                    </Badge>
                    {prescription.archivedPdfKey && (
                      <Badge
                        variant="neutral"
                        className="text-[10px] px-2 py-0.5 border-emerald-300 text-emerald-800 bg-emerald-50"
                      >
                        <ShieldCheck className="h-2.5 w-2.5 mr-1 text-emerald-600" />
                        v{prescription.archiveVersion || 1} R2
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#7A746F]">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Medicines Summary List */}
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7A746F]">
            Prescribed Medicines ({prescription.items.length})
          </div>

          {prescription.items.length === 0 ? (
            <p className="text-xs italic text-[#7A746F]">No medicines listed.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {prescription.items.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE3D9] bg-[#FAF8F5] px-2.5 py-1 text-xs text-[#201C1A]"
                >
                  <span className="font-medium">{item.brandName}</span>
                  {item.strength && (
                    <span className="text-[11px] text-[#7A746F]">({item.strength})</span>
                  )}
                  <span className="rounded bg-[#EAE3D9] px-1 py-0.2 text-[10px] font-semibold text-[#201C1A]">
                    {item.frequency}
                  </span>
                  {item.duration && (
                    <span className="text-[10px] text-[#7A746F]">• {item.duration}</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Clinical Advice / Instructions preview */}
        {prescription.advice && (
          <div className="rounded-xl bg-[#F8F5F0] p-2.5 text-xs text-[#504A45] border border-[#EAE3D9]/60 line-clamp-2">
            <span className="font-semibold text-[#201C1A]">Advice: </span>
            {prescription.advice}
          </div>
        )}

        {/* Follow-up Note */}
        {formattedFollowUp && (
          <div className="text-xs text-[#7A746F]">
            <span className="font-medium text-[#201C1A]">Next Follow-up: </span>
            {formattedFollowUp}
            {prescription.followUpInstructions && ` (${prescription.followUpInstructions})`}
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between pt-2 border-t border-[#EAE3D9]/50">
          <div className="flex items-center gap-2">
            {isDraft && onDeleteDraft && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteDraft(prescription.id)}
                className="h-8 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Discard Draft
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDraft ? (
              <Link href={`/patients/${patientId}/prescriptions/${prescription.id}/edit`}>
                <Button
                  variant="primary"
                  size="sm"
                  className="h-8 gap-1.5 text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Draft</span>
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `/api/prescriptions/${prescription.id}/pdf?download=1`,
                      "_blank"
                    )
                  }
                  className="h-8 gap-1 text-xs text-[#7A746F] hover:text-[#201C1A]"
                  title="Download PDF"
                >
                  <Download className="h-3 w-3" />
                  <span>PDF</span>
                </Button>
                <Link href={`/patients/${patientId}/prescriptions/${prescription.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs hover:border-[#201C1A]"
                  >
                    <span>View Details</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
