import { SupabaseClient } from "@supabase/supabase-js";
import { IPatientRepository } from "./patient-repository.interface";
import {
  Patient,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientQueryParams,
} from "@/types/patient";
import { PaginatedResult } from "@/types/common";
import { supabase } from "@/lib/supabase/client";
import {
  PatientNotFoundError,
  DuplicatePatientIdError,
  ValidationError,
  DataError,
} from "../errors";
import { createPatientSchema, updatePatientSchema } from "@/schemas/patient";

function mapPatientFromRow(row: Record<string, unknown>): Patient {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    chamberId: row.chamber_id ? String(row.chamber_id) : undefined,
    name: String(row.name),
    dateOfBirth: String(row.date_of_birth),
    age: Number(row.age),
    gender: row.gender as Patient["gender"],
    weight: row.weight != null ? Number(row.weight) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    bloodGroup: row.blood_group ? (row.blood_group as Patient["bloodGroup"]) : undefined,

    // Section A: Family & Guardian Identity
    fatherName: row.father_name ? String(row.father_name) : undefined,
    motherName: row.mother_name ? String(row.mother_name) : undefined,
    guardianName: row.guardian_name ? String(row.guardian_name) : undefined,
    guardianRelationship: row.guardian_relationship ? String(row.guardian_relationship) : undefined,

    // Section B: Contact & Emergency Information
    secondaryPhone: row.secondary_phone ? String(row.secondary_phone) : undefined,
    permanentAddress: row.permanent_address ? String(row.permanent_address) : undefined,
    emergencyContactName: row.emergency_contact_name ? String(row.emergency_contact_name) : undefined,
    emergencyContactRelationship: row.emergency_contact_relationship ? String(row.emergency_contact_relationship) : undefined,
    emergencyContactPhone: row.emergency_contact_phone ? String(row.emergency_contact_phone) : undefined,

    // Section C: Additional Clinical & Social Information
    occupation: row.occupation ? String(row.occupation) : undefined,
    allergies: row.allergies ? String(row.allergies) : undefined,
    medicalHistory: row.medical_history ? String(row.medical_history) : undefined,
    currentMedications: row.current_medications ? String(row.current_medications) : undefined,
    patientNotes: row.patient_notes ? String(row.patient_notes) : undefined,

    // SMS Consent
    smsConsentStatus: (row.sms_consent_status as Patient["smsConsentStatus"]) || "unknown",
    smsConsentAt: row.sms_consent_at ? String(row.sms_consent_at) : undefined,
    smsConsentSource: row.sms_consent_source ? (row.sms_consent_source as Patient["smsConsentSource"]) : undefined,

    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function calculateAge(dob: string): number {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class SupabasePatientRepository implements IPatientRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  public async getPatients(
    params: PatientQueryParams = {}
  ): Promise<PaginatedResult<Patient>> {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 10));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client.from("patients").select("*", { count: "exact" });

    // 1. Search Filter
    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      query = query.or(
        `name.ilike.%${q}%,patient_id.ilike.%${q}%,phone.ilike.%${q}%,secondary_phone.ilike.%${q}%,email.ilike.%${q}%,father_name.ilike.%${q}%`
      );
    }

    // 2. Gender Filter
    if (params.gender) {
      query = query.eq("gender", params.gender);
    }

    // 2b. Chamber Filter
    if (params.chamberId) {
      if (params.chamberId === "unassigned") {
        query = query.is("chamber_id", null);
      } else if (params.chamberId !== "all") {
        query = query.eq("chamber_id", params.chamberId);
      }
    }

    // 3. Sorting
    const sortColumnMap: Record<string, string> = {
      name: "name",
      patientId: "patient_id",
      age: "age",
      createdAt: "created_at",
      updatedAt: "updated_at",
    };
    const sortCol = sortColumnMap[params.sortBy || "createdAt"] || "created_at";
    const ascending = params.sortOrder === "asc";
    query = query.order(sortCol, { ascending });

    // 4. Pagination
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw new DataError(`Failed to fetch patients: ${error.message}`, error.code);
    }

    const items = (data || []).map(mapPatientFromRow);
    const total = count ?? items.length;
    const totalPages = Math.ceil(total / pageSize) || 1;

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async getPatientById(id: string): Promise<Patient | null> {
    if (!id || !UUID_REGEX.test(id)) {
      return null;
    }

    const { data, error } = await this.client
      .from("patients")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch patient by id: ${error.message}`, error.code);
    }

    return data ? mapPatientFromRow(data) : null;
  }

  public async getPatientByPatientId(patientId: string): Promise<Patient | null> {
    if (!patientId) {
      return null;
    }

    const { data, error } = await this.client
      .from("patients")
      .select("*")
      .eq("patient_id", patientId)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch patient by patientId: ${error.message}`, error.code);
    }

    return data ? mapPatientFromRow(data) : null;
  }

  public async getPatientByIdentifier(identifier: string): Promise<Patient | null> {
    if (!identifier) return null;

    if (UUID_REGEX.test(identifier)) {
      const byId = await this.getPatientById(identifier);
      if (byId) return byId;
    }

    return await this.getPatientByPatientId(identifier);
  }

  public async checkPotentialDuplicate(
    name: string,
    phone?: string
  ): Promise<Patient | null> {
    const trimmedName = name.trim();
    const trimmedPhone = phone?.trim();

    if (!trimmedName) return null;

    let query = this.client.from("patients").select("*").limit(1);

    if (trimmedPhone) {
      query = query.or(
        `name.ilike.${trimmedName},phone.eq.${trimmedPhone},secondary_phone.eq.${trimmedPhone}`
      );
    } else {
      query = query.ilike("name", trimmedName);
    }

    const { data, error } = await query;
    if (error) {
      throw new DataError(`Duplicate check failed: ${error.message}`, error.code);
    }

    return data && data.length > 0 ? mapPatientFromRow(data[0]) : null;
  }

  public async createPatient(data: CreatePatientDTO): Promise<Patient> {
    const parseResult = createPatientSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Patient validation failed.", formatted);
    }

    const validated = parseResult.data;
    const computedAge = validated.age ?? calculateAge(validated.dateOfBirth);

    const payload: Record<string, unknown> = {
      name: validated.name.trim(),
      date_of_birth: validated.dateOfBirth,
      age: computedAge,
      gender: validated.gender,
      weight: validated.weight ?? null,
      phone: validated.phone?.trim() ?? null,
      email: validated.email?.trim() ?? null,
      address: validated.address?.trim() ?? null,
      blood_group: validated.bloodGroup || null,
      ...(validated.chamberId ? { chamber_id: validated.chamberId } : {}),

      // Section A: Family & Guardian Identity
      father_name: validated.fatherName?.trim() || null,
      mother_name: validated.motherName?.trim() || null,
      guardian_name: validated.guardianName?.trim() || null,
      guardian_relationship: validated.guardianRelationship?.trim() || null,

      // Section B: Contact & Emergency Information
      secondary_phone: validated.secondaryPhone?.trim() || null,
      permanent_address: validated.permanentAddress?.trim() || null,
      emergency_contact_name: validated.emergencyContactName?.trim() || null,
      emergency_contact_relationship: validated.emergencyContactRelationship?.trim() || null,
      emergency_contact_phone: validated.emergencyContactPhone?.trim() || null,

      // Section C: Additional Clinical & Social Information
      occupation: validated.occupation?.trim() || null,
      allergies: validated.allergies?.trim() || null,
      medical_history: validated.medicalHistory?.trim() || null,
      current_medications: validated.currentMedications?.trim() || null,
      patient_notes: validated.patientNotes?.trim() || null,

      // SMS Consent
      sms_consent_status: validated.smsConsentStatus || "unknown",
      sms_consent_at:
        validated.smsConsentAt ||
        (validated.smsConsentStatus === "opted_in" || validated.smsConsentStatus === "opted_out"
          ? new Date().toISOString()
          : null),
      sms_consent_source:
        validated.smsConsentSource ||
        (validated.smsConsentStatus && validated.smsConsentStatus !== "unknown"
          ? "registration"
          : null),
    };

    const { data: inserted, error } = await this.client
      .from("patients")
      .insert(payload)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new DuplicatePatientIdError("Duplicate patient detected in database.");
      }
      throw new DataError(`Failed to create patient: ${error.message}`, error.code);
    }

    return mapPatientFromRow(inserted);
  }

  public async updatePatient(
    id: string,
    data: UpdatePatientDTO
  ): Promise<Patient> {
    const parseResult = updatePatientSchema.safeParse(data);
    if (!parseResult.success) {
      const formatted = parseResult.error.flatten().fieldErrors;
      throw new ValidationError("Patient update validation failed.", formatted);
    }

    const existing = await this.getPatientByIdentifier(id);
    if (!existing) {
      throw new PatientNotFoundError(id);
    }

    const validated = parseResult.data;
    const updatePayload: Record<string, unknown> = {};

    if (validated.name !== undefined) updatePayload.name = validated.name.trim();
    if (validated.gender !== undefined) updatePayload.gender = validated.gender;
    if (validated.weight !== undefined) updatePayload.weight = validated.weight;
    if (validated.phone !== undefined) updatePayload.phone = validated.phone?.trim() ?? null;
    if (validated.email !== undefined) updatePayload.email = validated.email?.trim() ?? null;
    if (validated.address !== undefined) updatePayload.address = validated.address?.trim() ?? null;
    if (validated.bloodGroup !== undefined) updatePayload.blood_group = validated.bloodGroup || null;
    if (validated.chamberId !== undefined) updatePayload.chamber_id = validated.chamberId || null;

    // Section A: Family & Guardian Identity
    if (validated.fatherName !== undefined) updatePayload.father_name = validated.fatherName?.trim() || null;
    if (validated.motherName !== undefined) updatePayload.mother_name = validated.motherName?.trim() || null;
    if (validated.guardianName !== undefined) updatePayload.guardian_name = validated.guardianName?.trim() || null;
    if (validated.guardianRelationship !== undefined) updatePayload.guardian_relationship = validated.guardianRelationship?.trim() || null;

    // Section B: Contact & Emergency Information
    if (validated.secondaryPhone !== undefined) updatePayload.secondary_phone = validated.secondaryPhone?.trim() || null;
    if (validated.permanentAddress !== undefined) updatePayload.permanent_address = validated.permanentAddress?.trim() || null;
    if (validated.emergencyContactName !== undefined) updatePayload.emergency_contact_name = validated.emergencyContactName?.trim() || null;
    if (validated.emergencyContactRelationship !== undefined) updatePayload.emergency_contact_relationship = validated.emergencyContactRelationship?.trim() || null;
    if (validated.emergencyContactPhone !== undefined) updatePayload.emergency_contact_phone = validated.emergencyContactPhone?.trim() || null;

    // Section C: Additional Clinical & Social Information
    if (validated.occupation !== undefined) updatePayload.occupation = validated.occupation?.trim() || null;
    if (validated.allergies !== undefined) updatePayload.allergies = validated.allergies?.trim() || null;
    if (validated.medicalHistory !== undefined) updatePayload.medical_history = validated.medicalHistory?.trim() || null;
    if (validated.currentMedications !== undefined) updatePayload.current_medications = validated.currentMedications?.trim() || null;
    if (validated.patientNotes !== undefined) updatePayload.patient_notes = validated.patientNotes?.trim() || null;

    // SMS Consent
    if (validated.smsConsentStatus !== undefined) {
      updatePayload.sms_consent_status = validated.smsConsentStatus;
      updatePayload.sms_consent_at =
        validated.smsConsentAt ||
        (validated.smsConsentStatus !== "unknown" ? new Date().toISOString() : null);
      updatePayload.sms_consent_source =
        validated.smsConsentSource ||
        (validated.smsConsentStatus !== "unknown" ? "in_person" : null);
    } else {
      if (validated.smsConsentAt !== undefined) updatePayload.sms_consent_at = validated.smsConsentAt;
      if (validated.smsConsentSource !== undefined) updatePayload.sms_consent_source = validated.smsConsentSource;
    }

    if (validated.dateOfBirth !== undefined) {
      updatePayload.date_of_birth = validated.dateOfBirth;
      updatePayload.age = validated.age ?? calculateAge(validated.dateOfBirth);
    } else if (validated.age !== undefined) {
      updatePayload.age = validated.age;
    }

    const { data: updated, error } = await this.client
      .from("patients")
      .update(updatePayload)
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      throw new DataError(`Failed to update patient: ${error.message}`, error.code);
    }

    return mapPatientFromRow(updated);
  }

  public async deletePatient(id: string): Promise<boolean> {
    const existing = await this.getPatientByIdentifier(id);
    if (!existing) {
      throw new PatientNotFoundError(id);
    }

    const { error } = await this.client
      .from("patients")
      .delete()
      .eq("id", existing.id);

    if (error) {
      throw new DataError(`Failed to delete patient: ${error.message}`, error.code);
    }

    return true;
  }

  public async getRecentPatients(limit = 5, chamberId?: string): Promise<Patient[]> {
    let query = this.client
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (chamberId) {
      if (chamberId === "unassigned") {
        query = query.is("chamber_id", null);
      } else if (chamberId !== "all") {
        query = query.eq("chamber_id", chamberId);
      }
    }

    const { data, error } = await query;

    if (error) {
      throw new DataError(`Failed to fetch recent patients: ${error.message}`, error.code);
    }

    return (data || []).map(mapPatientFromRow);
  }

  public async getTotalPatientCount(chamberId?: string): Promise<number> {
    let query = this.client
      .from("patients")
      .select("*", { count: "exact", head: true });

    if (chamberId) {
      if (chamberId === "unassigned") {
        query = query.is("chamber_id", null);
      } else if (chamberId !== "all") {
        query = query.eq("chamber_id", chamberId);
      }
    }

    const { count, error } = await query;

    if (error) {
      throw new DataError(`Failed to count patients: ${error.message}`, error.code);
    }

    return count ?? 0;
  }
}
