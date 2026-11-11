"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Stethoscope,
  FileText,
  CalendarClock,
  Activity,
  LogOut,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Edit2,
} from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableContainer,
  Badge,
  Button,
  Skeleton,
} from "@/components/ui";
import {
  ReportType,
  PatientActivityReportRow,
  ConsultationReportRow,
  PrescriptionReportRow,
  FollowUpReportRow,
  DiagnosticProcedureReportRow,
  DischargeReportRow,
  SmsDeliveryReportRow,
} from "@/types/reports";

export interface ReportsTableProps {
  activeTab: ReportType;
  onTabChange: (tab: ReportType) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  isLoading: boolean;
}

const REPORT_TABS: { id: ReportType; label: string; icon: React.ElementType }[] = [
  { id: "patient-activity", label: "Patient Activity", icon: Users },
  { id: "consultations", label: "Consultations", icon: Stethoscope },
  { id: "prescriptions", label: "Prescriptions", icon: FileText },
  { id: "follow-ups", label: "Follow-ups", icon: CalendarClock },
  { id: "diagnostics-procedures", label: "Diagnostics & Procedures", icon: Activity },
  { id: "discharges", label: "Discharges", icon: LogOut },
  { id: "sms-delivery", label: "SMS Audit", icon: MessageSquare },
];

export function ReportsTable({
  activeTab,
  onTabChange,
  data,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  isLoading,
}: ReportsTableProps) {
  return (
    <div className="space-y-4 min-w-0">
      {/* Tab Navigation Pill Bar */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#EAE3D9] print:hidden">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id || (tab.id === "diagnostics-procedures" && activeTab === "diagnostic-procedures");
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
                active
                  ? "bg-[#201C1A] text-white shadow-xs"
                  : "text-[#7A746F] hover:text-[#201C1A] hover:bg-[#FAF5EE]"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs px-1">
        <span className="text-[#7A746F]">
          Showing{" "}
          <strong className="text-[#201C1A]">
            {data.length > 0 ? (currentPage - 1) * 25 + 1 : 0}
          </strong>{" "}
          to{" "}
          <strong className="text-[#201C1A]">
            {Math.min(currentPage * 25, totalCount)}
          </strong>{" "}
          of <strong className="text-[#201C1A]">{totalCount}</strong> records
        </span>
      </div>

      {/* Main Table Content */}
      <TableContainer className="bg-white border border-[#EAE3D9] rounded-xl shadow-2xs">
        <Table>
          <TableHeader className="bg-[#FAF5EE]/70">
            {renderTableHeaders(activeTab)}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8} className="block md:table-cell py-3 md:py-4">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="block md:table-cell py-8 md:py-12 text-center text-xs text-[#7A746F]"
                >
                  <div className="w-full text-center">
                    No records match the selected filter criteria.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, idx) => renderTableRow(activeTab, row, idx))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 print:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
            className="h-8 text-xs font-medium"
          >
            Previous
          </Button>

          <span className="text-xs text-[#7A746F]">
            Page <strong className="text-[#201C1A]">{currentPage}</strong> of{" "}
            <strong className="text-[#201C1A]">{totalPages}</strong>
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
            className="h-8 text-xs font-medium"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function renderTableHeaders(type: ReportType) {
  switch (type) {
    case "patient-activity":
      return (
        <TableRow>
          <TableHead className="font-semibold text-[#201C1A]">Patient ID</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient Name</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Phone</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Chamber</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Blood Group</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Registered Date</TableHead>
        </TableRow>
      );
    case "consultations":
      return (
        <TableRow>
          <TableHead className="font-semibold text-[#201C1A]">Date</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient ID</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient Name</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Chamber</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Diagnosis</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Chief Complaint</TableHead>
          <TableHead className="text-right font-semibold text-[#201C1A] print:hidden">Actions</TableHead>
        </TableRow>
      );
    case "prescriptions":
      return (
        <TableRow>
          <TableHead className="font-semibold text-[#201C1A]">Rx Code</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Date</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient ID</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient Name</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Chamber</TableHead>
          <TableHead className="text-center font-semibold text-[#201C1A]">Medicines</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Status</TableHead>
        </TableRow>
      );
    case "follow-ups":
      return (
        <TableRow>
          <TableHead className="font-semibold text-[#201C1A]">Scheduled Date</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient ID</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient Name</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Chamber</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Reason</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Status</TableHead>
        </TableRow>
      );
    case "diagnostic-procedures":
    case "diagnostics-procedures":
      return (
        <TableRow>
          <TableHead className="font-semibold text-[#201C1A]">Type</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Date</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Title / Name</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Category</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Evidence</TableHead>
        </TableRow>
      );
    case "discharges":
      return (
        <TableRow>
          <TableHead className="font-semibold text-[#201C1A]">Discharge Date</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient ID</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient Name</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Condition</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Final Diagnosis</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Status</TableHead>
        </TableRow>
      );
    case "sms-delivery":
      return (
        <TableRow>
          <TableHead className="font-semibold text-[#201C1A]">Created</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Patient</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Phone</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Scheduled For</TableHead>
          <TableHead className="font-semibold text-[#201C1A]">Delivery Status</TableHead>
        </TableRow>
      );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderTableRow(type: ReportType, row: any, idx: number) {
  switch (type) {
    case "patient-activity": {
      const r = row as PatientActivityReportRow;
      return (
        <TableRow key={r.id || idx} className="hover:bg-[#FAF5EE]/40 text-xs">
          <TableCell label="Patient ID" className="font-mono font-medium text-[#201C1A]">
            <Link
              href={`/patients/${r.id}`}
              className="text-[#DE4F3C] hover:underline inline-flex items-center justify-end md:justify-start gap-1"
            >
              {r.patientId}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
          </TableCell>
          <TableCell label="Patient Name" className="font-medium text-[#201C1A]">
            {r.name}
          </TableCell>
          <TableCell label="Phone" className="font-mono text-[#7A746F]">
            {r.phone}
          </TableCell>
          <TableCell label="Chamber">
            <Badge variant="neutral" className="text-[10px]">
              {r.chamberName}
            </Badge>
          </TableCell>
          <TableCell label="Blood Group">{r.bloodGroup}</TableCell>
          <TableCell label="Registered Date" className="text-[#7A746F]">
            {r.registeredDate}
          </TableCell>
        </TableRow>
      );
    }
    case "consultations": {
      const r = row as ConsultationReportRow;
      const patientIdentifier = r.patientCode || r.patientId;
      return (
        <TableRow key={r.id || idx} className="hover:bg-[#FAF5EE]/40 text-xs">
          <TableCell label="Date" className="font-mono text-[#201C1A] md:whitespace-nowrap">
            {r.consultationDate}
          </TableCell>
          <TableCell label="Patient ID" className="font-mono font-medium">
            <Link
              href={`/patients/${patientIdentifier}`}
              className="text-[#DE4F3C] hover:underline inline-flex items-center justify-end md:justify-start gap-1"
            >
              {r.patientCode || r.patientId}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
          </TableCell>
          <TableCell label="Patient Name" className="font-medium text-[#201C1A]">
            <Link
              href={`/patients/${patientIdentifier}`}
              className="hover:underline"
            >
              {r.patientName}
            </Link>
          </TableCell>
          <TableCell label="Chamber">
            <Badge variant="neutral" className="text-[10px]">
              {r.chamberName}
            </Badge>
          </TableCell>
          <TableCell
            label="Diagnosis"
            className="md:max-w-[200px] md:truncate break-words text-[#201C1A]"
            title={r.diagnosis ?? ""}
          >
            {r.diagnosis || <span className="text-[#A8A29E]">—</span>}
          </TableCell>
          <TableCell
            label="Chief Complaint"
            className="md:max-w-[200px] md:truncate break-words text-[#7A746F]"
            title={r.chiefComplaint ?? ""}
          >
            {r.chiefComplaint || <span className="text-[#A8A29E]">—</span>}
          </TableCell>
          <TableCell label="Actions" isAction className="text-right md:whitespace-nowrap print:hidden">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <Link href={`/consultations/${r.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] font-medium gap-1 text-[#201C1A] hover:bg-[#FAF5EE]"
                  title="View clinical encounter details"
                >
                  <Eye className="h-3 w-3 text-[#DE4F3C]" />
                  <span>View</span>
                </Button>
              </Link>
              <Link href={`/patients/${patientIdentifier}/consultations/${r.id}/edit`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] font-medium gap-1 text-[#7A746F] hover:text-[#201C1A] hover:bg-[#FAF5EE]"
                  title="Edit consultation notes"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit</span>
                </Button>
              </Link>
            </div>
          </TableCell>
        </TableRow>
      );
    }
    case "prescriptions": {
      const r = row as PrescriptionReportRow;
      return (
        <TableRow key={r.id || idx} className="hover:bg-[#FAF5EE]/40 text-xs">
          <TableCell label="Rx Code" className="font-mono font-medium text-[#DE4F3C]">
            <Link
              href={`/prescriptions/${r.id}`}
              className="hover:underline inline-flex items-center justify-end md:justify-start gap-1"
            >
              {r.prescriptionCode}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
          </TableCell>
          <TableCell label="Date" className="font-mono text-[#201C1A]">
            {r.prescriptionDate}
          </TableCell>
          <TableCell label="Patient ID" className="font-mono text-[#7A746F]">
            {r.patientCode}
          </TableCell>
          <TableCell label="Patient Name" className="font-medium text-[#201C1A]">
            {r.patientName}
          </TableCell>
          <TableCell label="Chamber">
            <Badge variant="neutral" className="text-[10px]">
              {r.chamberName}
            </Badge>
          </TableCell>
          <TableCell label="Medicines" className="md:text-center font-bold">
            {r.itemsCount}
          </TableCell>
          <TableCell label="Status">
            <Badge
              variant={r.status === "finalized" ? "success" : "warning"}
              className="text-[10px]"
            >
              {r.status}
            </Badge>
          </TableCell>
        </TableRow>
      );
    }
    case "follow-ups": {
      const r = row as FollowUpReportRow;
      const getStatusBadge = (s: string) => {
        switch (s) {
          case "completed":
            return <Badge variant="success" className="text-[10px]">Completed</Badge>;
          case "overdue":
            return <Badge variant="danger" className="text-[10px]">Overdue</Badge>;
          case "scheduled":
            return <Badge variant="neutral" className="text-[10px]">Scheduled</Badge>;
          default:
            return <Badge variant="neutral" className="text-[10px]">{s}</Badge>;
        }
      };

      return (
        <TableRow key={r.id || idx} className="hover:bg-[#FAF5EE]/40 text-xs">
          <TableCell label="Scheduled Date" className="font-mono font-semibold text-[#201C1A]">
            {r.scheduledDate}
          </TableCell>
          <TableCell label="Patient ID" className="font-mono font-medium">
            <Link
              href={`/patients/${r.patientCode || r.patientId}`}
              className="text-[#DE4F3C] hover:underline inline-flex items-center justify-end md:justify-start gap-1"
            >
              {r.patientCode}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
          </TableCell>
          <TableCell label="Patient Name" className="font-medium text-[#201C1A]">
            <Link
              href={`/patients/${r.patientCode || r.patientId}`}
              className="hover:underline"
            >
              {r.patientName}
            </Link>
          </TableCell>
          <TableCell label="Chamber">
            <Badge variant="neutral" className="text-[10px]">
              {r.chamberName}
            </Badge>
          </TableCell>
          <TableCell label="Reason" className="md:max-w-[200px] md:truncate break-words text-[#7A746F]">
            {r.reason ?? "Routine follow-up"}
          </TableCell>
          <TableCell label="Status">{getStatusBadge(r.status)}</TableCell>
        </TableRow>
      );
    }
    case "diagnostic-procedures":
    case "diagnostics-procedures": {
      const r = row as DiagnosticProcedureReportRow;
      return (
        <TableRow key={r.id || idx} className="hover:bg-[#FAF5EE]/40 text-xs">
          <TableCell label="Type">
            <Badge
              variant={r.itemType === "diagnostic" ? "neutral" : "info"}
              className="text-[10px]"
            >
              {r.itemType === "diagnostic" ? "Diagnostic" : "Procedure"}
            </Badge>
          </TableCell>
          <TableCell label="Date" className="font-mono text-[#201C1A]">
            {r.activityDate}
          </TableCell>
          <TableCell label="Title / Name" className="font-semibold text-[#201C1A] md:max-w-[180px] md:truncate break-words">
            {r.title}
          </TableCell>
          <TableCell label="Category" className="text-[#7A746F]">
            {r.category}
          </TableCell>
          <TableCell label="Patient">
            <Link
              href={`/patients/${r.patientCode || r.patientId}`}
              className="hover:underline block"
            >
              <div className="font-medium text-[#201C1A]">{r.patientName}</div>
              <div className="font-mono text-[11px] text-[#DE4F3C] inline-flex items-center gap-1">
                {r.patientCode}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </div>
            </Link>
          </TableCell>
          <TableCell label="Evidence">
            {r.driveUrl ? (
              <a
                href={r.driveUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#DE4F3C] hover:underline inline-flex items-center justify-end md:justify-start gap-1 font-medium"
              >
                Drive Link
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-[#7A746F]">None</span>
            )}
          </TableCell>
        </TableRow>
      );
    }
    case "discharges": {
      const r = row as DischargeReportRow;
      return (
        <TableRow key={r.id || idx} className="hover:bg-[#FAF5EE]/40 text-xs">
          <TableCell label="Discharge Date" className="font-mono font-medium text-[#201C1A]">
            {r.dischargeDate}
          </TableCell>
          <TableCell label="Patient ID" className="font-mono font-medium">
            <Link
              href={`/patients/${r.patientCode || r.patientId}`}
              className="text-[#DE4F3C] hover:underline inline-flex items-center justify-end md:justify-start gap-1"
            >
              {r.patientCode}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
          </TableCell>
          <TableCell label="Patient Name" className="font-medium text-[#201C1A]">
            <Link
              href={`/patients/${r.patientCode || r.patientId}`}
              className="hover:underline"
            >
              {r.patientName}
            </Link>
          </TableCell>
          <TableCell label="Condition" className="text-[#7A746F]">
            {r.conditionAtDischarge}
          </TableCell>
          <TableCell label="Final Diagnosis" className="md:max-w-[200px] md:truncate break-words text-[#201C1A]">
            {r.finalDiagnosis}
          </TableCell>
          <TableCell label="Status">
            <Badge
              variant={r.status === "finalized" ? "success" : "warning"}
              className="text-[10px]"
            >
              {r.status}
            </Badge>
          </TableCell>
        </TableRow>
      );
    }
    case "sms-delivery": {
      const r = row as SmsDeliveryReportRow;
      const getSmsBadge = (s: string) => {
        switch (s) {
          case "delivered":
            return <Badge variant="success" className="text-[10px]">Delivered</Badge>;
          case "sent":
            return <Badge variant="info" className="text-[10px]">Sent</Badge>;
          case "pending":
            return <Badge variant="neutral" className="text-[10px]">Pending</Badge>;
          case "failed":
            return <Badge variant="danger" className="text-[10px]">Failed</Badge>;
          default:
            return <Badge variant="neutral" className="text-[10px]">{s}</Badge>;
        }
      };

      return (
        <TableRow key={r.id || idx} className="hover:bg-[#FAF5EE]/40 text-xs">
          <TableCell label="Created" className="font-mono text-[#7A746F]">
            {r.createdAt.slice(0, 16)}
          </TableCell>
          <TableCell label="Patient">
            <Link
              href={`/patients/${r.patientCode || r.patientId}`}
              className="hover:underline block"
            >
              <div className="font-medium text-[#201C1A]">{r.patientName}</div>
              <div className="font-mono text-[11px] text-[#DE4F3C] inline-flex items-center gap-1">
                {r.patientCode}
                <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </div>
            </Link>
          </TableCell>
          <TableCell label="Phone" className="font-mono text-[#201C1A]">
            {r.recipientPhoneMasked}
          </TableCell>
          <TableCell label="Scheduled For" className="font-mono text-[#201C1A]">
            {r.scheduledFor}
          </TableCell>
          <TableCell label="Delivery Status">{getSmsBadge(r.deliveryStatus)}</TableCell>
        </TableRow>
      );
    }
  }
}
