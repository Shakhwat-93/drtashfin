import { IPatientRepository } from "./repositories/patient-repository.interface";
import { IClinicalRepository } from "./repositories/clinical-repository.interface";
import { MockPatientRepository } from "./repositories/mock-patient-repository";
import { MockClinicalRepository } from "./repositories/mock-clinical-repository";

export * from "./errors";
export * from "./id-generator";
export * from "./repositories/patient-repository.interface";
export * from "./repositories/clinical-repository.interface";

// Singleton instances for development runtime
let patientRepositoryInstance: IPatientRepository | null = null;
let clinicalRepositoryInstance: IClinicalRepository | null = null;

/**
 * Factory for Patient Repository.
 *
 * Current implementation: MockPatientRepository (Development / Offline)
 * Future implementation: SupabasePatientRepository (Production VPS / PostgreSQL)
 */
export function getPatientRepository(): IPatientRepository {
  if (!patientRepositoryInstance) {
    patientRepositoryInstance = new MockPatientRepository();
  }
  return patientRepositoryInstance;
}

/**
 * Factory for Clinical Repository.
 */
export function getClinicalRepository(): IClinicalRepository {
  if (!clinicalRepositoryInstance) {
    clinicalRepositoryInstance = new MockClinicalRepository();
  }
  return clinicalRepositoryInstance;
}

/**
 * Testing helper to reset mock instances between unit test runs.
 */
export function resetRepositoryInstances(): void {
  patientRepositoryInstance = null;
  clinicalRepositoryInstance = null;
}
