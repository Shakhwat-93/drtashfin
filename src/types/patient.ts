import { Gender, BloodGroup, PaginationParams, SortParams } from "./common";
import { SmsConsentStatus, SmsConsentSource } from "./sms";

/**
 * Permanent Patient Identity Entity.
 * Clinical history (visits, diagnoses, operations) is stored in separate clinical record entities.
 */
export interface Patient {
  id: string; // Internal UUID
  patientId: string; // Human-readable identifier (e.g., PT-000001, DH-000001)
  chamberId?: string; // UUID of assigned chamber (Dhaka, Rangpur, Narayanganj or unassigned)
  name: string;
  dateOfBirth: string; // ISO format (YYYY-MM-DD)
  age: number;
  gender: Gender;
  weight?: number; // Weight in kg
  phone?: string; // Primary mobile number
  email?: string;
  address?: string; // Present Address
  bloodGroup?: BloodGroup;

  // Section A: Family & Guardian Identity
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianRelationship?: string;

  // Section B: Contact & Emergency Information
  secondaryPhone?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;

  // Section C: Additional Clinical & Social Information
  occupation?: string;
  allergies?: string;
  medicalHistory?: string;
  currentMedications?: string;
  patientNotes?: string;
  smsConsentStatus?: SmsConsentStatus;
  smsConsentAt?: string | null;
  smsConsentSource?: SmsConsentSource | null;

  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreatePatientDTO {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  chamberId?: string;
  age?: number;
  weight?: number;
  phone?: string;
  email?: string;
  address?: string; // Present Address
  bloodGroup?: BloodGroup;

  // Family & Guardian Identity
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianRelationship?: string;

  // Contact & Emergency Information
  secondaryPhone?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;

  // Additional Clinical & Social Information
  occupation?: string;
  allergies?: string;
  medicalHistory?: string;
  currentMedications?: string;
  patientNotes?: string;

  // SMS Reminder Consent
  smsConsentStatus?: SmsConsentStatus;
  smsConsentAt?: string | null;
  smsConsentSource?: SmsConsentSource | null;
}

export interface UpdatePatientDTO {
  name?: string;
  dateOfBirth?: string;
  gender?: Gender;
  chamberId?: string;
  age?: number;
  weight?: number;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;

  // Family & Guardian Identity
  fatherName?: string;
  motherName?: string;
  guardianName?: string;
  guardianRelationship?: string;

  // Contact & Emergency Information
  secondaryPhone?: string;
  permanentAddress?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;

  // Additional Clinical & Social Information
  occupation?: string;
  allergies?: string;
  medicalHistory?: string;
  currentMedications?: string;
  patientNotes?: string;

  // SMS Reminder Consent
  smsConsentStatus?: SmsConsentStatus;
  smsConsentAt?: string | null;
  smsConsentSource?: SmsConsentSource | null;
}

export interface PatientQueryParams extends PaginationParams, SortParams {
  search?: string;
  gender?: Gender;
  chamberId?: string;
}
