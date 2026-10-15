import { IPatientRepository } from "./repositories/patient-repository.interface";
import { IClinicalRepository } from "./repositories/clinical-repository.interface";
import { IConsultationRepository } from "./repositories/consultation-repository.interface";
import { IMedicineRepository } from "./repositories/medicine-repository.interface";
import { IPrescriptionRepository } from "./repositories/prescription-repository.interface";
import { IClinicalDocumentRepository } from "./repositories/clinical-document-repository.interface";
import { IChamberRepository } from "./repositories/chamber-repository.interface";
import { IFollowUpRepository } from "./repositories/follow-up-repository.interface";
import { ISmsReminderRepository } from "./repositories/sms-reminder-repository.interface";
import { IDiagnosticReportRepository } from "./repositories/diagnostic-report-repository.interface";
import { ISmsGatewaySettingsRepository } from "./repositories/sms-gateway-settings-repository.interface";
import { IProcedureRepository } from "./repositories/procedure-repository.interface";
import { IDischargeRepository } from "./repositories/discharge-repository.interface";
import { IDoctorAchievementRepository } from "./repositories/achievement-repository.interface";
import { IReportRepository } from "./repositories/report-repository.interface";
import { MockPatientRepository } from "./repositories/mock-patient-repository";
import { MockClinicalRepository } from "./repositories/mock-clinical-repository";
import { MockConsultationRepository } from "./repositories/mock-consultation-repository";
import { MockMedicineRepository } from "./repositories/mock-medicine-repository";
import { MockPrescriptionRepository } from "./repositories/mock-prescription-repository";
import { MockClinicalDocumentRepository } from "./repositories/mock-clinical-document-repository";
import { MockChamberRepository } from "./repositories/mock-chamber-repository";
import { MockFollowUpRepository } from "./repositories/mock-follow-up-repository";
import { MockSmsReminderRepository } from "./repositories/mock-sms-reminder-repository";
import { MockDiagnosticReportRepository } from "./repositories/mock-diagnostic-report-repository";
import { MockSmsGatewaySettingsRepository } from "./repositories/mock-sms-gateway-settings-repository";
import { MockProcedureRepository } from "./repositories/mock-procedure-repository";
import { MockDischargeRepository } from "./repositories/mock-discharge-repository";
import { MockDoctorAchievementRepository } from "./repositories/mock-achievement-repository";
import { MockReportRepository } from "./repositories/mock-report-repository";
import { SupabasePatientRepository } from "./repositories/supabase-patient-repository";
import { SupabaseConsultationRepository } from "./repositories/supabase-consultation-repository";
import { SupabaseClinicalRepository } from "./repositories/supabase-clinical-repository";
import { SupabaseMedicineRepository } from "./repositories/supabase-medicine-repository";
import { SupabasePrescriptionRepository } from "./repositories/supabase-prescription-repository";
import { SupabaseClinicalDocumentRepository } from "./repositories/supabase-clinical-document-repository";
import { SupabaseChamberRepository } from "./repositories/supabase-chamber-repository";
import { SupabaseFollowUpRepository } from "./repositories/supabase-follow-up-repository";
import { SupabaseSmsReminderRepository } from "./repositories/supabase-sms-reminder-repository";
import { SupabaseDiagnosticReportRepository } from "./repositories/supabase-diagnostic-report-repository";
import { SupabaseSmsGatewaySettingsRepository } from "./repositories/supabase-sms-gateway-settings-repository";
import { SupabaseProcedureRepository } from "./repositories/supabase-procedure-repository";
import { SupabaseDischargeRepository } from "./repositories/supabase-discharge-repository";
import { SupabaseDoctorAchievementRepository } from "./repositories/supabase-achievement-repository";
import { SupabaseReportRepository } from "./repositories/supabase-report-repository";

export * from "./errors";
export * from "./id-generator";
export * from "./repositories/patient-repository.interface";
export * from "./repositories/clinical-repository.interface";
export * from "./repositories/consultation-repository.interface";
export * from "./repositories/medicine-repository.interface";
export * from "./repositories/prescription-repository.interface";
export * from "./repositories/clinical-document-repository.interface";
export * from "./repositories/chamber-repository.interface";
export * from "./repositories/follow-up-repository.interface";
export * from "./repositories/sms-reminder-repository.interface";
export * from "./repositories/diagnostic-report-repository.interface";
export * from "./repositories/sms-gateway-settings-repository.interface";
export * from "./repositories/procedure-repository.interface";
export * from "./repositories/discharge-repository.interface";
export * from "./repositories/achievement-repository.interface";
export * from "./repositories/report-repository.interface";
export * from "./repositories/mock-patient-repository";
export * from "./repositories/mock-consultation-repository";
export * from "./repositories/mock-clinical-repository";
export * from "./repositories/mock-medicine-repository";
export * from "./repositories/mock-prescription-repository";
export * from "./repositories/mock-clinical-document-repository";
export * from "./repositories/mock-chamber-repository";
export * from "./repositories/mock-follow-up-repository";
export * from "./repositories/mock-sms-reminder-repository";
export * from "./repositories/mock-diagnostic-report-repository";
export * from "./repositories/mock-sms-gateway-settings-repository";
export * from "./repositories/mock-procedure-repository";
export * from "./repositories/mock-discharge-repository";
export * from "./repositories/mock-achievement-repository";
export * from "./repositories/mock-report-repository";
export * from "./repositories/supabase-patient-repository";
export * from "./repositories/supabase-consultation-repository";
export * from "./repositories/supabase-clinical-repository";
export * from "./repositories/supabase-medicine-repository";
export * from "./repositories/supabase-prescription-repository";
export * from "./repositories/supabase-clinical-document-repository";
export * from "./repositories/supabase-chamber-repository";
export * from "./repositories/supabase-follow-up-repository";
export * from "./repositories/supabase-sms-reminder-repository";
export * from "./repositories/supabase-diagnostic-report-repository";
export * from "./repositories/supabase-sms-gateway-settings-repository";
export * from "./repositories/supabase-procedure-repository";
export * from "./repositories/supabase-discharge-repository";
export * from "./repositories/supabase-achievement-repository";
export * from "./repositories/supabase-report-repository";

// Singleton instances for runtime
let patientRepositoryInstance: IPatientRepository | null = null;
let clinicalRepositoryInstance: IClinicalRepository | null = null;
let consultationRepositoryInstance: IConsultationRepository | null = null;
let medicineRepositoryInstance: IMedicineRepository | null = null;
let prescriptionRepositoryInstance: IPrescriptionRepository | null = null;
let clinicalDocumentRepositoryInstance: IClinicalDocumentRepository | null = null;
let chamberRepositoryInstance: IChamberRepository | null = null;
let followUpRepositoryInstance: IFollowUpRepository | null = null;
let smsReminderRepositoryInstance: ISmsReminderRepository | null = null;
let diagnosticReportRepositoryInstance: IDiagnosticReportRepository | null = null;
let smsGatewaySettingsRepositoryInstance: ISmsGatewaySettingsRepository | null = null;
let procedureRepositoryInstance: IProcedureRepository | null = null;
let dischargeRepositoryInstance: IDischargeRepository | null = null;
let doctorAchievementRepositoryInstance: IDoctorAchievementRepository | null = null;
let reportRepositoryInstance: IReportRepository | null = null;

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
 * Factory for Chamber Repository.
 */
export function getChamberRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IChamberRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseChamberRepository(client);
  }
  if (!chamberRepositoryInstance) {
    if (shouldUseSupabase()) {
      chamberRepositoryInstance = new SupabaseChamberRepository();
    } else {
      chamberRepositoryInstance = new MockChamberRepository();
    }
  }
  return chamberRepositoryInstance;
}

/**
 * Factory for Follow-up Repository.
 */
export function getFollowUpRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IFollowUpRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseFollowUpRepository(
      getPatientRepository(client),
      client
    );
  }
  if (!followUpRepositoryInstance) {
    if (shouldUseSupabase()) {
      followUpRepositoryInstance = new SupabaseFollowUpRepository(
        getPatientRepository()
      );
    } else {
      followUpRepositoryInstance = new MockFollowUpRepository(
        getPatientRepository()
      );
    }
  }
  return followUpRepositoryInstance;
}

/**
 * Factory for SMS Reminder Repository.
 */
export function getSmsReminderRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): ISmsReminderRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseSmsReminderRepository(client);
  }
  if (!smsReminderRepositoryInstance) {
    if (shouldUseSupabase()) {
      smsReminderRepositoryInstance = new SupabaseSmsReminderRepository();
    } else {
      smsReminderRepositoryInstance = new MockSmsReminderRepository();
    }
  }
  return smsReminderRepositoryInstance;
}

/**
 * Factory for Diagnostic Report Repository.
 * Enforces Google Drive link-only metadata management.
 */
export function getDiagnosticReportRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IDiagnosticReportRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseDiagnosticReportRepository(client);
  }
  if (!diagnosticReportRepositoryInstance) {
    if (shouldUseSupabase()) {
      diagnosticReportRepositoryInstance = new SupabaseDiagnosticReportRepository();
    } else {
      diagnosticReportRepositoryInstance = new MockDiagnosticReportRepository(
        getPatientRepository(),
        getConsultationRepository()
      );
    }
  }
  return diagnosticReportRepositoryInstance;
}

/**
 * Factory for SMS Gateway Settings Repository.
 * Manages encrypted provider credentials, caller IDs, and live sending toggles.
 */
export function getSmsGatewaySettingsRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): ISmsGatewaySettingsRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseSmsGatewaySettingsRepository(client);
  }
  if (!smsGatewaySettingsRepositoryInstance) {
    if (shouldUseSupabase()) {
      smsGatewaySettingsRepositoryInstance = new SupabaseSmsGatewaySettingsRepository();
    } else {
      smsGatewaySettingsRepositoryInstance = new MockSmsGatewaySettingsRepository();
    }
  }
  return smsGatewaySettingsRepositoryInstance;
}

/**
 * Factory for Procedure & Operation Repository.
 * Handles surgical operations and medical procedures with optional Google Drive URLs.
 */
export function getProcedureRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IProcedureRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseProcedureRepository(client);
  }
  if (!procedureRepositoryInstance) {
    if (shouldUseSupabase()) {
      procedureRepositoryInstance = new SupabaseProcedureRepository();
    } else {
      procedureRepositoryInstance = new MockProcedureRepository(
        getPatientRepository(),
        getConsultationRepository()
      );
    }
  }
  return procedureRepositoryInstance;
}

/**
 * Factory for Patient Discharge Repository.
 * Handles patient discharge documentation, draft editing, finalization lock, and amendments.
 */
export function getDischargeRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IDischargeRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseDischargeRepository(client);
  }
  if (!dischargeRepositoryInstance) {
    if (shouldUseSupabase()) {
      dischargeRepositoryInstance = new SupabaseDischargeRepository();
    } else {
      dischargeRepositoryInstance = new MockDischargeRepository(
        getPatientRepository(),
        getConsultationRepository(),
        getFollowUpRepository()
      );
    }
  }
  return dischargeRepositoryInstance;
}

/**
 * Factory for Doctor Achievement Repository.
 */
export function getDoctorAchievementRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IDoctorAchievementRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseDoctorAchievementRepository(client);
  }
  if (!doctorAchievementRepositoryInstance) {
    if (shouldUseSupabase()) {
      doctorAchievementRepositoryInstance =
        new SupabaseDoctorAchievementRepository();
    } else {
      doctorAchievementRepositoryInstance =
        new MockDoctorAchievementRepository();
    }
  }
  return doctorAchievementRepositoryInstance;
}

/**
 * Factory for Report Repository.
 * Handles cross-table clinical metrics aggregation, daily trends, and paginated report queries.
 */
export function getReportRepository(
  client?: import("@supabase/supabase-js").SupabaseClient
): IReportRepository {
  if (client && shouldUseSupabase()) {
    return new SupabaseReportRepository(client);
  }
  if (!reportRepositoryInstance) {
    if (shouldUseSupabase()) {
      reportRepositoryInstance = new SupabaseReportRepository();
    } else {
      reportRepositoryInstance = new MockReportRepository();
    }
  }
  return reportRepositoryInstance;
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
  chamberRepositoryInstance = null;
  followUpRepositoryInstance = null;
  smsReminderRepositoryInstance = null;
  diagnosticReportRepositoryInstance = null;
  smsGatewaySettingsRepositoryInstance = null;
  procedureRepositoryInstance = null;
  dischargeRepositoryInstance = null;
  doctorAchievementRepositoryInstance = null;
  reportRepositoryInstance = null;
}

