"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";
import { useConsultation } from "@/features/consultations";
import { PrescriptionEditor } from "@/features/prescriptions";

export default function NewPrescriptionPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { patientId } = unwrappedParams;
  const searchParams = useSearchParams();
  const consultationId = searchParams.get("consultationId") || undefined;

  const {
    patient,
    isLoading: isPatientLoading,
    error: patientError,
  } = usePatient(patientId);

  const {
    consultation,
    isLoading: isConsultationLoading,
  } = useConsultation(consultationId);

  const isLoading = isPatientLoading || (Boolean(consultationId) && isConsultationLoading);

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

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        <PrescriptionEditor
          patient={patient}
          consultation={consultation}
        />
      </PageContainer>
    </AdminShell>
  );
}
