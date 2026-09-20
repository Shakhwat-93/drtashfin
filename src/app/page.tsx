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
  CardDescription,
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
} from "@/components/ui";

// ==============================================================================
// STATIC DESIGN PLACEHOLDERS ONLY — Phase 02
// Do NOT connect to Supabase/database in this phase.
// All values below are design tokens to showcase visual hierarchy and layout.
// ==============================================================================

interface StatCardData {
  title: string;
  value: string | number;
  subtext: string;
  icon: React.ElementType;
  badgeText: string;
  badgeVariant: "neutral" | "info" | "warning" | "success";
}

const STATIC_STATS: StatCardData[] = [
  {
    title: "Today's Patients",
    value: 12,
    subtext: "4 completed · 8 remaining",
    icon: Users,
    badgeText: "Scheduled",
    badgeVariant: "info",
  },
  {
    title: "Today's Follow-ups",
    value: 4,
    subtext: "Post-op & medication reviews",
    icon: CalendarClock,
    badgeText: "High Priority",
    badgeVariant: "warning",
  },
  {
    title: "Pending Investigations",
    value: 7,
    subtext: "Lab tests & imaging pending",
    icon: FlaskConical,
    badgeText: "In Progress",
    badgeVariant: "neutral",
  },
  {
    title: "Today's Operations",
    value: 2,
    subtext: "1 Minor · 1 Major procedure",
    icon: Activity,
    badgeText: "OT Ready",
    badgeVariant: "success",
  },
];

interface RecentPatientPlaceholder {
  id: string;
  name: string;
  ageGender: string;
  type: string;
  time: string;
  status: "Completed" | "Waiting" | "In Consultation";
  badgeVariant: "success" | "warning" | "info";
}

const STATIC_RECENT_PATIENTS: RecentPatientPlaceholder[] = [
  {
    id: "P-10492",
    name: "Eleanor Vance",
    ageGender: "54y · Female",
    type: "Cardiology Review",
    time: "09:30 AM",
    status: "Completed",
    badgeVariant: "success",
  },
  {
    id: "P-10493",
    name: "Arthur Pendelton",
    ageGender: "67y · Male",
    type: "Post-Op Angioplasty",
    time: "10:15 AM",
    status: "In Consultation",
    badgeVariant: "info",
  },
  {
    id: "P-10494",
    name: "Miriam Al-Hassan",
    ageGender: "42y · Female",
    type: "Hypertension Check",
    time: "11:00 AM",
    status: "Waiting",
    badgeVariant: "warning",
  },
  {
    id: "P-10495",
    name: "Thomas Sterling",
    ageGender: "38y · Male",
    type: "Echocardiogram Follow-up",
    time: "11:45 AM",
    status: "Waiting",
    badgeVariant: "warning",
  },
];

interface FollowUpPlaceholder {
  id: string;
  name: string;
  condition: string;
  time: string;
  room: string;
}

const STATIC_FOLLOW_UPS: FollowUpPlaceholder[] = [
  {
    id: "F-201",
    name: "Clara Beaumont",
    condition: "Post-bypass recovery assessment",
    time: "01:30 PM",
    room: "Room 3B",
  },
  {
    id: "F-202",
    name: "Julian Mercer",
    condition: "Anticoagulant dosage calibration",
    time: "02:15 PM",
    room: "Room 3B",
  },
  {
    id: "F-203",
    name: "Sonia Kapoor",
    condition: "Cardiac holter monitor analysis",
    time: "03:00 PM",
    room: "Testing Suite 1",
  },
];

interface ActivityPlaceholder {
  id: string;
  title: string;
  description: string;
  time: string;
  icon: React.ElementType;
}

const STATIC_ACTIVITIES: ActivityPlaceholder[] = [
  {
    id: "A-1",
    title: "Lab Report Uploaded",
    description: "Lipid profile uploaded for Patient #P-10492",
    time: "15 min ago",
    icon: FileCheck2,
  },
  {
    id: "A-2",
    title: "Prescription Dispatched",
    description: "Digital Rx issued for Eleanor Vance",
    time: "35 min ago",
    icon: Stethoscope,
  },
  {
    id: "A-3",
    title: "Critical Alert Cleared",
    description: "Investigation reviewed for OT patient Arthur Pendelton",
    time: "1 hour ago",
    icon: AlertCircle,
  },
];

export default function DashboardPage() {
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = React.useState(false);

  return (
    <AdminShell>
      <PageContainer>
        {/* Page Header with Breadcrumb/Label and Quick Actions */}
        <PageHeader
          label="CLINIC OVERVIEW"
          title="Good Morning, Doctor"
          description="Here's what's happening with your patients today."
          actions={
            <>
              <Button
                variant="primary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => setIsNewPatientModalOpen(true)}
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
          {STATIC_STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card
                key={stat.title}
                className="hover:border-[#DFD7CB] hover:shadow-[0_4px_12px_rgba(32,28,26,0.05)] transition-all duration-200"
              >
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#7A746F]">
                    {stat.title}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF5EE] border border-[#EAE3D9] text-[#201C1A]">
                    <Icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-serif text-3xl font-medium tracking-tight text-[#201C1A]">
                      {stat.value}
                    </span>
                    <Badge variant={stat.badgeVariant} size="sm" hasDot>
                      {stat.badgeText}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#7A746F]">{stat.subtext}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Grid: Recent Patients & Side Panels */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Patients Table (Spans 2 cols on desktop) */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Patients</CardTitle>
                  <CardDescription>
                    Patients seen or waiting for consults today (Static Placeholder)
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-0">
                <TableContainer className="border-0 sm:border rounded-none sm:rounded-xl">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {STATIC_RECENT_PATIENTS.map((patient) => (
                        <TableRow key={patient.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-serif text-sm font-medium text-[#201C1A]">
                                {patient.name}
                              </span>
                              <span className="text-[11px] text-[#7A746F]">
                                {patient.id} · {patient.ageGender}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-[#201C1A]">
                            {patient.type}
                          </TableCell>
                          <TableCell>
                            <Badge variant={patient.badgeVariant} size="sm" hasDot>
                              {patient.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[#7A746F]">
                            {patient.time}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm">
                              Open File
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Follow-ups & Recent Activity */}
          <div className="space-y-6">
            {/* Today's Follow-ups */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Today&apos;s Follow-ups</CardTitle>
                  <CardDescription>Scheduled post-consultations</CardDescription>
                </div>
                <Badge variant="neutral" size="sm">
                  {STATIC_FOLLOW_UPS.length} Today
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {STATIC_FOLLOW_UPS.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-[#FAF5EE]/70 border border-[#EAE3D9] hover:bg-[#FAF5EE] transition-colors"
                  >
                    <div className="space-y-1">
                      <h4 className="font-serif text-sm font-medium text-[#201C1A]">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[#7A746F] leading-snug">
                        {item.condition}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-[11px] text-[#7A746F]">
                        <Clock className="h-3 w-3" />
                        <span>{item.time}</span>
                        <span>•</span>
                        <span>{item.room}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-7 px-2">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>System log of clinical events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {STATIC_ACTIVITIES.map((act) => {
                  const Icon = act.icon;
                  return (
                    <div key={act.id} className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FAF5EE] border border-[#EAE3D9] text-[#DE4F3C]">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#201C1A]">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-[#7A746F] truncate">
                          {act.description}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#7A746F] whitespace-nowrap">
                        {act.time}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Demonstration Modal for Accessible Dialog Primitive */}
        <Modal
          isOpen={isNewPatientModalOpen}
          onClose={() => setIsNewPatientModalOpen(false)}
        >
          <ModalHeader>
            <ModalTitle>Register New Patient (UI Prototype)</ModalTitle>
            <ModalDescription>
              Demonstrating visual form inputs and modal ergonomics. No real backend data is recorded in Phase 02.
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-4">
            <div className="space-y-1.5">
              <Label isRequired>Full Name</Label>
              <Input placeholder="e.g. Margaret Sullivan" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label isRequired>Date of Birth</Label>
                <Input type="date" />
              </div>
              <div className="space-y-1.5">
                <Label isRequired>Gender</Label>
                <Select defaultValue="female">
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Primary Complaint / Reason for Visit</Label>
              <Input placeholder="e.g. Chest tightness on exertion" />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => setIsNewPatientModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsNewPatientModalOpen(false)}
            >
              Save Patient (UI Only)
            </Button>
          </ModalFooter>
        </Modal>
      </PageContainer>
    </AdminShell>
  );
}
