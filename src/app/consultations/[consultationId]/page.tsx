"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, AlertCircle, Stethoscope } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";
import { useConsultation, ConsultationDetail } from "@/features/consultations";

export default function StandaloneConsultationDetailPage({
  params,
}: {
  params: Promise<{ consultationId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { consultationId } = unwrappedParams;

  const {
    consultation,
    isLoading: isConsultationLoading,
    error: consultationError,
  } = useConsultation(consultationId);

  const {
    patient,
    isLoading: isPatientLoading,
    error: patientError,
  } = usePatient(consultation?.patientId);

  const isLoading = isConsultationLoading || (Boolean(consultation?.patientId) && isPatientLoading);

  if (isLoading) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-44 rounded-lg" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </PageContainer>
      </AdminShell>
    );
  }

  if (consultationError || !consultation) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Link href="/consultations">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Consultations</span>
            </Button>
          </Link>
          <EmptyState
            icon={AlertCircle}
            title="Consultation Record Not Found"
            description={
              consultationError ||
              `The clinical consultation record "${consultationId}" could not be located in the database.`
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  if (patientError || !patient) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Link href="/consultations">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Consultations</span>
            </Button>
          </Link>
          <EmptyState
            icon={AlertCircle}
            title="Associated Patient Record Not Found"
            description={
              patientError ||
              `The patient linked to this consultation (ID: "${consultation.patientId}") could not be retrieved.`
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#EAE3D9] print:hidden">
          <Link href="/consultations">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Consultations Registry</span>
            </Button>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#7A746F] min-w-0 max-w-full">
            <Stethoscope className="h-3.5 w-3.5 text-[#DE4F3C] shrink-0" />
            <span className="truncate">Encounter ID: <strong className="font-mono text-[#201C1A]">{consultation.id}</strong></span>
          </div>
        </div>

        <ConsultationDetail consultation={consultation} patient={patient} />
      </PageContainer>
    </AdminShell>
  );
}
