import * as React from "react";
import { Medicine } from "@/types/medicine";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill, Building2, ExternalLink, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MedicineCardProps {
  medicine: Medicine;
  className?: string;
  onSelect?: (medicine: Medicine) => void;
}

export function MedicineCard({ medicine, className, onSelect }: MedicineCardProps) {
  return (
    <Card className={cn("overflow-hidden border-[#EAE3D9] transition-all hover:border-[#DE4F3C]/40 hover:shadow-xs", className)}>
      <CardHeader className="bg-[#FAF8F5] pb-3 border-b border-[#EAE3D9]/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="font-serif text-base sm:text-lg font-semibold text-[#201C1A]">
                {medicine.brandName}
              </CardTitle>
              {medicine.strength && (
                <Badge variant="neutral" className="border-[#C4BCB3] text-[#201C1A] text-xs font-semibold">
                  {medicine.strength}
                </Badge>
              )}
              {medicine.dosageForm && (
                <Badge variant="neutral" className="bg-[#EAE3D9] text-[#201C1A] text-[10px]">
                  {medicine.dosageForm}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#7A746F] mt-1">
              Generic: <span className="font-medium text-[#201C1A] italic">{medicine.genericName}</span>
            </p>
          </div>

          {medicine.sourceUrl && (
            <a
              href={medicine.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#7A746F] hover:text-[#DE4F3C] transition-colors p-1"
              title="View on MedEx"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-3.5 space-y-3 text-xs">
        {medicine.manufacturer && (
          <div className="flex items-center gap-1.5 text-[#504A45]">
            <Building2 className="h-3.5 w-3.5 text-[#7A746F] shrink-0" />
            <span className="font-medium">{medicine.manufacturer}</span>
          </div>
        )}

        {medicine.indications && (
          <div className="rounded-lg bg-[#F8F5F0] p-2.5 space-y-1">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-[#201C1A]">
              <Info className="h-3 w-3 text-[#DE4F3C]" />
              <span>Indications</span>
            </div>
            <p className="text-[11px] text-[#504A45] leading-relaxed">
              {medicine.indications}
            </p>
          </div>
        )}

        {medicine.dosageDescription && (
          <div className="rounded-lg bg-[#FAF8F5] p-2.5 space-y-1 border border-[#EAE3D9]/60">
            <span className="block text-[11px] font-semibold text-[#201C1A]">
              Standard Reference Dosage:
            </span>
            <p className="text-[11px] text-[#504A45] leading-relaxed">
              {medicine.dosageDescription}
            </p>
          </div>
        )}

        {/* Clinical Disclaimer */}
        <div className="flex items-start gap-1.5 text-[10px] text-[#A83D2F] pt-1">
          <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            Professional reference only. Doctor must prescribe appropriate dosage per patient vitals and condition.
          </span>
        </div>

        {onSelect && (
          <button
            type="button"
            onClick={() => onSelect(medicine)}
            className="w-full mt-2 rounded-lg bg-[#DE4F3C] py-1.5 text-xs font-semibold text-white hover:bg-[#C94231] transition-colors"
          >
            Select Medicine
          </button>
        )}
      </CardContent>
    </Card>
  );
}
