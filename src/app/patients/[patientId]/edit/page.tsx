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
import { PatientForm, usePatient } from "@/features/patients";
import { UpdatePatientDTO } from "@/types/patient";

export default function EditPatientPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { patientId } = unwrappedParams;
  const router = useRouter();

  const {
    patient,
    isLoading,
    error,
    isUpdating,
    updatePatient,
  } = usePatient(patientId);

  const handleUpdatePatient = async (data: UpdatePatientDTO) => {
    try {
      await updatePatient(data);
      router.push(`/patients/${patient?.patientId || patientId}`);
    } catch (err) {
      throw err;
    }
  };

  if (isLoading) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <Card className="p-6 border border-[#EAE3D9] bg-white">
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </PageContainer>
      </AdminShell>
    );
  }

  if (error || !patient) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6">
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
          <EmptyState
            icon={AlertCircle}
            title="Patient Not Found"
            description={
              error || `The patient record "${patientId}" could not be located.`
            }
            action={
              <Link href="/patients">
                <Button variant="primary" size="sm">
                  Return to Patient Directory
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
              <span>Back to Patient Profile</span>
            </Button>
          </Link>
        </div>

        {/* Edit Form Container */}
        <Card className="border border-[#EAE3D9] bg-white shadow-xs p-6">
          <PatientForm
            mode="edit"
            initialData={patient}
            isSubmitting={isUpdating}
            onSubmit={handleUpdatePatient}
            onCancel={() => router.push(`/patients/${patient.patientId}`)}
          />
        </Card>
      </PageContainer>
    </AdminShell>
  );
}
