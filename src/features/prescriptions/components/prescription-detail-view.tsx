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
  ShieldCheck,
  Download,
  ExternalLink,
  CloudUpload,
  Copy,
  Check,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { Patient } from "@/types/patient";
import { Prescription } from "@/types/prescription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OFFICIAL_DOCTOR_PROFILE } from "@/config/doctor-profile";
import { usePrescriptionArchive } from "../hooks/use-prescription-archive";

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
  const [copiedHash, setCopiedHash] = React.useState(false);
  const [showIntegrityCard, setShowIntegrityCard] = React.useState(false);

  const {
    isArchiving,
    isVerifying,
    archiveError,
    verifyError,
    verification,
    versions,
    isArchived,
    latestDocument,
    archivePrescription,
    verifyIntegrity,
    downloadPdf,
    openPdf,
  } = usePrescriptionArchive(prescription.id);

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

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleVerify = async () => {
    setShowIntegrityCard(true);
    await verifyIntegrity();
  };

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

        <div className="flex flex-wrap items-center gap-2">
          {!isFinalized ? (
            <>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `/api/prescriptions/${prescription.id}/pdf?preview=1`,
                    "_blank"
                  )
                }
                className="gap-1.5 h-8 text-xs text-[#7A746F]"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Preview Draft PDF</span>
              </Button>
            </>
          ) : (
            <>
              {/* Official Cloudflare R2 Archival Action */}
              {!isArchived ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archivePrescription()}
                  disabled={isArchiving}
                  className="gap-1.5 h-8 text-xs border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium"
                >
                  <CloudUpload
                    className={cn(
                      "h-3.5 w-3.5",
                      isArchiving && "animate-spin"
                    )}
                  />
                  <span>
                    {isArchiving
                      ? "Securing to R2..."
                      : "Secure to Cloudflare R2"}
                  </span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="gap-1.5 h-8 text-xs border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-medium"
                >
                  <ShieldCheck
                    className={cn(
                      "h-3.5 w-3.5 text-emerald-700",
                      isVerifying && "animate-spin"
                    )}
                  />
                  <span>
                    {isVerifying ? "Verifying Hash..." : "Verify Integrity"}
                  </span>
                </Button>
              )}

              {/* View PDF Stream */}
              <Button
                variant="outline"
                size="sm"
                onClick={openPdf}
                className="gap-1.5 h-8 text-xs hover:border-[#201C1A]"
              >
                <ExternalLink className="h-3.5 w-3.5 text-[#7A746F]" />
                <span>View PDF</span>
              </Button>

              {/* Download Official PDF */}
              <Button
                variant="primary"
                size="sm"
                onClick={downloadPdf}
                className="gap-1.5 h-8 text-xs font-medium shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF</span>
              </Button>
            </>
          )}

          {/* Browser Quick Print */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 h-8 text-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Cloudflare R2 Archive & Cryptographic Integrity Banner */}
      {isFinalized && (
        <div className="rounded-2xl border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl border",
                  isArchived
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                )}
              >
                {isArchived ? (
                  <ShieldCheck className="h-4 w-4" />
                ) : (
                  <CloudUpload className="h-4 w-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                    {isArchived
                      ? `Cloudflare R2 Official Archive (v${latestDocument?.version || 1})`
                      : "Cloudflare R2 Archival Pending"}
                  </h4>
                  {isArchived ? (
                    <Badge variant="success" size="sm" className="text-[10px]">
                      Encrypted & Immutable
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" className="text-[10px]">
                      Action Required
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-[#7A746F] mt-0.5">
                  {isArchived
                    ? "Official immutable PDF persisted in private R2 bucket with SHA-256 cryptographic fingerprint."
                    : "Finalized clinical prescription is ready for official PDF generation and R2 cloud archival."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isArchived && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => archivePrescription()}
                  disabled={isArchiving}
                  className="h-7 text-xs font-medium gap-1.5"
                >
                  <CloudUpload className="h-3 w-3" />
                  <span>{isArchiving ? "Securing..." : "Archive to R2 Now"}</span>
                </Button>
              )}
              {isArchived && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowIntegrityCard(!showIntegrityCard)}
                  className="h-7 text-xs gap-1.5 text-[#504A45]"
                >
                  <span>
                    {showIntegrityCard ? "Hide Details" : "View Hash & Audit"}
                  </span>
                </Button>
              )}
            </div>
          </div>

          {(archiveError || verifyError) && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-2.5 text-xs text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{archiveError || verifyError}</span>
            </div>
          )}

          {/* Expanded Cryptographic Integrity Audit Details */}
          {(showIntegrityCard || verification) && latestDocument && (
            <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-4 text-xs space-y-3 mt-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EAE3D9] pb-2">
                <span className="font-semibold text-[#201C1A]">
                  Cryptographic Integrity Report
                </span>
                {verification ? (
                  <Badge
                    variant={verification.matches ? "success" : "danger"}
                    className="text-[10px] font-mono"
                  >
                    {verification.matches
                      ? "SHA-256 MATCH VERIFIED"
                      : "INTEGRITY MISMATCH"}
                  </Badge>
                ) : (
                  <span className="text-[11px] text-[#7A746F]">
                    Click &quot;Verify Integrity&quot; to audit live
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-[#7A746F] block">SHA-256 Digest:</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <code className="rounded bg-white px-2 py-0.5 border border-[#EAE3D9] font-mono text-[10px] text-[#201C1A] select-all truncate max-w-[280px]">
                      {latestDocument.contentHash}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyHash(latestDocument.contentHash)}
                      className="p-1 hover:bg-[#EAE3D9]/60 rounded text-[#7A746F] hover:text-[#201C1A]"
                      title="Copy SHA-256 Hash"
                    >
                      {copiedHash ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[#7A746F] block">R2 Storage Object Key:</span>
                  <code className="font-mono text-[10px] text-[#201C1A] block truncate mt-0.5">
                    {latestDocument.r2Key}
                  </code>
                </div>

                <div>
                  <span className="text-[#7A746F] block">Archived At (UTC):</span>
                  <span className="font-medium text-[#201C1A]">
                    {new Date(latestDocument.archivedAt).toUTCString()}
                  </span>
                </div>

                <div>
                  <span className="text-[#7A746F] block">File Size & Version:</span>
                  <span className="font-medium text-[#201C1A]">
                    {latestDocument.fileSizeBytes
                      ? `${(latestDocument.fileSizeBytes / 1024).toFixed(1)} KB`
                      : "—"}{" "}
                    • Version {latestDocument.version}
                  </span>
                </div>
              </div>

              {verification?.details && (
                <div
                  className={cn(
                    "rounded-lg p-2.5 text-[11px] border",
                    verification.matches
                      ? "bg-emerald-50/50 border-emerald-200 text-emerald-900"
                      : "bg-red-50 border-red-200 text-red-900"
                  )}
                >
                  <p>{verification.details}</p>
                </div>
              )}

              {/* Version History pills if multiple versions exist */}
              {versions.length > 1 && (
                <div className="border-t border-[#EAE3D9] pt-2">
                  <span className="text-[11px] font-semibold text-[#7A746F] block mb-1.5">
                    Archive Version History ({versions.length}):
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {versions.map((ver) => (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() =>
                          window.open(
                            `/api/prescriptions/${prescription.id}/pdf?version=${ver.version}`,
                            "_blank"
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#EAE3D9] bg-white px-2.5 py-1 text-[11px] text-[#201C1A] hover:bg-[#FAF5EE]"
                      >
                        <span className="font-bold">v{ver.version}</span>
                        <span className="text-[#7A746F]">
                          ({new Date(ver.archivedAt).toLocaleDateString()})
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 text-[#7A746F]" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Medico-Legal Disclaimer */}
              <div className="text-[10px] text-[#7A746F] pt-1">
                Notice: Cryptographic document integrity verified via SHA-256 hash
                comparison against Cloudflare R2 bucket. Attending Clinician visual
                verification block. Full PKI X.509 digital certificate signing is
                reserved for licensed CA integration.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Clinical Prescription Paper (A4 Style) */}
      <div className="rounded-2xl border border-[#EAE3D9] bg-white p-6 sm:p-10 shadow-sm print:border-none print:shadow-none print:p-0 space-y-6">
        {/* Clinician & Clinic Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b-2 border-[#201C1A] pb-6">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#201C1A] tracking-tight">
              {OFFICIAL_DOCTOR_PROFILE.fullName}
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#DE4F3C] mt-0.5">
              {OFFICIAL_DOCTOR_PROFILE.qualifications} • {OFFICIAL_DOCTOR_PROFILE.primaryDesignation}
            </p>
            <p className="text-xs text-[#7A746F] mt-1">
              {OFFICIAL_DOCTOR_PROFILE.workplace}
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
            {latestDocument && (
              <p className="font-mono text-[9px] text-[#7A746F]">
                SHA-256: {latestDocument.contentHash}
              </p>
            )}
          </div>

          <div className="text-right sm:min-w-[200px] border-t border-[#201C1A] pt-2">
            <p className="font-serif text-sm font-bold text-[#201C1A]">
              {OFFICIAL_DOCTOR_PROFILE.fullName}
            </p>
            <p className="text-[11px] text-[#7A746F]">{OFFICIAL_DOCTOR_PROFILE.primaryDesignation}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
