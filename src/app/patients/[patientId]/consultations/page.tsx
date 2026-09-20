"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";
import { ConsultationHistoryList } from "@/features/consultations";

export default function PatientConsultationsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { patientId } = unwrappedParams;

  const { patient, isLoading, error } = usePatient(patientId);

  if (isLoading) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </PageContainer>
      </AdminShell>
    );
  }

  if (error || !patient) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6">
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
              error || `The patient record "${patientId}" could not be located.`
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageContainer className="space-y-6 max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3">
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
        </div>

        {/* Page Header */}
        <PageHeader
          title="Consultation Records"
          description={`Historical clinical consultations documented for ${patient.name} (${patient.patientId}).`}
          actions={
            <Link href={`/patients/${patient.patientId}/consultations/new`}>
              <Button variant="primary" className="gap-2">
                <Plus className="h-4 w-4" />
                <span>New Consultation</span>
              </Button>
            </Link>
          }
        />

        {/* Consultations List Component */}
        <ConsultationHistoryList patient={patient} />
      </PageContainer>
    </AdminShell>
  );
}
