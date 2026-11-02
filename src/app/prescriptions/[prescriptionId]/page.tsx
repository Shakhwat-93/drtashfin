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
import {
  useSinglePrescription,
  PrescriptionDetailView,
} from "@/features/prescriptions";

export default function StandalonePrescriptionDetailPage({
  params,
}: {
  params: Promise<{ prescriptionId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { prescriptionId } = unwrappedParams;

  const {
    prescription,
    isLoading: isRxLoading,
    error: rxError,
  } = useSinglePrescription(prescriptionId);

  const {
    patient,
    isLoading: isPatientLoading,
    error: patientError,
  } = usePatient(prescription?.patientId || "");

  const isLoading = isRxLoading || (!!prescription?.patientId && isPatientLoading);

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

  if (rxError || !prescription) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Link href="/prescriptions">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Prescriptions</span>
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

  if (patientError || !patient) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6 max-w-4xl">
          <Link href="/prescriptions">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Prescriptions</span>
            </Button>
          </Link>
          <EmptyState
            icon={AlertCircle}
            title="Patient Not Found"
            description={
              patientError ||
              `Associated patient record could not be loaded.`
            }
          />
        </PageContainer>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        <div className="flex items-center justify-between pb-2">
          <Link href="/prescriptions">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to All Prescriptions</span>
            </Button>
          </Link>
        </div>
        <PrescriptionDetailView
          prescription={prescription}
          patient={patient}
        />
      </PageContainer>
    </AdminShell>
  );
}
