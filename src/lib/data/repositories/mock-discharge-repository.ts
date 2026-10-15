/**
 * Mock Patient Discharge Repository for Offline Testing & Staging Validation
 * Phase 28: Patient Discharge & Final Clinical Report Management
 */

import {
  PatientDischarge,
  CreateDischargeDTO,
  UpdateDischargeDTO,
  AmendDischargeDTO,
  DischargeFilterParams,
} from "@/types/discharge";
import { IDischargeRepository } from "./discharge-repository.interface";
import { MockStorage } from "../mock/mock-storage";
import { IPatientRepository } from "./patient-repository.interface";
import { MockPatientRepository } from "./mock-patient-repository";
import { IConsultationRepository } from "./consultation-repository.interface";
import { MockConsultationRepository } from "./mock-consultation-repository";
import { IFollowUpRepository } from "./follow-up-repository.interface";
import { MockFollowUpRepository } from "./mock-follow-up-repository";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";

export class MockDischargeRepository implements IDischargeRepository {
  private storageKey = "patient_discharges_list";
  private followUpRepo: IFollowUpRepository;

  constructor(
    private patientRepo: IPatientRepository = new MockPatientRepository(),
    private consultationRepo: IConsultationRepository = new MockConsultationRepository(),
    followUpRepo?: IFollowUpRepository
  ) {
    this.followUpRepo =
      followUpRepo || new MockFollowUpRepository(this.patientRepo);
  }

  private getAllInternal(): PatientDischarge[] {
    return MockStorage.get<PatientDischarge[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: PatientDischarge[]): void {
    MockStorage.set(this.storageKey, items);
  }

  private async enrichDischargeMetadata(
    discharge: PatientDischarge
  ): Promise<PatientDischarge> {
    try {
      const patient = await this.patientRepo.getPatientById(discharge.patientId);
      if (patient) {
        discharge.patientName = patient.name;
        discharge.patientCode = patient.patientId;
      }
    } catch {
      // Non-fatal metadata enrichment
    }

    if (discharge.consultationId) {
      try {
        const consultation = await this.consultationRepo.getConsultationById(
          discharge.consultationId
        );
        if (consultation) {
          discharge.consultationDate = consultation.consultationDate;
        }
      } catch {
        // Non-fatal
      }
    }

    return discharge;
  }

  async getDischarges(
    params?: DischargeFilterParams
  ): Promise<PatientDischarge[]> {
    let all = this.getAllInternal();

    if (params?.patientId) {
      all = all.filter(
        (d) =>
          d.patientId === params.patientId || d.patientCode === params.patientId
      );
    }

    if (params?.consultationId) {
      all = all.filter((d) => d.consultationId === params.consultationId);
    }

    if (params?.status && params.status !== "all") {
      all = all.filter((d) => d.status === params.status);
    }

    if (params?.startDate) {
      all = all.filter((d) => d.dischargeDate >= params.startDate!);
    }

    if (params?.endDate) {
      all = all.filter((d) => d.dischargeDate <= params.endDate!);
    }

    if (params?.searchQuery && params.searchQuery.trim().length > 0) {
      const q = params.searchQuery.toLowerCase().trim();
      all = all.filter(
        (d) =>
          d.finalDiagnosis.toLowerCase().includes(q) ||
          d.clinicalReason.toLowerCase().includes(q) ||
          d.treatmentSummary.toLowerCase().includes(q) ||
          d.conditionAtDischarge.toLowerCase().includes(q) ||
          d.dischargeInstructions.toLowerCase().includes(q) ||
          d.doctorName?.toLowerCase().includes(q)
      );
    }

    // Sort chronologically: newest dischargeDate first, then createdAt descending
    all.sort((a, b) => {
      const dateDiff =
        new Date(b.dischargeDate).getTime() - new Date(a.dischargeDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const enriched = await Promise.all(
      all.map((item) => this.enrichDischargeMetadata({ ...item }))
    );
    return enriched;
  }

  async getDischargeById(id: string): Promise<PatientDischarge | null> {
    const all = this.getAllInternal();
    const item = all.find((d) => d.id === id);
    if (!item) return null;
    return this.enrichDischargeMetadata({ ...item });
  }

  async createDischarge(dto: CreateDischargeDTO): Promise<PatientDischarge> {
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
    const patient = await this.patientRepo.getPatientById(dto.patientId);
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

    // 4. Optional integrated follow-up scheduling
    if (dto.scheduleFollowUp && dto.recommendedFollowUpDate) {
      try {
        await this.followUpRepo.createFollowUp({
          patientId: patient.id,
          chamberId: dto.followUpChamberId || patient.chamberId || undefined,
          consultationId: dto.consultationId || undefined,
          scheduledDate: dto.recommendedFollowUpDate,
          reason:
            dto.followUpInstructions ||
            "Post-discharge clinical review and follow-up",
          notes: dto.followUpInstructions || undefined,
          priority: dto.followUpPriority || "normal",
        });
      } catch {
        // Non-fatal follow-up creation error
      }
    }

    const now = new Date().toISOString();
    const isFinalized = dto.status === "finalized";

    const newDischarge: PatientDischarge = {
      id: `disch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: patient.id,
      consultationId: dto.consultationId || null,
      dischargeDate: dto.dischargeDate,
      dischargeTime: dto.dischargeTime?.trim() || null,
      status: dto.status || "draft",
      clinicalReason: dto.clinicalReason.trim(),
      finalDiagnosis: dto.finalDiagnosis.trim(),
      treatmentSummary: dto.treatmentSummary.trim(),
      conditionAtDischarge: dto.conditionAtDischarge,
      dischargeInstructions: dto.dischargeInstructions.trim(),
      medicationInstructions: dto.medicationInstructions?.trim() || null,
      recommendedFollowUpDate: dto.recommendedFollowUpDate || null,
      followUpInstructions: dto.followUpInstructions?.trim() || null,
      complications: dto.complications?.trim() || null,
      doctorId: dto.doctorId || "dr-tashfin",
      doctorName: dto.doctorName || "Dr. Tashfin",
      driveUrl: normalizedDriveUrl,
      finalizedAt: isFinalized ? now : null,
      finalizedBy: isFinalized ? dto.doctorName || "Dr. Tashfin" : null,
      amendmentNotes: null,
      amendedAt: null,
      amendedBy: null,
      createdAt: now,
      updatedAt: now,
      patientName: patient.name,
      patientCode: patient.patientId,
    };

    const all = this.getAllInternal();
    all.push(newDischarge);
    this.saveAllInternal(all);

    return this.enrichDischargeMetadata({ ...newDischarge });
  }

  async updateDischarge(
    id: string,
    dto: UpdateDischargeDTO
  ): Promise<PatientDischarge> {
    const all = this.getAllInternal();
    const index = all.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new DataError(
        `Discharge record with ID "${id}" was not found`,
        "NOT_FOUND"
      );
    }

    const current = all[index];

    // Immutability protection for finalized discharge reports
    if (current.status === "finalized") {
      throw new DataError(
        "Cannot modify a finalized discharge report. Finalized clinical records are locked for audit integrity. Use amendment instead."
      );
    }

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

    // Optional follow-up scheduling
    if (dto.scheduleFollowUp && dto.recommendedFollowUpDate) {
      try {
        await this.followUpRepo.createFollowUp({
          patientId: current.patientId,
          chamberId: dto.followUpChamberId || undefined,
          consultationId: dto.consultationId || current.consultationId || undefined,
          scheduledDate: dto.recommendedFollowUpDate,
          reason: "Post-discharge clinical review and follow-up",
          notes: dto.followUpInstructions || undefined,
          priority: dto.followUpPriority || "normal",
        });
      } catch {
        // Non-fatal
      }
    }

    const updated: PatientDischarge = {
      ...current,
      dischargeDate:
        dto.dischargeDate !== undefined ? dto.dischargeDate : current.dischargeDate,
      dischargeTime:
        dto.dischargeTime !== undefined
          ? dto.dischargeTime?.trim() || null
          : current.dischargeTime,
      clinicalReason:
        dto.clinicalReason !== undefined
          ? dto.clinicalReason.trim()
          : current.clinicalReason,
      finalDiagnosis:
        dto.finalDiagnosis !== undefined
          ? dto.finalDiagnosis.trim()
          : current.finalDiagnosis,
      treatmentSummary:
        dto.treatmentSummary !== undefined
          ? dto.treatmentSummary.trim()
          : current.treatmentSummary,
      conditionAtDischarge:
        dto.conditionAtDischarge !== undefined
          ? dto.conditionAtDischarge
          : current.conditionAtDischarge,
      dischargeInstructions:
        dto.dischargeInstructions !== undefined
          ? dto.dischargeInstructions.trim()
          : current.dischargeInstructions,
      medicationInstructions:
        dto.medicationInstructions !== undefined
          ? dto.medicationInstructions?.trim() || null
          : current.medicationInstructions,
      recommendedFollowUpDate:
        dto.recommendedFollowUpDate !== undefined
          ? dto.recommendedFollowUpDate
          : current.recommendedFollowUpDate,
      followUpInstructions:
        dto.followUpInstructions !== undefined
          ? dto.followUpInstructions?.trim() || null
          : current.followUpInstructions,
      complications:
        dto.complications !== undefined
          ? dto.complications?.trim() || null
          : current.complications,
      doctorName:
        dto.doctorName !== undefined
          ? dto.doctorName?.trim() || null
          : current.doctorName,
      driveUrl: updatedDriveUrl,
      consultationId:
        dto.consultationId !== undefined
          ? dto.consultationId
          : current.consultationId,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveAllInternal(all);

    return this.enrichDischargeMetadata({ ...updated });
  }

  async finalizeDischarge(
    id: string,
    finalizedBy?: string
  ): Promise<PatientDischarge> {
    const all = this.getAllInternal();
    const index = all.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new DataError(
        `Discharge record with ID "${id}" was not found`,
        "NOT_FOUND"
      );
    }

    const current = all[index];
    if (current.status === "finalized") {
      return this.enrichDischargeMetadata({ ...current });
    }

    const now = new Date().toISOString();
    const finalized: PatientDischarge = {
      ...current,
      status: "finalized",
      finalizedAt: now,
      finalizedBy: finalizedBy || current.doctorName || "Dr. Tashfin",
      updatedAt: now,
    };

    all[index] = finalized;
    this.saveAllInternal(all);

    return this.enrichDischargeMetadata({ ...finalized });
  }

  async amendDischarge(
    id: string,
    dto: AmendDischargeDTO
  ): Promise<PatientDischarge> {
    const all = this.getAllInternal();
    const index = all.findIndex((d) => d.id === id);
    if (index === -1) {
      throw new DataError(
        `Discharge record with ID "${id}" was not found`,
        "NOT_FOUND"
      );
    }

    const current = all[index];
    if (current.status !== "finalized") {
      throw new DataError(
        "Only finalized discharge reports can receive an auditable amendment. For drafts, edit the record directly."
      );
    }

    const now = new Date().toISOString();
    const existingAmendments = current.amendmentNotes ? `${current.amendmentNotes}\n\n` : "";
    const newAmendmentEntry = `[Amendment on ${now.split("T")[0]} by ${
      dto.amendedBy || "Dr. Tashfin"
    }]:\n${dto.amendmentNotes.trim()}`;

    const updated: PatientDischarge = {
      ...current,
      amendmentNotes: `${existingAmendments}${newAmendmentEntry}`,
      amendedAt: now,
      amendedBy: dto.amendedBy || "Dr. Tashfin",
      updatedAt: now,
    };

    all[index] = updated;
    this.saveAllInternal(all);

    return this.enrichDischargeMetadata({ ...updated });
  }

  async deleteDraftDischarge(id: string): Promise<boolean> {
    const all = this.getAllInternal();
    const item = all.find((d) => d.id === id);
    if (!item) {
      return false;
    }

    if (item.status === "finalized") {
      throw new DataError(
        "Finalized discharge reports cannot be deleted to preserve clinical audit integrity."
      );
    }

    const filtered = all.filter((d) => d.id !== id);
    this.saveAllInternal(filtered);
    return true;
  }
}
