/**
 * Patient Discharge & Final Clinical Report Management Types
 * Phase 28: Patient Discharge & Final Clinical Report Management
 */

export const DISCHARGE_CONDITIONS = [
  "Recovered",
  "Improved",
  "Stable",
  "Unchanged",
  "Deteriorated",
  "Transferred",
  "Discharged Against Medical Advice",
  "Other",
] as const;

export type DischargeCondition = (typeof DISCHARGE_CONDITIONS)[number];

export const DISCHARGE_STATUSES = ["draft", "finalized"] as const;

export type DischargeStatus = (typeof DISCHARGE_STATUSES)[number];

export interface PatientDischarge {
  id: string;
  patientId: string;
  consultationId?: string | null;
  dischargeDate: string; // YYYY-MM-DD
  dischargeTime?: string | null; // HH:MM or HH:MM:SS
  status: DischargeStatus;
  clinicalReason: string;
  finalDiagnosis: string;
  treatmentSummary: string;
  conditionAtDischarge: DischargeCondition;
  dischargeInstructions: string;
  medicationInstructions?: string | null;
  recommendedFollowUpDate?: string | null;
  followUpInstructions?: string | null;
  complications?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  driveUrl?: string | null; // Optional validated HTTPS Google Drive URL
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  amendmentNotes?: string | null;
  amendedAt?: string | null;
  amendedBy?: string | null;
  createdAt: string;
  updatedAt: string;

  // Joined presentation metadata
  patientName?: string;
  patientCode?: string;
  consultationDate?: string | null;
}

export interface CreateDischargeDTO {
  patientId: string;
  consultationId?: string | null;
  dischargeDate: string;
  dischargeTime?: string | null;
  status?: DischargeStatus;
  clinicalReason: string;
  finalDiagnosis: string;
  treatmentSummary: string;
  conditionAtDischarge: DischargeCondition;
  dischargeInstructions: string;
  medicationInstructions?: string | null;
  recommendedFollowUpDate?: string | null;
  followUpInstructions?: string | null;
  complications?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  driveUrl?: string | null;
  finalizedBy?: string | null;

  // Optional integrated follow-up creation
  scheduleFollowUp?: boolean;
  followUpChamberId?: string | null;
  followUpPriority?: "normal" | "high" | "urgent" | "routine" | "review";
}

export interface UpdateDischargeDTO {
  consultationId?: string | null;
  dischargeDate?: string;
  dischargeTime?: string | null;
  clinicalReason?: string;
  finalDiagnosis?: string;
  treatmentSummary?: string;
  conditionAtDischarge?: DischargeCondition;
  dischargeInstructions?: string;
  medicationInstructions?: string | null;
  recommendedFollowUpDate?: string | null;
  followUpInstructions?: string | null;
  complications?: string | null;
  doctorId?: string | null;
  doctorName?: string | null;
  driveUrl?: string | null;

  // Optional integrated follow-up creation
  scheduleFollowUp?: boolean;
  followUpChamberId?: string | null;
  followUpPriority?: "normal" | "high" | "urgent" | "routine" | "review";
}

export interface AmendDischargeDTO {
  amendmentNotes: string;
  amendedBy?: string | null;
}

export interface DischargeFilterParams {
  patientId?: string;
  consultationId?: string;
  status?: DischargeStatus | "all";
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}
