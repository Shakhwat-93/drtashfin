"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";
import { useConsultation, ConsultationDetail } from "@/features/consultations";

export default function ConsultationDetailPage({
  params,
}: {
  params: Promise<{ patientId: string; consultationId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { patientId, consultationId } = unwrappedParams;

  const {
    patient,
    isLoading: isPatientLoading,
    error: patientError,
  } = usePatient(patientId);

  const {
    consultation,
    isLoading: isConsultationLoading,
    error: consultationError,
  } = useConsultation(consultationId);

  const isLoading = isPatientLoading || isConsultationLoading;

  if (isLoading) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
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

  if (consultationError || !consultation) {
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
            title="Consultation Record Not Found"
            description={
              consultationError ||
              `The consultation record "${consultationId}" could not be located.`
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        <ConsultationDetail consultation={consultation} patient={patient} />
      </PageContainer>
    </AdminShell>
  );
}
