import {
  Prescription,
  CreatePrescriptionDTO,
  UpdatePrescriptionDTO,
} from "@/types/prescription";

export interface IPrescriptionRepository {
  /**
   * Retrieve all prescriptions issued for a specific patient (reverse chronological).
   */
  getPrescriptionsByPatientId(patientId: string): Promise<Prescription[]>;

  /**
   * Retrieve the prescription associated with a consultation, if any.
   */
  getPrescriptionByConsultationId(
    consultationId: string
  ): Promise<Prescription | null>;

  /**
   * Retrieve a prescription by its internal UUID.
   */
  getPrescriptionById(id: string): Promise<Prescription | null>;

  /**
   * Create a new draft or finalized prescription with medicine items.
   */
  createPrescription(data: CreatePrescriptionDTO): Promise<Prescription>;

  /**
   * Update an existing draft prescription.
   * Throws an error if the prescription is already finalized.
   */
  updatePrescription(
    id: string,
    data: UpdatePrescriptionDTO
  ): Promise<Prescription>;

  /**
   * Finalize a draft prescription with explicit clinician confirmation.
   * Locks the prescription from further edits to preserve audit integrity.
   */
  finalizePrescription(id: string): Promise<Prescription>;

  /**
   * Discard a draft prescription. Finalized prescriptions cannot be deleted.
   */
  deleteDraftPrescription(id: string): Promise<boolean>;
}
