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
import { getPatientRepository } from "@/lib/data";
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
      const payload: CreatePatientDTO = {
        ...(data as CreatePatientDTO),
        chamberId: (data as CreatePatientDTO).chamberId || activeChamber.id,
      };
      const created = await repo.createPatient(payload);
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
