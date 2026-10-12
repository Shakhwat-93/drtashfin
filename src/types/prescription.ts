/**
 * Domain entity and DTO definitions for Doctor-Controlled Prescription Engine.
 *
 * Implements strict clinical safety:
 * - Draft vs. Finalized states (finalized prescriptions are locked/immutable)
 * - Historical snapshot preservation of brand, generic, strength, dosage form
 * - Clinician-entered dosage, frequency (e.g. 1+0+1), route, duration, and instructions
 */

export type PrescriptionStatus = "draft" | "finalized";

export type PrescriptionRoute =
  | "Oral"
  | "Topical"
  | "Inhalation"
  | "IV"
  | "IM"
  | "Sublingual"
  | "Eye Drop"
  | "Ear Drop"
  | "Nasal Spray"
  | "Rectal"
  | "Other";

export interface PrescriptionItem {
  id: string; // Unique UUID
  prescriptionId: string;
  medicineId?: string; // Reference to catalogue medicines table if matched

  // Stable historical snapshots (preserved even if catalogue record changes or is archived)
  brandName: string;
  genericName: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;

  // Clinician-entered dosage & instructions
  dose?: string; // e.g. "1 tablet", "10 ml", "1 puff"
  frequency: string; // e.g. "1+0+1", "1+1+1", "0+1+0", "Once daily", "SOS"
  route: string; // e.g. "Oral", "Topical"
  duration?: string; // e.g. "7 days", "14 days", "1 month", "Continue"
  timingInstructions?: string; // e.g. "After meal", "Before meal", "With water"
  specialInstructions?: string;

  orderIndex: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Prescription {
  id: string; // Unique UUID
  prescriptionCode: string; // Human-readable e.g. "RX-000001"
  patientId: string; // UUID of patient
  consultationId?: string; // UUID of consultation (optional)
  doctorId: string; // Authenticated clinician ID
  prescriptionDate: string; // ISO date string (YYYY-MM-DD)
  status: PrescriptionStatus;
  finalizedAt?: string;

  // Clinical advice & instructions
  advice?: string;
  followUpDate?: string; // YYYY-MM-DD
  followUpInstructions?: string;
  notes?: string;

  // Associated medicine items (ordered by orderIndex)
  items: PrescriptionItem[];

  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionItemDTO {
  id?: string;
  medicineId?: string;
  brandName: string;
  genericName: string;
  strength?: string;
  dosageForm?: string;
  manufacturer?: string;
  dose?: string;
  frequency: string;
  route?: string;
  duration?: string;
  timingInstructions?: string;
  specialInstructions?: string;
  orderIndex?: number;
}

export interface CreatePrescriptionDTO {
  patientId: string;
  consultationId?: string;
  doctorId?: string;
  prescriptionDate?: string;
  status?: PrescriptionStatus;
  advice?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  notes?: string;
  items: CreatePrescriptionItemDTO[];
}

export interface UpdatePrescriptionDTO {
  prescriptionDate?: string;
  advice?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  notes?: string;
  items?: CreatePrescriptionItemDTO[];
}
