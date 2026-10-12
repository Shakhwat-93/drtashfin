"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";
import {
  useSinglePrescription,
  PrescriptionEditor,
} from "@/features/prescriptions";

export default function EditPrescriptionPage({
  params,
}: {
  params: Promise<{ patientId: string; prescriptionId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { patientId, prescriptionId } = unwrappedParams;

  const {
    patient,
    isLoading: isPatientLoading,
    error: patientError,
  } = usePatient(patientId);

  const {
    prescription,
    isLoading: isRxLoading,
    error: rxError,
  } = useSinglePrescription(prescriptionId);

  const isLoading = isPatientLoading || isRxLoading;

  if (isLoading) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </PageContainer>
      </AdminShell>
    );
  }

  if (patientError || !patient) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
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
          <EmptyState
            icon={AlertCircle}
            title="Patient Not Found"
            description={
              patientError ||
              `The patient record "${patientId}" could not be located.`
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  if (rxError || !prescription) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Link href={`/patients/${patient.patientId}`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to {patient.name}</span>
            </Button>
          </Link>
          <EmptyState
            icon={AlertCircle}
            title="Prescription Not Found"
            description={
              rxError ||
              `The prescription record "${prescriptionId}" could not be located.`
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  // Safety check: Finalized prescriptions are immutable
  if (prescription.status === "finalized") {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Link href={`/patients/${patient.patientId}/prescriptions/${prescription.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Prescription</span>
            </Button>
          </Link>
          <EmptyState
            icon={ShieldAlert}
            title="Prescription is Locked"
            description="This prescription has already been finalized and locked for medico-legal audit integrity. Finalized prescriptions cannot be modified."
            action={
              <Link href={`/patients/${patient.patientId}/prescriptions/${prescription.id}`}>
                <Button variant="primary" size="sm">
                  View Finalized Prescription
                </Button>
              </Link>
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        <PrescriptionEditor
          patient={patient}
          existingPrescription={prescription}
        />
      </PageContainer>
    </AdminShell>
  );
}
