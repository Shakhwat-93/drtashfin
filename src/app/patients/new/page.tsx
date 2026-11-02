"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PatientForm } from "@/features/patients";
import { CreatePatientDTO, UpdatePatientDTO } from "@/types/patient";
import { DiagnosticReportCategory } from "@/types/diagnostic-report";
import {
  getPatientRepository,
  getFollowUpRepository,
  getDiagnosticReportRepository,
  getPrescriptionRepository,
} from "@/lib/data";
import { formatChamberPatientId, generateNextChamberPatientId } from "@/lib/data/id-generator";
import { useChamber } from "@/features/chamber";

export default function NewPatientPage() {
  const router = useRouter();
  const { activeChamber } = useChamber();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [nextPatientId, setNextPatientId] = React.useState<string>("");

  React.useEffect(() => {
    async function loadNextId() {
      try {
        const repo = getPatientRepository();
        const res = await repo.getPatients({
          chamberId: activeChamber.id,
          pageSize: 100,
        });
        const prefix = activeChamber.patientIdPrefix;
        const nextId = generateNextChamberPatientId(
          prefix,
          res.items.map((p) => p.patientId)
        );
        setNextPatientId(nextId);
      } catch {
        setNextPatientId(formatChamberPatientId(activeChamber.patientIdPrefix, 1));
      }
    }
    loadNextId();
  }, [activeChamber]);

  const handleCreatePatient = async (data: CreatePatientDTO | UpdatePatientDTO) => {
    setIsSubmitting(true);
    try {
      const repo = getPatientRepository();
      const patientData = data as CreatePatientDTO;
      const payload: CreatePatientDTO = {
        ...patientData,
        chamberId: patientData.chamberId || activeChamber.id,
      };
      const created = await repo.createPatient(payload);

      // 1. Follow-up scheduling integration
      if (patientData.nextFollowUpDate && patientData.nextFollowUpDate.trim() !== "") {
        try {
          const followUpRepo = getFollowUpRepository();
          await followUpRepo.createFollowUp({
            patientId: created.id,
            patientCode: created.patientId,
            chamberId: created.chamberId,
            scheduledDate: patientData.nextFollowUpDate.trim(),
            reason:
              patientData.nextFollowUpReason?.trim() ||
              "Initial post-registration follow-up",
            priority: patientData.nextFollowUpPriority || "routine",
          });
        } catch (fErr) {
          console.error("Failed to schedule initial follow-up:", fErr);
        }
      }

      // 2. Diagnostic Investigation integration
      if (patientData.investigationName && patientData.investigationName.trim() !== "") {
        try {
          const diagRepo = getDiagnosticReportRepository();
          await diagRepo.createReport({
            patientId: created.id,
            testName: patientData.investigationName.trim(),
            category:
              (patientData.investigationCategory as DiagnosticReportCategory) ||
              "X-ray",
            testDate:
              patientData.investigationDate?.trim() ||
              new Date().toISOString().split("T")[0],
            diagnosticCenter: patientData.investigationFacility?.trim() || null,
            doctorNotes: patientData.investigationNotes?.trim() || null,
            driveUrl: patientData.investigationDriveUrl?.trim() || null,
          });
        } catch (dErr) {
          console.error("Failed to record diagnostic investigation:", dErr);
        }
      }

      // 3. Initial Prescription integration from Current Medications
      if (
        patientData.createPrescriptionFromMedications &&
        patientData.currentMedications?.trim()
      ) {
        try {
          const rxRepo = getPrescriptionRepository();
          const medLines = patientData.currentMedications
            .split(/[\n,;]+/)
            .map((s) => s.trim())
            .filter(Boolean);

          const items = medLines.map((med, idx) => {
            const freqMatch = med.match(/(\d\s*\+\s*\d(?:\s*\+\s*\d)?)/);
            const frequency = freqMatch
              ? freqMatch[1].replace(/\s+/g, "")
              : "1+0+1";
            const cleanName =
              med.replace(/\(?\d\s*\+\s*\d(?:\s*\+\s*\d)?\)?/, "").trim() || med;

            return {
              brandName: cleanName,
              genericName: cleanName,
              frequency,
              route: "Oral",
              orderIndex: idx,
            };
          });

          if (items.length > 0) {
            await rxRepo.createPrescription({
              patientId: created.id,
              chamberId: created.chamberId,
              prescriptionDate: new Date().toISOString().split("T")[0],
              status: "finalized",
              advice: "Current medications recorded during registration.",
              items,
            });
          }
        } catch (rxErr) {
          console.error("Failed to record initial prescription:", rxErr);
        }
      }

      router.push(`/patients/${created.patientId}`);
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  };

  return (
    <AdminShell>
      <PageContainer className="space-y-6 max-w-4xl">
        {/* Navigation Breadcrumb & Chamber Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/patients">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Patients</span>
              </Button>
            </Link>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#EAE3D9] bg-white text-xs">
            <Building2 className="h-3.5 w-3.5 text-[#DE4F3C]" />
            <span className="text-[#7A746F]">Registering for:</span>
            <span className="font-semibold text-[#201C1A]">{activeChamber.name}</span>
            <Badge variant="neutral" className="font-mono text-[10px]">
              {activeChamber.patientIdPrefix}
            </Badge>
          </div>
        </div>

        {/* Form Container Card */}
        <Card className="border border-[#EAE3D9] bg-white shadow-xs p-6">
          <PatientForm
            mode="create"
            nextPatientId={nextPatientId}
            isSubmitting={isSubmitting}
            onSubmit={handleCreatePatient}
            onCancel={() => router.push("/patients")}
          />
        </Card>
      </PageContainer>
    </AdminShell>
  );
}
