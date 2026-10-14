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
  formatChamberPatientId,
  parseChamberPatientSequence,
  generateNextChamberPatientId,
  generateInternalUUID,
} from "../id-generator";
import { KNOWN_CHAMBERS } from "@/types/chamber";
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

    // 1. Search Filter (name, patientId, phone, secondaryPhone, email, dateOfBirth, fatherName)
    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.patientId.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.secondaryPhone && p.secondaryPhone.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q)) ||
          (p.dateOfBirth && p.dateOfBirth.includes(q)) ||
          (p.fatherName && p.fatherName.toLowerCase().includes(q))
      );
    }

    // 2. Gender Filter
    if (params.gender) {
      list = list.filter((p) => p.gender === params.gender);
    }

    // 2b. Chamber Filter
    if (params.chamberId) {
      if (params.chamberId === "unassigned") {
        list = list.filter((p) => !p.chamberId);
      } else if (params.chamberId !== "all") {
        list = list.filter((p) => p.chamberId === params.chamberId);
      }
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
      // Check phone match against primary or secondary phone
      if (cleanPhone.length >= 7) {
        const checkMatch = (targetPhone?: string) => {
          if (!targetPhone) return false;
          const pClean = targetPhone.replace(/[^0-9]/g, "");
          return pClean === cleanPhone || (cleanPhone.length >= 10 && pClean.endsWith(cleanPhone.slice(-10)));
        };
        if (checkMatch(p.phone) || checkMatch(p.secondaryPhone)) {
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

    // Determine chamber prefix
    let prefix = "PT";
    if (validated.chamberId) {
      const chamber = KNOWN_CHAMBERS.find((c) => c.id === validated.chamberId || c.code === validated.chamberId);
      if (chamber) {
        prefix = chamber.patientIdPrefix;
      }
    }

    // Determine next sequential ID for this specific prefix
    const newPatientId = generateNextChamberPatientId(
      prefix,
      list.map((p) => p.patientId)
    );

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
      ...(validated.chamberId ? { chamberId: validated.chamberId } : {}),
      name: validated.name,
      dateOfBirth: validated.dateOfBirth,
      age,
      gender: validated.gender,
      ...(validated.weight !== undefined ? { weight: validated.weight } : {}),
      ...(validated.phone ? { phone: validated.phone } : {}),
      ...(validated.email ? { email: validated.email } : {}),
      ...(validated.address ? { address: validated.address } : {}),
      ...(validated.bloodGroup ? { bloodGroup: validated.bloodGroup } : {}),

      // Section A: Family & Guardian Identity
      ...(validated.fatherName ? { fatherName: validated.fatherName } : {}),
      ...(validated.motherName ? { motherName: validated.motherName } : {}),
      ...(validated.guardianName ? { guardianName: validated.guardianName } : {}),
      ...(validated.guardianRelationship ? { guardianRelationship: validated.guardianRelationship } : {}),

      // Section B: Contact & Emergency Information
      ...(validated.secondaryPhone ? { secondaryPhone: validated.secondaryPhone } : {}),
      ...(validated.permanentAddress ? { permanentAddress: validated.permanentAddress } : {}),
      ...(validated.emergencyContactName ? { emergencyContactName: validated.emergencyContactName } : {}),
      ...(validated.emergencyContactRelationship ? { emergencyContactRelationship: validated.emergencyContactRelationship } : {}),
      ...(validated.emergencyContactPhone ? { emergencyContactPhone: validated.emergencyContactPhone } : {}),

      // Section C: Additional Clinical & Social Information
      ...(validated.occupation ? { occupation: validated.occupation } : {}),
      ...(validated.allergies ? { allergies: validated.allergies } : {}),
      ...(validated.medicalHistory ? { medicalHistory: validated.medicalHistory } : {}),
      ...(validated.currentMedications ? { currentMedications: validated.currentMedications } : {}),
      ...(validated.patientNotes ? { patientNotes: validated.patientNotes } : {}),

      // SMS Consent
      smsConsentStatus: validated.smsConsentStatus || "unknown",
      ...(validated.smsConsentAt
        ? { smsConsentAt: validated.smsConsentAt }
        : validated.smsConsentStatus && validated.smsConsentStatus !== "unknown"
        ? { smsConsentAt: now }
        : {}),
      ...(validated.smsConsentSource
        ? { smsConsentSource: validated.smsConsentSource }
        : validated.smsConsentStatus && validated.smsConsentStatus !== "unknown"
        ? { smsConsentSource: "registration" }
        : {}),

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

    let consentAt = data.smsConsentAt ?? existing.smsConsentAt;
    let consentSource = data.smsConsentSource ?? existing.smsConsentSource;
    if (data.smsConsentStatus !== undefined && data.smsConsentStatus !== existing.smsConsentStatus) {
      consentAt = data.smsConsentAt || now;
      consentSource = data.smsConsentSource || "in_person";
    }

    const updated: Patient = {
      ...existing,
      ...data,
      ...(data.smsConsentStatus !== undefined ? { smsConsentStatus: data.smsConsentStatus, smsConsentAt: consentAt, smsConsentSource: consentSource } : {}),
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

  public async getRecentPatients(limit: number = 5, chamberId?: string): Promise<Patient[]> {
    let list = this.getAllInternal();
    if (chamberId) {
      if (chamberId === "unassigned") {
        list = list.filter((p) => !p.chamberId);
      } else if (chamberId !== "all") {
        list = list.filter((p) => p.chamberId === chamberId);
      }
    }
    return list
      .slice()
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  public async getTotalPatientCount(chamberId?: string): Promise<number> {
    const list = this.getAllInternal();
    if (chamberId) {
      if (chamberId === "unassigned") {
        return list.filter((p) => !p.chamberId).length;
      } else if (chamberId !== "all") {
        return list.filter((p) => p.chamberId === chamberId).length;
      }
    }
    return list.length;
  }
}
