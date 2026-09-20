/**
 * Domain entity and DTO definitions for Consultation / Clinical Record.
 *
 * A Patient is permanent; a Consultation is a historical medical event.
 * Consecutive consultations must never overwrite past records.
 */

export type ConsanguinityOption = "yes" | "no";

export interface Consultation {
  id: string; // Unique UUID
  patientId: string; // Internal UUID or human-readable PT-XXXXXX
  consultationDate: string; // ISO date string (YYYY-MM-DD)

  // Clinical History
  chiefComplaint?: string;
  birthHistory?: string;
  familyHistory?: string;
  consanguinity?: ConsanguinityOption;
  drugHistory?: string;
  others?: string;

  // Clinical Examination
  clinicalExamination?: string;

  // Investigations
  investigationAdvised?: string;
  currentInvestigation?: string;

  // Diagnosis
  provisionalDiagnosis?: string;
  differentialDiagnosis?: string;

  // Management
  plan?: string;
  advice?: string;
  nextFollowUp?: string; // ISO date string (YYYY-MM-DD)

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
