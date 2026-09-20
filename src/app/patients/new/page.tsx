"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PatientForm } from "@/features/patients";
import { CreatePatientDTO, UpdatePatientDTO } from "@/types/patient";
import { getPatientRepository } from "@/lib/data";
import { formatPatientId, parsePatientSequence } from "@/lib/data/id-generator";

export default function NewPatientPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [nextPatientId, setNextPatientId] = React.useState<string>("");

  React.useEffect(() => {
    async function loadNextId() {
      try {
        const repo = getPatientRepository();
        const res = await repo.getPatients({ pageSize: 100 });
        let maxSeq = 0;
        for (const p of res.items) {
          const seq = parsePatientSequence(p.patientId);
          if (seq > maxSeq) maxSeq = seq;
        }
        setNextPatientId(formatPatientId(maxSeq + 1));
      } catch {
        // Fallback default
        setNextPatientId("PT-000001");
      }
    }
    loadNextId();
  }, []);

  const handleCreatePatient = async (data: CreatePatientDTO | UpdatePatientDTO) => {
    setIsSubmitting(true);
    try {
      const repo = getPatientRepository();
      const created = await repo.createPatient(data as CreatePatientDTO);
      router.push(`/patients/${created.patientId}`);
    } catch (err) {
      setIsSubmitting(false);
      throw err;
    }
  };

  return (
    <AdminShell>
      <PageContainer className="space-y-6 max-w-4xl">
        {/* Navigation Breadcrumb */}
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
