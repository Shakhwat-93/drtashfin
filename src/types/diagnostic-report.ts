/**
 * Diagnostic Test Report Types for Dr. Tashfin Patient Management System
 * Phase 26: Diagnostic Test Reports & Google Drive Link-Only Management
 */

export const DIAGNOSTIC_REPORT_CATEGORIES = [
  "Blood Test",
  "Urine Test",
  "X-ray",
  "USG",
  "ECG",
  "CT Scan",
  "MRI",
  "Pathology",
  "Other",
] as const;

export type DiagnosticReportCategory = (typeof DIAGNOSTIC_REPORT_CATEGORIES)[number];

export interface DiagnosticReport {
  id: string;
  patientId: string;
  consultationId?: string | null;
  testName: string;
  category: DiagnosticReportCategory;
  testDate: string; // YYYY-MM-DD
  diagnosticCenter?: string | null;
  doctorNotes?: string | null;
  driveUrl: string; // Validated HTTPS Google Drive file or folder URL
  createdAt: string;
  updatedAt: string;
  // Joined presentation metadata
  patientName?: string;
  patientCode?: string;
  consultationDate?: string | null;
}

export interface CreateDiagnosticReportDTO {
  patientId: string;
  consultationId?: string | null;
  testName: string;
  category: DiagnosticReportCategory;
  testDate: string;
  diagnosticCenter?: string | null;
  doctorNotes?: string | null;
  driveUrl: string;
}

export interface UpdateDiagnosticReportDTO {
  consultationId?: string | null;
  testName?: string;
  category?: DiagnosticReportCategory;
  testDate?: string;
  diagnosticCenter?: string | null;
  doctorNotes?: string | null;
  driveUrl?: string;
}

export interface DiagnosticReportFilterParams {
  patientId?: string;
  consultationId?: string;
  category?: DiagnosticReportCategory;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}
