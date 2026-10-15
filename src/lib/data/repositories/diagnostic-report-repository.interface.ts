/**
 * Diagnostic Report Repository Interface
 * Phase 26: Diagnostic Test Reports & Google Drive Link-Only Management
 */

import {
  DiagnosticReport,
  CreateDiagnosticReportDTO,
  UpdateDiagnosticReportDTO,
} from "@/types/diagnostic-report";

export interface IDiagnosticReportRepository {
  /**
   * Retrieves all diagnostic test reports for a given patient, ordered chronologically (newest test_date first).
   */
  getReportsForPatient(patientId: string): Promise<DiagnosticReport[]>;

  /**
   * Retrieves all diagnostic reports linked to a specific consultation.
   */
  getReportsForConsultation(consultationId: string): Promise<DiagnosticReport[]>;

  /**
   * Retrieves a single diagnostic report by its unique ID.
   */
  getReportById(id: string): Promise<DiagnosticReport | null>;

  /**
   * Creates a new diagnostic report reference.
   * Enforces the Google Drive link-only rule (only metadata and URL are stored).
   */
  createReport(dto: CreateDiagnosticReportDTO): Promise<DiagnosticReport>;

  /**
   * Updates an existing diagnostic report reference.
   */
  updateReport(id: string, dto: UpdateDiagnosticReportDTO): Promise<DiagnosticReport>;

  /**
   * Removes a report reference from the database.
   * NOTE: This NEVER touches, downloads, or deletes any file on Google Drive.
   */
  deleteReport(id: string): Promise<boolean>;
}
