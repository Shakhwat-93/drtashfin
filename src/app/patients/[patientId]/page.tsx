"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Stethoscope,
  FlaskConical,
  FileText,
  CalendarClock,
  Activity,
  FolderOpen,
  History,
  AlertCircle,
  Building2,
  ShieldAlert,
  Users,
  AlertTriangle,
  HeartPulse,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";
import { ConsultationHistoryList } from "@/features/consultations";
import { usePrescriptions, PrescriptionCard } from "@/features/prescriptions";
import { useChamber } from "@/features/chamber";
import { getChamberById, getChamberByPrefix } from "@/types/chamber";

export default function PatientProfilePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const unwrappedParams = React.use(params);
  const { patientId } = unwrappedParams;

  const { activeChamber } = useChamber();
  const { patient, isLoading, error } = usePatient(patientId);
  const {
    prescriptions: patientPrescriptions,
    isLoading: isRxLoading,
    deleteDraft: handleDeleteDraft,
  } = usePrescriptions(patient?.id);

  const prefix = patient?.patientId.split("-")[0] || "";
  const patientChamber =
    getChamberById(patient?.chamberId) || getChamberByPrefix(prefix);
  const isCrossChamber = Boolean(
    activeChamber &&
      patientChamber &&
      activeChamber.id !== patientChamber.id
  );

  if (isLoading) {
    return (
      <AdminShell>
        <PageContainer className="space-y-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          <Card className="p-6 border border-[#EAE3D9] bg-white">
            <div className="flex items-start gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
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

  const registrationDate = new Date(patient.createdAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <AdminShell>
      <PageContainer className="space-y-6">
        {/* Top Navigation & Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/patients">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs text-[#7A746F] hover:text-[#201C1A]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Patients</span>
              </Button>
            </Link>
            <span className="text-xs text-[#7A746F]">/</span>
            <span className="text-xs font-semibold text-[#201C1A]">
              {patient.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/patients/${patient.patientId}/edit`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-8 text-xs"
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>Edit Profile</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Cross-Chamber Context Notice */}
        {isCrossChamber && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 shadow-2xs">
            <Building2 className="h-4 w-4 shrink-0 text-amber-700" />
            <div>
              <strong className="font-semibold">Cross-Chamber Notice:</strong> This patient is registered under{" "}
              <strong>{patientChamber?.name}</strong>, while your currently active dashboard chamber is{" "}
              <strong>{activeChamber?.name}</strong>. Consultations and records are linked to this patient&apos;s registered chamber.
            </div>
          </div>
        )}

        {/* Doctor Patient Identity Header Card */}
        <div className="rounded-xl border border-[#EAE3D9] bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            {/* Identity Info */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C] font-serif text-2xl font-bold">
                {patient.name.charAt(0).toUpperCase()}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-serif text-xl font-bold text-[#201C1A]">
                    {patient.name}
                  </h1>
                  <Badge
                    variant="neutral"
                    className="font-mono text-xs font-semibold"
                  >
                    {patient.patientId}
                  </Badge>
                  {patientChamber ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FAF5EE] text-[#DE4F3C] border border-[#EAE3D9]">
                      <Building2 className="h-3 w-3" />
                      <span>{patientChamber.name}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Unassigned Chamber
                    </span>
                  )}
                </div>

                {/* Patient Demographics Badges */}
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <Badge variant="neutral" size="sm">
                    {patient.age} years
                  </Badge>
                  <Badge variant="neutral" size="sm" className="capitalize">
                    {patient.gender}
                  </Badge>
                  {patient.bloodGroup && (
                    <Badge variant="primary" size="sm">
                      {patient.bloodGroup}
                    </Badge>
                  )}
                  {patient.weight && (
                    <Badge variant="neutral" size="sm">
                      {patient.weight} kg
                    </Badge>
                  )}
                  {patient.occupation && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#FAF5EE] text-[#7A746F] border border-[#EAE3D9]">
                      <Briefcase className="h-3 w-3 text-[#DE4F3C]" />
                      <span>{patient.occupation}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contact & Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs text-[#7A746F] border-t border-[#EAE3D9] pt-4 md:border-t-0 md:pt-0">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0 text-[#DE4F3C]" />
                <span className="text-[#201C1A] font-medium">
                  {patient.phone || "No phone provided"}
                </span>
              </div>
              {patient.secondaryPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 shrink-0 text-[#7A746F]" />
                  <span className="text-[#201C1A] font-medium">
                    Alt: {patient.secondaryPhone}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 shrink-0 text-[#DE4F3C]" />
                <span className="text-[#201C1A] font-medium truncate max-w-[180px]">
                  {patient.email || "No email provided"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-[#DE4F3C]" />
                <span className="text-[#201C1A] font-medium truncate max-w-[180px]">
                  {patient.address || "No address on file"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-[#DE4F3C]" />
                <span>Registered: {registrationDate}</span>
              </div>
            </div>
          </div>

          {/* Quick Clinical Actions Bar */}
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[#EAE3D9] pt-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#7A746F] mr-2">
              Clinical Actions:
            </div>
            <Link href={`/patients/${patient.patientId}/consultations/new`}>
              <Button
                variant="primary"
                size="sm"
                className="gap-1.5 text-xs font-medium"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>New Consultation</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => alert("Investigation module will be connected in upcoming clinical phase.")}
            >
              <FlaskConical className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Order Investigation</span>
            </Button>

            <Link href={`/patients/${patient.patientId}/prescriptions/new`}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-[#201C1A]"
              >
                <FileText className="h-3.5 w-3.5 text-[#DE4F3C]" />
                <span>New Prescription</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => alert("Follow-up module will be connected in upcoming clinical phase.")}
            >
              <CalendarClock className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Schedule Follow-up</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => alert("Operation planning will be connected in upcoming clinical phase.")}
            >
              <Activity className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Plan Operation</span>
            </Button>
          </div>
        </div>

        {/* Clinical Workspace Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-[#FAF5EE] border border-[#EAE3D9] p-1 gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="history">Medical History</TabsTrigger>
              <TabsTrigger value="investigations">Investigations</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>
          </div>

          {/* 1. Overview Tab */}
          <TabsContent value="overview" className="space-y-5 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Vitals & Identity */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-[#DE4F3C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                    Key Parameters
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Age</span>
                    <span className="font-semibold text-[#201C1A]">{patient.age} yrs</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Date of Birth</span>
                    <span className="font-semibold text-[#201C1A]">{patient.dateOfBirth}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Sex / Gender</span>
                    <span className="font-semibold text-[#201C1A] capitalize">{patient.gender}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Weight</span>
                    <span className="font-semibold text-[#201C1A]">
                      {patient.weight ? `${patient.weight} kg` : "Not recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Blood Group</span>
                    <span className="font-semibold text-[#DE4F3C]">
                      {patient.bloodGroup || "Not recorded"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#7A746F]">Occupation</span>
                    <span className="font-semibold text-[#201C1A]">
                      {patient.occupation || "Not recorded"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card 2: Family & Guardian */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-[#DE4F3C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                    Family & Guardian
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Father&apos;s Name</span>
                    <span className="font-semibold text-[#201C1A]">
                      {patient.fatherName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Mother&apos;s Name</span>
                    <span className="font-semibold text-[#201C1A]">
                      {patient.motherName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Guardian Name</span>
                    <span className="font-semibold text-[#201C1A]">
                      {patient.guardianName || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#7A746F]">Relationship</span>
                    <span className="font-semibold text-[#201C1A]">
                      {patient.guardianRelationship || "—"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card 3: Contact & Addresses */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-[#DE4F3C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                    Contact & Address
                  </h4>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Primary Mobile</span>
                    <span className="font-semibold text-[#201C1A]">{patient.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Alternative Contact</span>
                    <span className="font-semibold text-[#201C1A]">{patient.secondaryPhone || "—"}</span>
                  </div>
                  <div className="py-1 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F] block mb-0.5">Present Address</span>
                    <span className="font-semibold text-[#201C1A] leading-relaxed block">
                      {patient.address || "No address recorded"}
                    </span>
                  </div>
                  <div className="py-1">
                    <span className="text-[#7A746F] block mb-0.5">Permanent Address</span>
                    <span className="font-semibold text-[#201C1A] leading-relaxed block">
                      {patient.permanentAddress || "Same as present / Not recorded"}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Card 4: Emergency Contact & Status */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                      Emergency Contact
                    </h4>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                      <span className="text-[#7A746F]">Contact Name</span>
                      <span className="font-semibold text-[#201C1A]">
                        {patient.emergencyContactName || "Not specified"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                      <span className="text-[#7A746F]">Relationship</span>
                      <span className="font-semibold text-[#201C1A]">
                        {patient.emergencyContactRelationship || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-[#7A746F]">Phone</span>
                      <span className="font-semibold text-[#201C1A]">
                        {patient.emergencyContactPhone || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#FAF5EE]">
                  <Link href={`/patients/${patient.patientId}/edit`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      Update Full Profile
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 2. Visits Tab */}
          <TabsContent value="visits">
            <ConsultationHistoryList patient={patient} />
          </TabsContent>

          {/* 3. Medical History Tab */}
          <TabsContent value="history" className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-[#EAE3D9]/60">
              <div>
                <h3 className="font-serif text-base font-bold text-[#201C1A]">
                  Lifetime Clinical Profile & Medical History
                </h3>
                <p className="text-xs text-[#7A746F]">
                  Permanent background, pre-existing conditions, drug allergies, and confidential clinical notes for {patient.name}.
                </p>
              </div>

              <Link href={`/patients/${patient.patientId}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>Edit Medical Background</span>
                </Button>
              </Link>
            </div>

            {/* Allergy Banner */}
            <div
              className={cn(
                "rounded-xl border p-4 text-xs transition-all",
                patient.allergies
                  ? "border-amber-300 bg-amber-50/80 text-amber-950"
                  : "border-[#EAE3D9] bg-white text-[#7A746F]"
              )}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={cn(
                    "h-5 w-5 shrink-0 mt-0.5",
                    patient.allergies ? "text-amber-600" : "text-[#7A746F]"
                  )}
                />
                <div className="space-y-1">
                  <div className="font-bold text-xs uppercase tracking-wide">
                    {patient.allergies ? "Allergy Alert" : "Allergies"}
                  </div>
                  <p className="text-xs leading-relaxed font-medium">
                    {patient.allergies || "No drug or food allergies on file for this patient."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Chronic Conditions / Past Medical History */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <HeartPulse className="h-4 w-4 text-[#DE4F3C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                    Past Medical History & Chronic Conditions
                  </h4>
                </div>
                <div className="text-xs text-[#201C1A] leading-relaxed whitespace-pre-wrap bg-[#FAF5EE]/50 p-3.5 rounded-lg border border-[#EAE3D9]/60 min-h-[90px]">
                  {patient.medicalHistory || "No chronic illnesses, prior surgeries, or hospitalizations recorded."}
                </div>
              </Card>

              {/* Current Medications */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#DE4F3C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                    Current Medications (Patient-Reported)
                  </h4>
                </div>
                <div className="text-xs text-[#201C1A] leading-relaxed whitespace-pre-wrap bg-[#FAF5EE]/50 p-3.5 rounded-lg border border-[#EAE3D9]/60 min-h-[90px]">
                  {patient.currentMedications || "No active regular medications reported by patient."}
                </div>
              </Card>

              {/* Confidential Doctor Notes */}
              <Card className="md:col-span-2 border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-[#DE4F3C]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                    Confidential Clinical Observations & Patient Notes
                  </h4>
                </div>
                <div className="text-xs text-[#201C1A] leading-relaxed whitespace-pre-wrap bg-[#FAF5EE]/50 p-3.5 rounded-lg border border-[#EAE3D9]/60 min-h-[70px]">
                  {patient.patientNotes || "No patient-level clinical notes recorded."}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 4. Investigations Tab */}
          <TabsContent value="investigations">
            <EmptyState
              icon={FlaskConical}
              title="No Investigations Ordered"
              description="Pathology tests, laboratory orders, and imaging requests will be tracked here."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Investigation orders will be implemented in upcoming clinical phase.")}
                >
                  Order Investigation
                </Button>
              }
            />
          </TabsContent>

          {/* 5. Prescriptions Tab */}
          <TabsContent value="prescriptions" className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1 border-b border-[#EAE3D9]/60">
              <div>
                <h3 className="font-serif text-base font-bold text-[#201C1A]">
                  Prescription Records
                </h3>
                <p className="text-xs text-[#7A746F]">
                  All historical medications, active treatment courses, and instructions for {patient.name}.
                </p>
              </div>

              <Link href={`/patients/${patient.patientId}/prescriptions/new`}>
                <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Write Prescription</span>
                </Button>
              </Link>
            </div>

            {isRxLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
              </div>
            ) : patientPrescriptions.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No Prescriptions Issued"
                description={`No prescriptions have been issued for ${patient.name} yet.`}
                action={
                  <Link href={`/patients/${patient.patientId}/prescriptions/new`}>
                    <Button variant="primary" size="sm" className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Write First Prescription</span>
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                {patientPrescriptions.map((rx) => (
                  <PrescriptionCard
                    key={rx.id}
                    prescription={rx}
                    patientId={patient.patientId}
                    onDeleteDraft={handleDeleteDraft}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* 6. Follow-ups Tab */}
          <TabsContent value="followups">
            <EmptyState
              icon={CalendarClock}
              title="No Follow-up Scheduled"
              description="Next clinic visits, review appointments, and follow-up schedules will be displayed here."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Follow-up scheduling will be implemented in upcoming clinical phase.")}
                >
                  Schedule Appointment
                </Button>
              }
            />
          </TabsContent>

          {/* 7. Operations Tab */}
          <TabsContent value="operations">
            <EmptyState
              icon={Activity}
              title="No Operations Scheduled"
              description="Surgical procedures, operation theater schedules, and post-op summaries will be tracked here."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Operation planning will be implemented in upcoming clinical phase.")}
                >
                  Plan Surgical Procedure
                </Button>
              }
            />
          </TabsContent>

          {/* 8. Documents Tab */}
          <TabsContent value="documents">
            <EmptyState
              icon={FolderOpen}
              title="No Clinical Documents"
              description="Diagnostic scan attachments, lab reports, and clinical file uploads will be stored here."
            />
          </TabsContent>
        </Tabs>
      </PageContainer>
    </AdminShell>
  );
}
