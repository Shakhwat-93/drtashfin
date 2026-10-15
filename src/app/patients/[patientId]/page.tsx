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
  FileCheck,
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
import { FollowUpManager, useFollowUps } from "@/features/follow-ups";
import { useChamber } from "@/features/chamber";
import { getChamberById, getChamberByPrefix } from "@/types/chamber";
import {
  DiagnosticReportsList,
  useDiagnosticReports,
} from "@/features/diagnostic-reports";
import {
  ProcedureTimelineList,
  useProcedures,
  ProcedureModal,
} from "@/features/procedures";
import {
  DischargesList,
  useDischarges,
  DischargeModal,
} from "@/features/discharges";

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
  const {
    followUps,
    upcomingFollowUps,
    overdueFollowUps,
  } = useFollowUps(patient?.patientId);

  const { reports: patientReports } = useDiagnosticReports(patient?.patientId);
  const { procedures: patientProcedures, refresh: refreshProcedures } = useProcedures(patient?.patientId);
  const { discharges: patientDischarges, refresh: refreshDischarges } = useDischarges(patient?.patientId);
  const [activeTab, setActiveTab] = React.useState("overview");
  const [isProcedureModalOpen, setIsProcedureModalOpen] = React.useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = React.useState(false);

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
              onClick={() => setActiveTab("investigations")}
            >
              <FlaskConical className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Diagnostic Reports</span>
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
              onClick={() => setActiveTab("followups")}
            >
              <CalendarClock className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Schedule Follow-up</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => setIsProcedureModalOpen(true)}
            >
              <Activity className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Record Procedure</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-[#201C1A]"
              onClick={() => setIsDischargeModalOpen(true)}
            >
              <FileText className="h-3.5 w-3.5 text-[#DE4F3C]" />
              <span>Discharge Patient</span>
            </Button>
          </div>
        </div>

        {/* Clinical Workspace Tabs */}
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="overflow-x-auto pb-1">
            <TabsList className="bg-[#FAF5EE] border border-[#EAE3D9] p-1 gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="visits">Visits</TabsTrigger>
              <TabsTrigger value="history">Medical History</TabsTrigger>
              <TabsTrigger value="investigations" className="gap-1.5">
                <span>Diagnostic Reports</span>
                {patientReports.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#EAE3D9] text-[#201C1A]">
                    {patientReports.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="followups" className="gap-1.5">
                <span>Follow-ups</span>
                {overdueFollowUps.length > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                    {overdueFollowUps.length}
                  </span>
                ) : upcomingFollowUps.length > 0 ? (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#EAE3D9] text-[#201C1A]">
                    {upcomingFollowUps.length}
                  </span>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="operations" className="gap-1.5">
                <span>Operations</span>
                {patientProcedures.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#EAE3D9] text-[#201C1A]">
                    {patientProcedures.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="discharges" className="gap-1.5">
                <span>Discharges</span>
                {patientDischarges.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-[#EAE3D9] text-[#201C1A]">
                    {patientDischarges.length}
                  </span>
                )}
              </TabsTrigger>
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

            {/* Longitudinal Treatment, Follow-up, Diagnostic & Discharge Overview Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 pt-1">
              {/* Follow-up Status Card */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-[#DE4F3C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                        Next Recommended Follow-up
                      </h4>
                    </div>
                    {overdueFollowUps.length > 0 ? (
                      <Badge variant="danger" size="sm">
                        {overdueFollowUps.length} Overdue
                      </Badge>
                    ) : upcomingFollowUps.length > 0 ? (
                      <Badge variant="success" size="sm">
                        Scheduled
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        None Scheduled
                      </Badge>
                    )}
                  </div>

                  {overdueFollowUps.length > 0 ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 space-y-1.5 text-xs text-rose-950">
                      <div className="flex items-center gap-2 font-semibold text-rose-800">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                        <span>Follow-up Overdue Since {overdueFollowUps[0].scheduledDate}</span>
                      </div>
                      <p className="text-[11px] text-rose-900 leading-relaxed">
                        {overdueFollowUps[0].reason || "Routine clinical review pending."}
                      </p>
                    </div>
                  ) : upcomingFollowUps.length > 0 ? (
                    <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-3.5 space-y-1 text-xs">
                      <div className="font-semibold text-[#201C1A]">
                        {new Date(upcomingFollowUps[0].scheduledDate + "T00:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                      <p className="text-[11px] text-[#7A746F] leading-relaxed">
                        Reason: {upcomingFollowUps[0].reason || "Follow-up consultation"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-[#7A746F] leading-relaxed py-2">
                      No future follow-up visits currently scheduled for this patient.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#FAF5EE] flex items-center justify-between">
                  <span className="text-[11px] text-[#7A746F]">
                    Total follow-up events: {followUps.length}
                  </span>
                </div>
              </Card>

              {/* Prescriptions & Clinical Documents Quick Access */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#DE4F3C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                        Medications & Prescriptions
                      </h4>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {patientPrescriptions.length} Records
                    </Badge>
                  </div>

                  {patientPrescriptions.length > 0 ? (
                    <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#201C1A]">
                          Latest Rx: {patientPrescriptions[0].prescriptionCode}
                        </span>
                        <Badge
                          variant={patientPrescriptions[0].status === "finalized" ? "success" : "warning"}
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {patientPrescriptions[0].status}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-[#7A746F] block">
                        Prescribed on {new Date(patientPrescriptions[0].prescriptionDate + "T00:00:00").toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-[#7A746F] leading-relaxed py-2">
                      No prescriptions recorded yet.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#FAF5EE] flex items-center justify-end gap-2">
                  <Link href={`/patients/${patient.patientId}/prescriptions/new`}>
                    <Button variant="primary" size="sm" className="text-xs h-7 px-2.5 gap-1">
                      <FileText className="h-3 w-3" />
                      <span>Write Prescription</span>
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Card 3: Diagnostic Reports Quick Access */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-[#DE4F3C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                        Diagnostic Reports
                      </h4>
                    </div>
                    <Badge variant="neutral" size="sm">
                      {patientReports.length} {patientReports.length === 1 ? "Report" : "Reports"}
                    </Badge>
                  </div>

                  {patientReports.length > 0 ? (
                    <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#201C1A] truncate max-w-[160px]">
                          {patientReports[0].testName}
                        </span>
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          {patientReports[0].category}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#7A746F]">
                        <span>
                          {new Date(patientReports[0].testDate + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {patientReports[0].diagnosticCenter && (
                          <span className="truncate max-w-[120px]">
                            {patientReports[0].diagnosticCenter}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#7A746F] leading-relaxed py-2">
                      No laboratory or scan reports registered yet.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#FAF5EE] flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2.5 gap-1 text-[#201C1A]"
                    onClick={() => setActiveTab("investigations")}
                  >
                    <FlaskConical className="h-3 w-3 text-[#DE4F3C]" />
                    <span>View All Reports</span>
                  </Button>
                </div>
              </Card>

              {/* Card 4: Discharges & Final Clinical Summary Quick Access */}
              <Card className="border border-[#EAE3D9] bg-white p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-[#DE4F3C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A746F]">
                        Discharge & Final Summary
                      </h4>
                    </div>
                    {patientDischarges.length > 0 ? (
                      <Badge variant="success" size="sm">
                        {patientDischarges.length} {patientDischarges.length === 1 ? "Record" : "Records"}
                      </Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">
                        Active Care
                      </Badge>
                    )}
                  </div>

                  {patientDischarges.length > 0 ? (
                    <div className="rounded-xl border border-[#EAE3D9] bg-[#FAF8F5] p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#201C1A] truncate max-w-[150px]">
                          {patientDischarges[0].conditionAtDischarge}
                        </span>
                        <Badge
                          variant={patientDischarges[0].status === "finalized" ? "success" : "warning"}
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {patientDischarges[0].status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#7A746F]">
                        <span>
                          {new Date(patientDischarges[0].dischargeDate + "T00:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {patientDischarges[0].doctorName && (
                          <span className="truncate max-w-[110px]">
                            {patientDischarges[0].doctorName}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#7A746F] leading-relaxed py-2">
                      Patient is currently in active treatment. No formal discharge recorded.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#FAF5EE] flex items-center justify-end gap-2">
                  {patientDischarges.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5 gap-1 text-[#201C1A]"
                      onClick={() => setActiveTab("discharges")}
                    >
                      <FileCheck className="h-3 w-3 text-[#DE4F3C]" />
                      <span>View Discharges</span>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5 gap-1 text-[#201C1A]"
                      onClick={() => setIsDischargeModalOpen(true)}
                    >
                      <FileCheck className="h-3 w-3 text-[#DE4F3C]" />
                      <span>Discharge Patient</span>
                    </Button>
                  )}
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

              {/* Procedure & Surgical History Summary Card */}
              {patientProcedures.length > 0 && (
                <Card className="md:col-span-2 border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[#DE4F3C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                        Operations & Procedures History ({patientProcedures.length})
                      </h4>
                    </div>
                    <button
                      onClick={() => setActiveTab("operations")}
                      className="text-xs font-medium text-[#DE4F3C] hover:underline"
                    >
                      View All Operations →
                    </button>
                  </div>
                  <div className="divide-y divide-[#FAF5EE]">
                    {patientProcedures.slice(0, 3).map((proc) => (
                      <div key={proc.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#201C1A]">{proc.procedureName}</span>
                          <span className="text-[#7A746F] block text-[11px]">
                            {proc.category} • {proc.procedureDate} {proc.hospitalFacility ? `at ${proc.hospitalFacility}` : ""}
                          </span>
                        </div>
                        <Badge variant="neutral" size="sm" className="text-[10px]">
                          {proc.outcome || "Recorded"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Discharge & Final Reports Summary Card */}
              {patientDischarges.length > 0 && (
                <Card className="md:col-span-2 border border-[#EAE3D9] bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-[#DE4F3C]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#201C1A]">
                        Discharges & Final Clinical Reports ({patientDischarges.length})
                      </h4>
                    </div>
                    <button
                      onClick={() => setActiveTab("discharges")}
                      className="text-xs font-medium text-[#DE4F3C] hover:underline"
                    >
                      View All Discharges →
                    </button>
                  </div>
                  <div className="divide-y divide-[#FAF5EE]">
                    {patientDischarges.slice(0, 3).map((dis) => (
                      <div key={dis.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#201C1A]">{dis.conditionAtDischarge}</span>
                          <span className="text-[#7A746F] block text-[11px]">
                            Discharged: {dis.dischargeDate} {dis.doctorName ? `by ${dis.doctorName}` : ""}
                          </span>
                        </div>
                        <Badge
                          variant={dis.status === "finalized" ? "success" : "warning"}
                          size="sm"
                          className="capitalize text-[10px]"
                        >
                          {dis.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* 4. Diagnostic Reports Tab */}
          <TabsContent value="investigations">
            <DiagnosticReportsList patient={patient} />
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
            <FollowUpManager patient={patient} />
          </TabsContent>

          {/* 7. Operations Tab */}
          <TabsContent value="operations">
            <ProcedureTimelineList patient={patient} />
          </TabsContent>

          {/* 8. Discharges Tab */}
          <TabsContent value="discharges">
            <DischargesList patient={patient} />
          </TabsContent>

          {/* 9. Documents Tab */}
          <TabsContent value="documents">
            <EmptyState
              icon={FolderOpen}
              title="No Clinical Documents"
              description="Diagnostic scan attachments, lab reports, and clinical file uploads will be stored here."
            />
          </TabsContent>
        </Tabs>

        {/* Global Record Procedure Modal */}
        {patient && (
          <ProcedureModal
            isOpen={isProcedureModalOpen}
            onClose={() => setIsProcedureModalOpen(false)}
            patientId={patient.id}
            onSuccess={() => {
              refreshProcedures();
              setActiveTab("operations");
            }}
          />
        )}

        {/* Global Patient Discharge Modal */}
        {patient && (
          <DischargeModal
            isOpen={isDischargeModalOpen}
            onClose={() => setIsDischargeModalOpen(false)}
            patientId={patient.id}
            chamberId={patient.chamberId || activeChamber?.id}
            onSuccess={() => {
              refreshDischarges();
              setActiveTab("discharges");
            }}
          />
        )}
      </PageContainer>
    </AdminShell>
  );
}
