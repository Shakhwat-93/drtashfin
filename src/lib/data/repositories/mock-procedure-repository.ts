/**
 * Mock Procedure & Operation Repository for Offline Testing & Staging Validation
 * Phase 27: Patient Operation & Procedure History Management
 */

import {
  PatientProcedure,
  CreateProcedureDTO,
  UpdateProcedureDTO,
  ProcedureFilterParams,
} from "@/types/procedure";
import { IProcedureRepository } from "./procedure-repository.interface";
import { MockStorage } from "../mock/mock-storage";
import { IPatientRepository } from "./patient-repository.interface";
import { MockPatientRepository } from "./mock-patient-repository";
import { IConsultationRepository } from "./consultation-repository.interface";
import { MockConsultationRepository } from "./mock-consultation-repository";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";

export class MockProcedureRepository implements IProcedureRepository {
  private storageKey = "patient_procedures_list";

  constructor(
    private patientRepo: IPatientRepository = new MockPatientRepository(),
    private consultationRepo: IConsultationRepository = new MockConsultationRepository()
  ) {}

  private getAllInternal(): PatientProcedure[] {
    return MockStorage.get<PatientProcedure[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: PatientProcedure[]): void {
    MockStorage.set(this.storageKey, items);
  }

  private async enrichProcedureMetadata(
    procedure: PatientProcedure
  ): Promise<PatientProcedure> {
    try {
      const patient = await this.patientRepo.getPatientByIdentifier(procedure.patientId);
      if (patient) {
        procedure.patientName = patient.name;
        procedure.patientCode = patient.patientId;
      }
    } catch {
      // Non-fatal metadata enrichment
    }

    if (procedure.consultationId) {
      try {
        const consultation = await this.consultationRepo.getConsultationById(
          procedure.consultationId
        );
        if (consultation) {
          procedure.consultationDate = consultation.consultationDate;
        }
      } catch {
        // Non-fatal
      }
    }

    return procedure;
  }

  async getProcedures(
    params?: ProcedureFilterParams
  ): Promise<PatientProcedure[]> {
    let all = this.getAllInternal();

    if (params?.patientId) {
      all = all.filter(
        (p) =>
          p.patientId === params.patientId || p.patientCode === params.patientId
      );
    }

    if (params?.consultationId) {
      all = all.filter((p) => p.consultationId === params.consultationId);
    }

    if (params?.category && params.category !== "all") {
      all = all.filter((p) => p.category === params.category);
    }

    if (params?.startDate) {
      all = all.filter((p) => p.procedureDate >= params.startDate!);
    }

    if (params?.endDate) {
      all = all.filter((p) => p.procedureDate <= params.endDate!);
    }

    if (params?.searchQuery && params.searchQuery.trim().length > 0) {
      const query = params.searchQuery.toLowerCase().trim();
      all = all.filter(
        (p) =>
          p.procedureName.toLowerCase().includes(query) ||
          p.hospitalFacility?.toLowerCase().includes(query) ||
          p.performingDoctor?.toLowerCase().includes(query) ||
          p.clinicalIndication?.toLowerCase().includes(query)
      );
    }

    // Sort chronologically: newest procedureDate first
    all.sort((a, b) => {
      const dateDiff =
        new Date(b.procedureDate).getTime() - new Date(a.procedureDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const enriched = await Promise.all(
      all.map((item) => this.enrichProcedureMetadata({ ...item }))
    );
    return enriched;
  }

  async getProcedureById(id: string): Promise<PatientProcedure | null> {
    const all = this.getAllInternal();
    const item = all.find((p) => p.id === id);
    if (!item) return null;
    return this.enrichProcedureMetadata({ ...item });
  }

  async createProcedure(dto: CreateProcedureDTO): Promise<PatientProcedure> {
    // 1. Google Drive URL validation and normalization (optional)
    let normalizedDriveUrl: string | null = null;
    if (dto.driveUrl && dto.driveUrl.trim().length > 0) {
      const driveResult = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
      if (!driveResult.isValid || !driveResult.normalizedUrl) {
        throw new ValidationError(
          driveResult.error || "Must be a valid HTTPS Google Drive URL"
        );
      }
      normalizedDriveUrl = driveResult.normalizedUrl;
    }

    // 2. Patient existence check
    const patient = await this.patientRepo.getPatientByIdentifier(dto.patientId);
    if (!patient) {
      throw new DataError(
        `Patient with ID "${dto.patientId}" does not exist`,
        "NOT_FOUND"
      );
    }

    // 3. Consultation existence check if linked
    if (dto.consultationId) {
      const consultation = await this.consultationRepo.getConsultationById(
        dto.consultationId
      );
      if (!consultation) {
        throw new DataError(
          `Consultation with ID "${dto.consultationId}" does not exist`,
          "NOT_FOUND"
        );
      }
    }

    const now = new Date().toISOString();
    const newProcedure: PatientProcedure = {
      id: `proc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: patient.id,
      consultationId: dto.consultationId || null,
      procedureName: dto.procedureName.trim(),
      category: dto.category,
      procedureDate: dto.procedureDate,
      hospitalFacility: dto.hospitalFacility?.trim() || null,
      performingDoctor: dto.performingDoctor?.trim() || null,
      clinicalIndication: dto.clinicalIndication?.trim() || null,
      doctorNotes: dto.doctorNotes?.trim() || null,
      outcome: dto.outcome?.trim() || null,
      complications: dto.complications?.trim() || null,
      recoveryNotes: dto.recoveryNotes?.trim() || null,
      driveUrl: normalizedDriveUrl,
      createdAt: now,
      updatedAt: now,
      patientName: patient.name,
      patientCode: patient.patientId,
    };

    const all = this.getAllInternal();
    all.push(newProcedure);
    this.saveAllInternal(all);

    return this.enrichProcedureMetadata({ ...newProcedure });
  }

  async updateProcedure(
    id: string,
    dto: UpdateProcedureDTO
  ): Promise<PatientProcedure> {
    const all = this.getAllInternal();
    const index = all.findIndex((p) => p.id === id);
    if (index === -1) {
      throw new DataError(
        `Procedure record with ID "${id}" was not found`,
        "NOT_FOUND"
      );
    }

    const current = all[index];
    let updatedDriveUrl = current.driveUrl;

    if (dto.driveUrl !== undefined) {
      if (dto.driveUrl && dto.driveUrl.trim().length > 0) {
        const driveResult = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
        if (!driveResult.isValid || !driveResult.normalizedUrl) {
          throw new ValidationError(
            driveResult.error || "Must be a valid HTTPS Google Drive URL"
          );
        }
        updatedDriveUrl = driveResult.normalizedUrl;
      } else {
        updatedDriveUrl = null;
      }
    }

    if (dto.consultationId) {
      const consultation = await this.consultationRepo.getConsultationById(
        dto.consultationId
      );
      if (!consultation) {
        throw new DataError(
          `Consultation with ID "${dto.consultationId}" does not exist`,
          "NOT_FOUND"
        );
      }
    }

    const updated: PatientProcedure = {
      ...current,
      procedureName:
        dto.procedureName !== undefined
          ? dto.procedureName.trim()
          : current.procedureName,
      category: dto.category !== undefined ? dto.category : current.category,
      procedureDate:
        dto.procedureDate !== undefined
          ? dto.procedureDate
          : current.procedureDate,
      hospitalFacility:
        dto.hospitalFacility !== undefined
          ? dto.hospitalFacility?.trim() || null
          : current.hospitalFacility,
      performingDoctor:
        dto.performingDoctor !== undefined
          ? dto.performingDoctor?.trim() || null
          : current.performingDoctor,
      clinicalIndication:
        dto.clinicalIndication !== undefined
          ? dto.clinicalIndication?.trim() || null
          : current.clinicalIndication,
      doctorNotes:
        dto.doctorNotes !== undefined
          ? dto.doctorNotes?.trim() || null
          : current.doctorNotes,
      outcome:
        dto.outcome !== undefined
          ? dto.outcome?.trim() || null
          : current.outcome,
      complications:
        dto.complications !== undefined
          ? dto.complications?.trim() || null
          : current.complications,
      recoveryNotes:
        dto.recoveryNotes !== undefined
          ? dto.recoveryNotes?.trim() || null
          : current.recoveryNotes,
      driveUrl: updatedDriveUrl,
      consultationId:
        dto.consultationId !== undefined
          ? dto.consultationId
          : current.consultationId,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveAllInternal(all);

    return this.enrichProcedureMetadata({ ...updated });
  }

  async deleteProcedure(id: string): Promise<boolean> {
    const all = this.getAllInternal();
    const filtered = all.filter((p) => p.id !== id);
    if (filtered.length === all.length) {
      return false;
    }
    this.saveAllInternal(filtered);
    return true;
  }
}
