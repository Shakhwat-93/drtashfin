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
    name: String(row.name),
    dateOfBirth: String(row.date_of_birth),
    age: Number(row.age),
    gender: row.gender as Patient["gender"],
    weight: row.weight != null ? Number(row.weight) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    bloodGroup: row.blood_group ? (row.blood_group as Patient["bloodGroup"]) : undefined,
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
        `name.ilike.%${q}%,patient_id.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`
      );
    }

    // 2. Gender Filter
    if (params.gender) {
      query = query.eq("gender", params.gender);
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
      query = query.or(`name.ilike.${trimmedName},phone.eq.${trimmedPhone}`);
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
      blood_group: validated.bloodGroup ?? null,
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
    if (validated.bloodGroup !== undefined) updatePayload.blood_group = validated.bloodGroup;

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

  public async getRecentPatients(limit = 5): Promise<Patient[]> {
    const { data, error } = await this.client
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new DataError(`Failed to fetch recent patients: ${error.message}`, error.code);
    }

    return (data || []).map(mapPatientFromRow);
  }

  public async getTotalPatientCount(): Promise<number> {
    const { count, error } = await this.client
      .from("patients")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new DataError(`Failed to count patients: ${error.message}`, error.code);
    }

    return count ?? 0;
  }
}
