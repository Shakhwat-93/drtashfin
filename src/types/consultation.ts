/**
 * Domain entity and DTO definitions for Consultation / Clinical Record.
 *
 * A Patient is permanent; a Consultation is a historical medical event.
 * Consecutive consultations must never overwrite past records.
 */

export type ConsanguinityOption = "yes" | "no";

export type ConsultationStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled";

export type ClinicalOutcome = "improved" | "unchanged" | "worsened";

export interface Consultation {
  id: string; // Unique UUID
  patientId: string; // Internal UUID or human-readable PT-XXXXXX
  chamberId?: string; // UUID of chamber where consultation occurred
  consultationDate: string; // ISO date string (YYYY-MM-DD)
  consultationTime?: string; // Time string e.g. "10:30 AM"
  status?: ConsultationStatus; // Default: 'completed'

  // Clinical History
  chiefComplaint?: string;
  birthHistory?: string;
  familyHistory?: string;
  consanguinity?: ConsanguinityOption;
  drugHistory?: string;
  others?: string;

  // Clinical Examination & Notes
  clinicalExamination?: string;
  clinicalNotes?: string;

  // Investigations
  investigationAdvised?: string;
  currentInvestigation?: string;

  // Diagnosis
  provisionalDiagnosis?: string;
  differentialDiagnosis?: string;

  // Management & Treatment Plan
  plan?: string;
  advice?: string;
  treatmentInstructions?: string;
  lifestyleInstructions?: string;
  treatmentStartDate?: string; // ISO date string (YYYY-MM-DD)
  treatmentReviewDate?: string; // ISO date string (YYYY-MM-DD)
  nextFollowUp?: string; // ISO date string (YYYY-MM-DD)
  followUpReason?: string;

  // Longitudinal Tracking & Outcomes
  clinicalOutcome?: ClinicalOutcome;
  progressNotes?: string;
  isFollowUp?: boolean;
  originatingConsultationId?: string; // Links follow-up consultation to the original visit

  // Audit Timestamps
  createdAt: string;
  updatedAt: string;
}

export type CreateConsultationDTO = Omit<
  Consultation,
  "id" | "createdAt" | "updatedAt"
>;

export type UpdateConsultationDTO = Partial<
  Omit<Consultation, "id" | "patientId" | "createdAt" | "updatedAt">
>;
