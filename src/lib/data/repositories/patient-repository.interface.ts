import {
  Patient,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientQueryParams,
} from "@/types/patient";
import { PaginatedResult } from "@/types/common";

/**
 * Abstract Repository Interface for Patient Entity.
 * Both MockPatientRepository (NOW) and SupabasePatientRepository (LATER) implement this contract.
 * The UI layer must depend only on this interface.
 */
export interface IPatientRepository {
  getPatients(params?: PatientQueryParams): Promise<PaginatedResult<Patient>>;
  getPatientById(id: string): Promise<Patient | null>;
  getPatientByPatientId(patientId: string): Promise<Patient | null>;
  createPatient(data: CreatePatientDTO): Promise<Patient>;
  updatePatient(id: string, data: UpdatePatientDTO): Promise<Patient>;
  deletePatient(id: string): Promise<boolean>;
  getRecentPatients(limit?: number): Promise<Patient[]>;
  getTotalPatientCount(): Promise<number>;
}
