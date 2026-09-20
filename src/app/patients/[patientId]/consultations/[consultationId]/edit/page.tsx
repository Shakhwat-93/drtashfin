"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";
import { useConsultation, ConsultationForm } from "@/features/consultations";
import { UpdateConsultationDTO } from "@/types/consultation";

export default function EditConsultationPage({
  params,
}: {
  params: Promise<{ patientId: string; consultationId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { patientId, consultationId } = unwrappedParams;
  const router = useRouter();

  const {
    patient,
    isLoading: isPatientLoading,
    error: patientError,
  } = usePatient(patientId);

  const {
    consultation,
    isLoading: isConsultationLoading,
    isUpdating,
    updateConsultation,
    error: consultationError,
  } = useConsultation(consultationId);

  const isLoading = isPatientLoading || isConsultationLoading;

  const handleUpdateConsultation = async (data: UpdateConsultationDTO) => {
    try {
      await updateConsultation(data);
      router.push(
        `/patients/${patient?.patientId || patientId}/consultations/${consultationId}`
      );
    } catch (err) {
      throw err;
    }
  };

  if (isLoading) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-36 rounded-lg" />
          <Skeleton className="h-20 w-full rounded-xl" />
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
      <PageContainer className="space-y-6 max-w-4xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href={`/patients/${patient.patientId}/consultations/${consultation.id}`}
          >
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Consultation Document</span>
            </Button>
          </Link>
          <span className="text-xs text-[#7A746F]">/</span>
          <span className="text-xs font-semibold text-[#201C1A]">
            Edit Record
          </span>
        </div>

        {/* Edit Form Card */}
        <Card className="border border-[#EAE3D9] bg-white shadow-xs p-6 sm:p-8">
          <ConsultationForm
            mode="edit"
            patient={patient}
            initialData={consultation}
            isSubmitting={isUpdating}
            onSubmit={handleUpdateConsultation}
            onCancel={() =>
              router.push(
                `/patients/${patient.patientId}/consultations/${consultation.id}`
              )
            }
          />
        </Card>
      </PageContainer>
    </AdminShell>
  );
}
