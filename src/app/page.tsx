"use client";

import * as React from "react";
import {
  Users,
  CalendarClock,
  FlaskConical,
  Activity,
  Plus,
  Stethoscope,
  Clock,
  ArrowUpRight,
  ChevronRight,
  FileCheck2,
  AlertCircle,
} from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import {
  PageHeader,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableContainer,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  Input,
  Label,
  Select,
  Skeleton,
  EmptyState,
} from "@/components/ui";
import { usePatients, useDashboardMetrics } from "@/features/patients";
import { Gender, BloodGroup } from "@/types";

export default function DashboardPage() {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Form State
  const [fullName, setFullName] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("1985-05-15");
  const [gender, setGender] = React.useState<Gender>("female");
  const [phone, setPhone] = React.useState("");
  const [weight, setWeight] = React.useState<string>("65");
  const [bloodGroup, setBloodGroup] = React.useState<BloodGroup>("O+");

  // Repository-driven Feature Hooks
  const {
    patients,
    isLoading: isPatientsLoading,
    createPatient,
  } = usePatients({
    pageSize: 5,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  const {
    metrics,
    followUps,
    activities,
    isLoading: isMetricsLoading,
  } = useDashboardMetrics();

  const handleRegisterPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      await createPatient({
        name: fullName.trim(),
        dateOfBirth,
        gender,
        weight: weight ? parseFloat(weight) : undefined,
        phone: phone.trim() || undefined,
        bloodGroup,
      });

      // Reset form and close
      setFullName("");
      setPhone("");
      setIsNewPatientModalOpen(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to register patient."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const statCards = [
    {
      title: "Today's Patients",
      value: metrics?.todayPatientsCount ?? 12,
      icon: Users,
      badgeText: "Scheduled",
      badgeVariant: "info" as const,
    },
    {
      title: "Today's Follow-ups",
      value: metrics?.todayFollowUpsCount ?? followUps.length,
      icon: CalendarClock,
      badgeText: "High Priority",
      badgeVariant: "warning" as const,
    },
    {
      title: "Pending Investigations",
      value: metrics?.pendingInvestigationsCount ?? 7,
      icon: FlaskConical,
      badgeText: "In Progress",
      badgeVariant: "neutral" as const,
    },
    {
      title: "Today's Operations",
      value: metrics?.todayOperationsCount ?? 2,
      icon: Activity,
      badgeText: "OT Ready",
      badgeVariant: "success" as const,
    },
  ];

  return (
    <AdminShell>
      <PageContainer>
        {/* Page Header */}
        <PageHeader
          label="CLINIC OVERVIEW"
          title="Good Morning, Doctor"
          actions={
            <>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => {
                  setFormError(null);
                  setIsNewPatientModalOpen(true);
                }}
              >
                + New Patient
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Stethoscope className="h-4 w-4 text-[#DE4F3C]" />}
              >
                New Consultation
              </Button>
              <Button
                variant="secondary"
                leftIcon={<FlaskConical className="h-4 w-4 text-[#7A746F]" />}
              >
                Add Investigation
              </Button>
              <Button
                variant="secondary"
                leftIcon={<Activity className="h-4 w-4 text-[#7A746F]" />}
              >
                Add Operation
              </Button>
            </>
          }
        />

        {/* Key Metrics / Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="hover:border-[#DFD7CB] hover:shadow-[0_4px_12px_rgba(32,28,26,0.05)] transition-all duration-200 min-w-0"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7A746F]">
                    {stat.title}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#201C1A]">
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="pt-2 pb-5">
                  {isMetricsLoading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    <div className="flex items-baseline justify-between">
                      <span className="font-serif text-3xl font-medium tracking-tight text-[#201C1A]">
                        {stat.value}
                      </span>
                      <Badge variant={stat.badgeVariant} size="sm" hasDot>
                        {stat.badgeText}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Grid: Recent Patients & Side Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Patients Table (Spans 2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-4 min-w-0">
            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Recent Patients</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 sm:pt-0">
                <TableContainer responsive="stack" className="border-0 md:border">
                  <Table responsive="stack">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Phone / Contact</TableHead>
                        <TableHead>Blood Group</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isPatientsLoading ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <TableRow key={`skeleton-${idx}`}>
                            <TableCell label="Patient">
                              <Skeleton className="h-8 w-32" />
                            </TableCell>
                            <TableCell label="Phone / Contact">
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell label="Blood Group">
                              <Skeleton className="h-4 w-12" />
                            </TableCell>
                            <TableCell label="Registered">
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell label="Action" isAction className="text-right">
                              <Skeleton className="h-8 w-20 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : patients.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-8 text-center">
                            <EmptyState
                              title="No patients recorded"
                              description="Click '+ New Patient' to register a patient record."
                            />
                          </TableCell>
                        </TableRow>
                      ) : (
                        patients.map((patient) => (
                          <TableRow key={patient.id}>
                            <TableCell label="Patient">
                              <div className="flex flex-col">
                                <span className="font-serif text-sm font-medium text-[#201C1A]">
                                  {patient.name}
                                </span>
                                <span className="text-[11px] text-[#7A746F]">
                                  {patient.patientId} · {patient.age}y · {patient.gender}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell
                              label="Phone / Contact"
                              className="text-xs text-[#201C1A]"
                            >
                              {patient.phone || "No phone recorded"}
                            </TableCell>
                            <TableCell label="Blood Group">
                              <Badge variant="neutral" size="sm">
                                {patient.bloodGroup || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell
                              label="Registered"
                              className="text-xs text-[#7A746F]"
                            >
                              {new Date(patient.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell
                              label="Action"
                              isAction
                              className="text-right"
                            >
                              <Button variant="outline" size="sm">
                                Open File
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Follow-ups & Recent Activity */}
          <div className="space-y-6 min-w-0">
            {/* Today's Follow-ups */}
            <Card className="min-w-0">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle>Today&apos;s Follow-ups</CardTitle>
                <Badge variant="neutral" size="sm">
                  {followUps.length} Today
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {isMetricsLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={`fol-skel-${idx}`} className="h-16 w-full" />
                  ))
                ) : followUps.length === 0 ? (
                  <EmptyState title="No follow-ups today" />
                ) : (
                  followUps.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-3 rounded-lg bg-[#FAF5EE]/70 border border-[#EAE3D9] hover:bg-[#FAF5EE] transition-colors min-w-0"
                    >
                      <div className="space-y-1 min-w-0">
                        <h4 className="font-serif text-sm font-medium text-[#201C1A] truncate">
                          {item.patientName}
                        </h4>
                        <p className="text-xs text-[#7A746F] leading-snug line-clamp-2">
                          {item.reason}
                        </p>
                        <div className="flex items-center gap-2 pt-1 text-[11px] text-[#7A746F]">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{item.scheduledTime}</span>
                          <span>•</span>
                          <span>{item.room}</span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 shrink-0 ml-2"
                        aria-label={`Open follow-up for ${item.patientName}`}
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="min-w-0">
              <CardHeader className="pb-3">
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isMetricsLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <Skeleton key={`act-skel-${idx}`} className="h-10 w-full" />
                  ))
                ) : activities.length === 0 ? (
                  <EmptyState title="No recent activity recorded" />
                ) : (
                  activities.map((act) => {
                    const Icon =
                      act.category === "investigation"
                        ? FileCheck2
                        : act.category === "prescription"
                        ? Stethoscope
                        : AlertCircle;

                    return (
                      <div key={act.id} className="flex items-start gap-3 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C]">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#201C1A] truncate">
                            {act.title}
                          </p>
                          <p className="text-[11px] text-[#7A746F] truncate">
                            {act.description}
                          </p>
                        </div>
                        <span className="text-[10px] text-[#7A746F] whitespace-nowrap shrink-0">
                          {act.timestamp}
                        </span>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modal for Adding New Patient */}
        <Modal
          isOpen={isNewPatientModalOpen}
          onClose={() => setIsNewPatientModalOpen(false)}
        >
          <form onSubmit={handleRegisterPatient}>
            <ModalHeader>
              <ModalTitle>Register New Patient</ModalTitle>
              <ModalDescription>
                Enter patient identity details to initiate clinical file.
              </ModalDescription>
            </ModalHeader>
            <ModalBody className="space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-[#FDF0EE] border border-[#F9D0CA] text-xs text-[#B02A1A]">
                  {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label isRequired>Full Name</Label>
                <Input
                  required
                  placeholder="e.g. Margaret Sullivan"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label isRequired>Date of Birth</Label>
                  <Input
                    required
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label isRequired>Gender</Label>
                  <Select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 68.5"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Blood Group</Label>
                  <Select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input
                  placeholder="e.g. +1 (555) 019-2834"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewPatientModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
              >
                Save Patient
              </Button>
            </ModalFooter>
          </form>
        </Modal>
      </PageContainer>
    </AdminShell>
  );
}
