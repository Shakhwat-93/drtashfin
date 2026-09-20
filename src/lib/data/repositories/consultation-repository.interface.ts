import {
  Consultation,
  CreateConsultationDTO,
  UpdateConsultationDTO,
} from "@/types/consultation";

/**
 * Abstract Repository Interface for Consultation Entity.
 * Follows the repository pattern established in Phase 03.
 * Separates UI components from underlying storage mechanisms.
 */
export interface IConsultationRepository {
  getConsultationsByPatient(patientId: string): Promise<Consultation[]>;
  getConsultationById(id: string): Promise<Consultation | null>;
  createConsultation(data: CreateConsultationDTO): Promise<Consultation>;
  updateConsultation(
    id: string,
    data: UpdateConsultationDTO
  ): Promise<Consultation>;
  getRecentConsultations(limit?: number): Promise<Consultation[]>;
  getTotalConsultationCount(): Promise<number>;
}
