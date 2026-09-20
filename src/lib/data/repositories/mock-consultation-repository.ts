import { IConsultationRepository } from "./consultation-repository.interface";
import {
  Consultation,
  CreateConsultationDTO,
  UpdateConsultationDTO,
} from "@/types/consultation";
import { MockStorage } from "../mock/mock-storage";
import { SEED_CONSULTATIONS } from "../mock/mock-consultations.data";
import { generateInternalUUID } from "../id-generator";
import { PatientNotFoundError, ValidationError, DataError } from "../errors";
import {
  createConsultationSchema,
  updateConsultationSchema,
} from "@/schemas/consultation";
import { IPatientRepository } from "./patient-repository.interface";
import { MockPatientRepository } from "./mock-patient-repository";

export class MockConsultationRepository implements IConsultationRepository {
  private storageKey = "consultations_list";
  private patientRepo: IPatientRepository;

  constructor(patientRepo?: IPatientRepository) {
    this.patientRepo = patientRepo || new MockPatientRepository();
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    const existing = MockStorage.get<Consultation[]>(this.storageKey);
    if (!existing || existing.length === 0) {
      MockStorage.set(this.storageKey, SEED_CONSULTATIONS);
    }
  }

  private getAllInternal(): Consultation[] {
    return MockStorage.get<Consultation[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: Consultation[]): void {
    MockStorage.set(this.storageKey, items);
  }

  public async getConsultationsByPatient(
    patientIdentifier: string
  ): Promise<Consultation[]> {
    const patient = await this.patientRepo.getPatientByIdentifier(
      patientIdentifier
    );
    if (!patient) return [];

    const list = this.getAllInternal();

    // Match either canonical patientId (e.g. PT-000001) or internal UUID
    const matches = list.filter(
      (c) =>
        c.patientId.toUpperCase() === patient.patientId.toUpperCase() ||
        c.patientId === patient.id
    );

    // Historical records: newest consultation first
    return matches.sort((a, b) => {
      const dateDiff =
        new Date(b.consultationDate).getTime() -
        new Date(a.consultationDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  public async getConsultationById(id: string): Promise<Consultation | null> {
    const list = this.getAllInternal();
    const found = list.find((c) => c.id === id);
    return found || null;
  }

  public async createConsultation(
    data: CreateConsultationDTO
  ): Promise<Consultation> {
    // 1. Validate with Zod
    const validation = createConsultationSchema.safeParse(data);
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {};
      const issues =
        validation.error.issues ||
        (validation.error as unknown as {
          errors?: Array<{
            path: Array<string | number>;
            message: string;
          }>;
        }).errors ||
        [];
      issues.forEach((err) => {
        const path = err.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(err.message);
      });
      throw new ValidationError("Invalid consultation data provided.", fieldErrors);
    }

    const validated = validation.data;

    // 2. Validate patient existence
    const patient = await this.patientRepo.getPatientByIdentifier(
      validated.patientId
    );
    if (!patient) {
      throw new PatientNotFoundError(validated.patientId);
    }

    const now = new Date().toISOString();
    const newConsultation: Consultation = {
      id: generateInternalUUID(),
      patientId: patient.patientId, // Store canonical patientId
      consultationDate: validated.consultationDate,
      chiefComplaint: validated.chiefComplaint,
      birthHistory: validated.birthHistory,
      familyHistory: validated.familyHistory,
      consanguinity: validated.consanguinity,
      drugHistory: validated.drugHistory,
      others: validated.others,
      clinicalExamination: validated.clinicalExamination,
      investigationAdvised: validated.investigationAdvised,
      currentInvestigation: validated.currentInvestigation,
      provisionalDiagnosis: validated.provisionalDiagnosis,
      differentialDiagnosis: validated.differentialDiagnosis,
      plan: validated.plan,
      advice: validated.advice,
      nextFollowUp: validated.nextFollowUp || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const list = this.getAllInternal();
    list.unshift(newConsultation);
    this.saveAllInternal(list);

    // Update patient updatedAt
    await this.patientRepo.updatePatient(patient.id, {});

    return newConsultation;
  }

  public async updateConsultation(
    id: string,
    data: UpdateConsultationDTO
  ): Promise<Consultation> {
    const validation = updateConsultationSchema.safeParse(data);
    if (!validation.success) {
      throw new ValidationError("Invalid update data provided.");
    }

    const list = this.getAllInternal();
    const index = list.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new DataError(`Consultation with ID "${id}" was not found.`);
    }

    const existing = list[index]!;
    const now = new Date().toISOString();

    const updated: Consultation = {
      ...existing,
      ...data,
      id: existing.id, // Immutable ID
      patientId: existing.patientId, // Immutable patient linkage
      createdAt: existing.createdAt, // Preserve audit creation timestamp
      updatedAt: now,
    };

    list[index] = updated;
    this.saveAllInternal(list);

    return updated;
  }

  public async getRecentConsultations(
    limit: number = 5
  ): Promise<Consultation[]> {
    const list = this.getAllInternal();
    return list
      .slice()
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      .slice(0, limit);
  }

  public async getTotalConsultationCount(): Promise<number> {
    return this.getAllInternal().length;
  }
}
