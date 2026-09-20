import { IPatientRepository } from "./patient-repository.interface";
import {
  Patient,
  CreatePatientDTO,
  UpdatePatientDTO,
  PatientQueryParams,
} from "@/types/patient";
import { PaginatedResult } from "@/types/common";
import { MockStorage } from "../mock/mock-storage";
import { SEED_PATIENTS } from "../mock/mock-patients.data";
import {
  formatPatientId,
  parsePatientSequence,
  generateInternalUUID,
} from "../id-generator";
import {
  PatientNotFoundError,
  DuplicatePatientIdError,
  ValidationError,
} from "../errors";
import { createPatientSchema, updatePatientSchema } from "@/schemas/patient";

export class MockPatientRepository implements IPatientRepository {
  private storageKey = "patients_list";

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    const existing = MockStorage.get<Patient[]>(this.storageKey);
    if (!existing || existing.length === 0) {
      MockStorage.set(this.storageKey, SEED_PATIENTS);
    }
  }

  private getAllInternal(): Patient[] {
    return MockStorage.get<Patient[]>(this.storageKey) || [];
  }

  private saveAllInternal(patients: Patient[]): void {
    MockStorage.set(this.storageKey, patients);
  }

  private calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return Math.max(0, age);
  }

  public async getPatients(
    params: PatientQueryParams = {}
  ): Promise<PaginatedResult<Patient>> {
    let list = this.getAllInternal();

    // 1. Search Filter (name, patientId, phone, email, dateOfBirth)
    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.dateOfBirth && p.dateOfBirth.includes(q))
      );
    }

    // 2. Gender Filter
    if (params.gender) {
      list = list.filter((p) => p.gender === params.gender);
    }

    // 3. Sorting
    const sortBy = (params.sortBy || "createdAt") as keyof Patient;
    const sortOrder = params.sortOrder || "desc";

    list.sort((a, b) => {
      const valA = a[sortBy];
      const valB = b[sortBy];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      let comparison = 0;
      if (typeof valA === "string" && typeof valB === "string") {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === "number" && typeof valB === "number") {
        comparison = valA - valB;
      } else {
        comparison = String(valA).localeCompare(String(valB));
      }

      return sortOrder === "desc" ? -comparison : comparison;
    });

    // 4. Pagination
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize || 10));
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const items = list.slice(startIndex, startIndex + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public async getPatientById(id: string): Promise<Patient | null> {
    const list = this.getAllInternal();
    const found = list.find((p) => p.id === id);
    return found || null;
  }

  public async getPatientByPatientId(patientId: string): Promise<Patient | null> {
    const list = this.getAllInternal();
    const found = list.find(
      (p) => p.patientId.toUpperCase() === patientId.trim().toUpperCase()
    );
    return found || null;
  }

  public async getPatientByIdentifier(identifier: string): Promise<Patient | null> {
    if (!identifier || identifier.trim() === "") return null;
    const clean = identifier.trim();
    const list = this.getAllInternal();

    // 1. Try match by human-readable patientId (e.g. PT-000001)
    const byPatientId = list.find(
      (p) => p.patientId.toUpperCase() === clean.toUpperCase()
    );
    if (byPatientId) return byPatientId;

    // 2. Try match by internal UUID
    const byId = list.find((p) => p.id === clean);
    return byId || null;
  }

  public async checkPotentialDuplicate(
    name: string,
    phone?: string
  ): Promise<Patient | null> {
    const list = this.getAllInternal();
    const cleanName = name.trim().toLowerCase();
    const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";

    const match = list.find((p) => {
      // Check phone match (if provided and at least 7 digits)
      if (cleanPhone.length >= 7 && p.phone) {
        const pCleanPhone = p.phone.replace(/[^0-9]/g, "");
        if (pCleanPhone === cleanPhone || (cleanPhone.length >= 10 && pCleanPhone.endsWith(cleanPhone.slice(-10)))) {
          return true;
        }
      }

      // Check exact name match (case-insensitive)
      if (cleanName.length >= 3 && p.name.trim().toLowerCase() === cleanName) {
        return true;
      }

      return false;
    });

    return match || null;
  }

  public async createPatient(data: CreatePatientDTO): Promise<Patient> {
    // Validate with Zod
    const validation = createPatientSchema.safeParse(data);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      const issues = validation.error.issues || (validation.error as unknown as { errors?: Array<{ path: Array<string | number>; message: string }> }).errors || [];
      issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      throw new ValidationError("Invalid patient data provided.", fieldErrors);
    }

    const validated = validation.data;
    const list = this.getAllInternal();

    // Determine next sequential ID
    let maxSeq = 0;
    for (const p of list) {
      const seq = parsePatientSequence(p.patientId);
      if (seq > maxSeq) maxSeq = seq;
    }
    const newPatientId = formatPatientId(maxSeq + 1);

    // Ensure uniqueness
    if (list.some((p) => p.patientId === newPatientId)) {
      throw new DuplicatePatientIdError(newPatientId);
    }

    const now = new Date().toISOString();
    const age =
      validated.age !== undefined
        ? validated.age
        : this.calculateAge(validated.dateOfBirth);

    const newPatient: Patient = {
      id: generateInternalUUID(),
      patientId: newPatientId,
      name: validated.name,
      dateOfBirth: validated.dateOfBirth,
      age,
      gender: validated.gender,
      ...(validated.weight !== undefined ? { weight: validated.weight } : {}),
      ...(validated.phone ? { phone: validated.phone } : {}),
      ...(validated.email ? { email: validated.email } : {}),
      ...(validated.address ? { address: validated.address } : {}),
      ...(validated.bloodGroup ? { bloodGroup: validated.bloodGroup } : {}),
      createdAt: now,
      updatedAt: now,
    };

    list.unshift(newPatient);
    this.saveAllInternal(list);

    return newPatient;
  }

  public async updatePatient(
    id: string,
    data: UpdatePatientDTO
  ): Promise<Patient> {
    const validation = updatePatientSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError("Invalid update data provided.");
    }

    const list = this.getAllInternal();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new PatientNotFoundError(id);
    }

    const existing = list[index]!;
    const now = new Date().toISOString();

    let computedAge = existing.age;
    if (data.dateOfBirth) {
      computedAge = data.age !== undefined ? data.age : this.calculateAge(data.dateOfBirth);
    } else if (data.age !== undefined) {
      computedAge = data.age;
    }

    const updated: Patient = {
      ...existing,
      ...data,
      age: computedAge,
      updatedAt: now,
    };

    list[index] = updated;
    this.saveAllInternal(list);

    return updated;
  }

  public async deletePatient(id: string): Promise<boolean> {
    const list = this.getAllInternal();
    const index = list.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new PatientNotFoundError(id);
    }

    list.splice(index, 1);
    this.saveAllInternal(list);
    return true;
  }

  public async getRecentPatients(limit: number = 5): Promise<Patient[]> {
    const list = this.getAllInternal();
    return list
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  public async getTotalPatientCount(): Promise<number> {
    return this.getAllInternal().length;
  }
}
