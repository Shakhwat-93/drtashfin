/**
 * Patient Operation & Medical Procedure Types
 * Phase 27 — Patient Operation & Procedure History Management
 */

export const PROCEDURE_CATEGORIES = [
  "Surgery",
  "Minor Procedure",
  "Diagnostic Procedure",
  "Therapeutic Procedure",
  "Other",
] as const;

export type ProcedureCategory = (typeof PROCEDURE_CATEGORIES)[number];

export interface PatientProcedure {
  id: string;
  patientId: string;
  consultationId?: string | null;
  procedureName: string;
  category: ProcedureCategory;
  procedureDate: string; // YYYY-MM-DD
  hospitalFacility?: string | null;
  performingDoctor?: string | null;
  clinicalIndication?: string | null;
  doctorNotes?: string | null;
  outcome?: string | null;
  complications?: string | null;
  recoveryNotes?: string | null;
  driveUrl?: string | null; // Optional validated HTTPS Google Drive URL
  createdAt: string;
  updatedAt: string;

  // Joined presentation metadata
  patientName?: string;
  patientCode?: string;
  consultationDate?: string | null;
}

export interface CreateProcedureDTO {
  patientId: string;
  consultationId?: string | null;
  procedureName: string;
  category: ProcedureCategory;
  procedureDate: string;
  hospitalFacility?: string | null;
  performingDoctor?: string | null;
  clinicalIndication?: string | null;
  doctorNotes?: string | null;
  outcome?: string | null;
  complications?: string | null;
  recoveryNotes?: string | null;
  driveUrl?: string | null;
}

export interface UpdateProcedureDTO {
  consultationId?: string | null;
  procedureName?: string;
  category?: ProcedureCategory;
  procedureDate?: string;
  hospitalFacility?: string | null;
  performingDoctor?: string | null;
  clinicalIndication?: string | null;
  doctorNotes?: string | null;
  outcome?: string | null;
  complications?: string | null;
  recoveryNotes?: string | null;
  driveUrl?: string | null;
}

export interface ProcedureFilterParams {
  patientId?: string;
  consultationId?: string;
  category?: ProcedureCategory | "all";
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}
