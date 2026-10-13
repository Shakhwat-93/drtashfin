import { IPatientRepository } from "./repositories/patient-repository.interface";
import { IClinicalRepository } from "./repositories/clinical-repository.interface";
import { IConsultationRepository } from "./repositories/consultation-repository.interface";
import { IMedicineRepository } from "./repositories/medicine-repository.interface";
import { IPrescriptionRepository } from "./repositories/prescription-repository.interface";
import { IClinicalDocumentRepository } from "./repositories/clinical-document-repository.interface";
import { MockPatientRepository } from "./repositories/mock-patient-repository";
import { MockClinicalRepository } from "./repositories/mock-clinical-repository";
import { MockConsultationRepository } from "./repositories/mock-consultation-repository";
import { MockMedicineRepository } from "./repositories/mock-medicine-repository";
import { MockPrescriptionRepository } from "./repositories/mock-prescription-repository";
import { MockClinicalDocumentRepository } from "./repositories/mock-clinical-document-repository";
import { SupabasePatientRepository } from "./repositories/supabase-patient-repository";
import { SupabaseConsultationRepository } from "./repositories/supabase-consultation-repository";
import { SupabaseClinicalRepository } from "./repositories/supabase-clinical-repository";
import { SupabaseMedicineRepository } from "./repositories/supabase-medicine-repository";
import { SupabasePrescriptionRepository } from "./repositories/supabase-prescription-repository";
import { SupabaseClinicalDocumentRepository } from "./repositories/supabase-clinical-document-repository";

export * from "./errors";
export * from "./id-generator";
export * from "./repositories/patient-repository.interface";
export * from "./repositories/clinical-repository.interface";
export * from "./repositories/consultation-repository.interface";
export * from "./repositories/medicine-repository.interface";
export * from "./repositories/prescription-repository.interface";
export * from "./repositories/clinical-document-repository.interface";
export * from "./repositories/mock-patient-repository";
export * from "./repositories/mock-consultation-repository";
export * from "./repositories/mock-clinical-repository";
export * from "./repositories/mock-medicine-repository";
export * from "./repositories/mock-prescription-repository";
export * from "./repositories/mock-clinical-document-repository";
export * from "./repositories/supabase-patient-repository";
export * from "./repositories/supabase-consultation-repository";
export * from "./repositories/supabase-clinical-repository";
export * from "./repositories/supabase-medicine-repository";
export * from "./repositories/supabase-prescription-repository";
export * from "./repositories/supabase-clinical-document-repository";

// Singleton instances for runtime
let patientRepositoryInstance: IPatientRepository | null = null;
let clinicalRepositoryInstance: IClinicalRepository | null = null;
let consultationRepositoryInstance: IConsultationRepository | null = null;
let medicineRepositoryInstance: IMedicineRepository | null = null;
let prescriptionRepositoryInstance: IPrescriptionRepository | null = null;
let clinicalDocumentRepositoryInstance: IClinicalDocumentRepository | null = null;

// Configurable provider mode ("auto" detects Supabase credentials, "mock" forces mock)
let providerMode: "auto" | "supabase" | "mock" = "auto";

export function setRepositoryProvider(mode: "auto" | "supabase" | "mock"): void {
  providerMode = mode;
  resetRepositoryInstances();
}

function shouldUseSupabase(): boolean {
  if (providerMode === "mock") return false;
  if (providerMode === "supabase") return true;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      url.trim() !== "" &&
      !url.includes("placeholder") &&
      anonKey &&
      anonKey.trim() !== "" &&
      !anonKey.includes("placeholder")
  );
}

/**
 * Factory for Patient Repository.
 * Auto-detects Supabase configuration; falls back to Mock in offline/isolated environments.
 */
export function getPatientRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IPatientRepository {
  if (client && shouldUseSupabase()) {
    return new SupabasePatientRepository(client);
  }
  if (!patientRepositoryInstance) {
    if (shouldUseSupabase()) {
      patientRepositoryInstance = new SupabasePatientRepository();
    } else {
      patientRepositoryInstance = new MockPatientRepository();
    }
  }
  return patientRepositoryInstance;
}

/**
 * Factory for Clinical Repository.
 */
export function getClinicalRepository(): IClinicalRepository {
  if (!clinicalRepositoryInstance) {
    if (shouldUseSupabase()) {
      clinicalRepositoryInstance = new SupabaseClinicalRepository();
    } else {
      clinicalRepositoryInstance = new MockClinicalRepository();
    }
  }
  return clinicalRepositoryInstance;
}

/**
 * Factory for Consultation Repository.
 */
export function getConsultationRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IConsultationRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseConsultationRepository(
      getPatientRepository(client),
      client
    );
  }
  if (!consultationRepositoryInstance) {
    if (shouldUseSupabase()) {
      consultationRepositoryInstance = new SupabaseConsultationRepository(
        getPatientRepository()
      );
    } else {
      consultationRepositoryInstance = new MockConsultationRepository(
        getPatientRepository()
      );
    }
  }
  return consultationRepositoryInstance;
}

/**
 * Factory for Medicine Repository.
 */
export function getMedicineRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IMedicineRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseMedicineRepository(client);
  }
  if (!medicineRepositoryInstance) {
    if (shouldUseSupabase()) {
      medicineRepositoryInstance = new SupabaseMedicineRepository();
    } else {
      medicineRepositoryInstance = new MockMedicineRepository();
    }
  }
  return medicineRepositoryInstance;
}

/**
 * Factory for Prescription Repository.
 */
export function getPrescriptionRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IPrescriptionRepository {
  if (client && shouldUseSupabase()) {
    return new SupabasePrescriptionRepository(client);
  }
  if (!prescriptionRepositoryInstance) {
    if (shouldUseSupabase()) {
      prescriptionRepositoryInstance = new SupabasePrescriptionRepository();
    } else {
      prescriptionRepositoryInstance = new MockPrescriptionRepository();
    }
  }
  return prescriptionRepositoryInstance;
}

/**
 * Factory for Clinical Document Repository.
 */
export function getClinicalDocumentRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IClinicalDocumentRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseClinicalDocumentRepository(client);
  }
  if (!clinicalDocumentRepositoryInstance) {
    if (shouldUseSupabase()) {
      clinicalDocumentRepositoryInstance =
        new SupabaseClinicalDocumentRepository();
    } else {
      clinicalDocumentRepositoryInstance =
        new MockClinicalDocumentRepository();
    }
  }
  return clinicalDocumentRepositoryInstance;
}

/**
 * Testing helper to reset repository instances between test runs.
 */
export function resetRepositoryInstances(): void {
  patientRepositoryInstance = null;
  clinicalRepositoryInstance = null;
  consultationRepositoryInstance = null;
  medicineRepositoryInstance = null;
  prescriptionRepositoryInstance = null;
  clinicalDocumentRepositoryInstance = null;
}
