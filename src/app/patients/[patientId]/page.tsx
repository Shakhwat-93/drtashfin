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
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePatient } from "@/features/patients";

export default function PatientProfilePage({
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => alert("Consultation module will be connected in upcoming clinical phase.")}
            >
              <Stethoscope className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>New Visit</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => alert("Investigation module will be connected in upcoming clinical phase.")}
            >
              <FlaskConical className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Order Investigation</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => alert("Prescription module will be connected in upcoming clinical phase.")}
            >
              <FileText className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>New Prescription</span>
            </Button>

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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Vitals Summary Card */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] mb-3">
                  Key Parameters
                </h4>
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
                    <span className="text-[#7A746F]">Weight</span>
                    <span className="font-semibold text-[#201C1A]">{patient.weight ? `${patient.weight} kg` : "Not recorded"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#7A746F]">Blood Group</span>
                    <span className="font-semibold text-[#DE4F3C]">{patient.bloodGroup || "Not recorded"}</span>
                  </div>
                </div>
              </Card>

              {/* Patient Contact Summary */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] mb-3">
                  Contact Information
                </h4>
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Primary Phone</span>
                    <span className="font-semibold text-[#201C1A]">{patient.phone || "—"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#FAF5EE]">
                    <span className="text-[#7A746F]">Email</span>
                    <span className="font-semibold text-[#201C1A] truncate max-w-[150px]">{patient.email || "—"}</span>
                  </div>
                  <div className="py-1.5">
                    <span className="text-[#7A746F] block mb-0.5">Address</span>
                    <span className="font-semibold text-[#201C1A] leading-relaxed block">{patient.address || "No address recorded"}</span>
                  </div>
                </div>
              </Card>

              {/* Practice Status Card */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F] mb-3">
                  Profile Status
                </h4>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-medium text-[#201C1A]">Active Clinical Record</span>
                  </div>
                  <p className="text-[#7A746F] leading-relaxed">
                    Patient file is securely maintained in practice storage. Consultations and records are linked to ID {patient.patientId}.
                  </p>
                  <div className="pt-2">
                    <Link href={`/patients/${patient.patientId}/edit`}>
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        Update Information
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 2. Visits Tab */}
          <TabsContent value="visits">
            <EmptyState
              icon={Stethoscope}
              title="No Visits Recorded Yet"
              description="Clinical consultations, chief complaints, and examination notes will be maintained here."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Consultations will be implemented in upcoming clinical phase.")}
                >
                  Start New Consultation
                </Button>
              }
            />
          </TabsContent>

          {/* 3. Medical History Tab */}
          <TabsContent value="history">
            <EmptyState
              icon={History}
              title="Medical History"
              description="Past medical conditions, chronic illnesses, surgeries, and family histories will be summarized here."
            />
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
          <TabsContent value="prescriptions">
            <EmptyState
              icon={FileText}
              title="No Prescriptions Issued"
              description="Prescribed medications, dosages, treatment durations, and instructions will appear here."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => alert("Prescription creation will be implemented in upcoming clinical phase.")}
                >
                  Write Prescription
                </Button>
              }
            />
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
