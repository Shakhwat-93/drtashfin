import { Gender, BloodGroup, PaginationParams, SortParams } from "./common";

/**
 * Permanent Patient Identity Entity.
 * Clinical history (visits, diagnoses, operations) is stored in separate clinical record entities.
 */
export interface Patient {
  id: string; // Internal UUID
  patientId: string; // Human-readable identifier (e.g., PT-000001)
  name: string;
  dateOfBirth: string; // ISO format (YYYY-MM-DD)
  age: number;
  gender: Gender;
  weight?: number; // Weight in kg
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

export interface CreatePatientDTO {
  name: string;
  dateOfBirth: string;
  gender: Gender;
  age?: number;
  weight?: number;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
}

export interface UpdatePatientDTO {
  name?: string;
  dateOfBirth?: string;
  gender?: Gender;
  age?: number;
  weight?: number;
  phone?: string;
  email?: string;
  address?: string;
  bloodGroup?: BloodGroup;
}

export interface PatientQueryParams extends PaginationParams, SortParams {
  search?: string;
  gender?: Gender;
}
