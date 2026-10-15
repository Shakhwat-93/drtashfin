/**
 * CSV Export Utilities for Clinical Reports.
 * Follows RFC 4180 formatting, includes UTF-8 BOM for Excel compatibility,
 * and neutralizes spreadsheet formula injection (=, +, -, @).
 */

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

/**
 * Neutralizes spreadsheet formula injection vulnerabilities.
 * If a cell string begins with =, +, -, @, or tab/CR, prepend a single quote (').
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  let str = String(value);

  // Strip or neutralize formula injection
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If contains delimiter, quotes, or newlines, quote the field and double-escape quotes
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Converts a 2D array of cells into RFC 4180 compliant CSV string with UTF-8 BOM.
 */
export function formatCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  const content = rows.map((row) => row.map(sanitizeCsvCell).join(",")).join("\r\n");
  // Prepend UTF-8 BOM so Excel and spreadsheet viewers correctly parse Bengali / UTF-8
  return `\uFEFF${content}`;
}

export function buildPatientActivityCsv(data: PatientActivityReportRow[]): string {
  const headers = [
    "Patient ID",
    "Patient Name",
    "Phone",
    "Age",
    "Gender",
    "Blood Group",
    "Chamber",
    "Registered Date",
    "Created At",
  ];

  const rows = data.map((r) => [
    r.patientId,
    r.name,
    r.phone,
    r.age ?? "",
    r.gender ?? "",
    r.bloodGroup ?? "",
    r.chamberName,
    r.registeredDate,
    r.createdAt,
  ]);

  return formatCsv([headers, ...rows]);
}

export function buildConsultationsCsv(data: ConsultationReportRow[]): string {
  const headers = [
    "Consultation Date",
    "Patient ID",
    "Patient Name",
    "Chamber",
    "Diagnosis",
    "Chief Complaint",
    "Advice",
    "Created At",
  ];

  const rows = data.map((r) => [
    r.consultationDate,
    r.patientCode,
    r.patientName,
    r.chamberName,
    r.diagnosis ?? "",
    r.chiefComplaint ?? "",
    r.advice ?? "",
    r.createdAt,
  ]);

  return formatCsv([headers, ...rows]);
}

export function buildPrescriptionsCsv(data: PrescriptionReportRow[]): string {
  const headers = [
    "Prescription ID",
    "Date",
    "Patient ID",
    "Patient Name",
    "Chamber",
    "Medicine Items Count",
    "Status",
    "Finalized At",
    "Created At",
  ];

  const rows = data.map((r) => [
    r.prescriptionCode,
    r.prescriptionDate,
    r.patientCode,
    r.patientName,
    r.chamberName,
    r.itemsCount,
    r.status,
    r.finalizedAt ?? "N/A",
    r.createdAt,
  ]);

  return formatCsv([headers, ...rows]);
}

export function buildFollowUpsCsv(data: FollowUpReportRow[]): string {
  const headers = [
    "Scheduled Date",
    "Scheduled Time",
    "Patient ID",
    "Patient Name",
    "Chamber",
    "Status",
    "Priority",
    "Reason",
    "Clinical Outcome",
    "Outcome Notes",
    "Created At",
  ];

  const rows = data.map((r) => [
    r.scheduledDate,
    r.scheduledTime ?? "N/A",
    r.patientCode,
    r.patientName,
    r.chamberName,
    r.status,
    r.priority,
    r.reason ?? "",
    r.clinicalOutcome ?? "N/A",
    r.outcomeNotes ?? "N/A",
    r.createdAt,
  ]);

  return formatCsv([headers, ...rows]);
}

export function buildDiagnosticsProceduresCsv(data: DiagnosticProcedureReportRow[]): string {
  const headers = [
    "Record Type",
    "Date",
    "Title / Name",
    "Category",
    "Patient ID",
    "Patient Name",
    "Facility / Performed By",
    "Cloud Evidence Link",
    "Clinical Details / Notes",
    "Created At",
  ];

  const rows = data.map((r) => [
    r.itemType === "diagnostic" ? "Diagnostic Test" : "Procedure / Operation",
    r.activityDate,
    r.title,
    r.category,
    r.patientCode,
    r.patientName,
    r.facilityOrCenter ?? "",
    r.driveUrl ?? "None",
    r.details ?? "",
    r.createdAt,
  ]);

  return formatCsv([headers, ...rows]);
}

export function buildDischargesCsv(data: DischargeReportRow[]): string {
  const headers = [
    "Discharge Date",
    "Discharge Time",
    "Patient ID",
    "Patient Name",
    "Status",
    "Condition at Discharge",
    "Final Diagnosis",
    "Clinical Reason",
    "Recommended Follow-up",
    "Finalized At",
    "Created At",
  ];

  const rows = data.map((r) => [
    r.dischargeDate,
    r.dischargeTime ?? "N/A",
    r.patientCode,
    r.patientName,
    r.status,
    r.conditionAtDischarge,
    r.finalDiagnosis,
    r.clinicalReason,
    r.recommendedFollowUpDate ?? "N/A",
    r.finalizedAt ?? "N/A",
    r.createdAt,
  ]);

  return formatCsv([headers, ...rows]);
}

export function buildSmsDeliveryCsv(data: SmsDeliveryReportRow[]): string {
  const headers = [
    "Created Date",
    "Patient ID",
    "Patient Name",
    "Recipient Phone",
    "Reminder Type",
    "Scheduled For",
    "Status",
    "Delivery Status",
    "Retry Count",
    "Sent At",
    "Failure Reason",
  ];

  const rows = data.map((r) => [
    r.createdAt,
    r.patientCode,
    r.patientName,
    r.recipientPhoneMasked,
    r.reminderType,
    r.scheduledFor,
    r.status,
    r.deliveryStatus,
    r.retryCount,
    r.sentAt ?? "N/A",
    r.failureReason ?? "",
  ]);

  return formatCsv([headers, ...rows]);
}

/**
 * Universal dispatcher to generate CSV string for any report type.
 */
export function generateReportCsv(
  type: ReportType,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
): { filename: string; csv: string } {
  const dateStr = new Date().toISOString().slice(0, 10);
  switch (type) {
    case "patient-activity":
      return {
        filename: `patient-activity-report-${dateStr}.csv`,
        csv: buildPatientActivityCsv(data as PatientActivityReportRow[]),
      };
    case "consultations":
      return {
        filename: `consultations-report-${dateStr}.csv`,
        csv: buildConsultationsCsv(data as ConsultationReportRow[]),
      };
    case "prescriptions":
      return {
        filename: `prescriptions-report-${dateStr}.csv`,
        csv: buildPrescriptionsCsv(data as PrescriptionReportRow[]),
      };
    case "follow-ups":
      return {
        filename: `follow-ups-report-${dateStr}.csv`,
        csv: buildFollowUpsCsv(data as FollowUpReportRow[]),
      };
    case "diagnostic-procedures":
    case "diagnostics-procedures":
      return {
        filename: `diagnostics-procedures-report-${dateStr}.csv`,
        csv: buildDiagnosticsProceduresCsv(data as DiagnosticProcedureReportRow[]),
      };
    case "discharges":
      return {
        filename: `discharges-report-${dateStr}.csv`,
        csv: buildDischargesCsv(data as DischargeReportRow[]),
      };
    case "sms-delivery":
      return {
        filename: `sms-delivery-report-${dateStr}.csv`,
        csv: buildSmsDeliveryCsv(data as SmsDeliveryReportRow[]),
      };
    default:
      throw new Error(`Unsupported report type for CSV export: ${type}`);
  }
}
