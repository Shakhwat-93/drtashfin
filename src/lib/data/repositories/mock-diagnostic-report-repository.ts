/**
 * Mock Diagnostic Report Repository for Offline Testing & Staging Validation
 * Phase 26: Diagnostic Test Reports & Google Drive Link-Only Management
 */

import {
  DiagnosticReport,
  CreateDiagnosticReportDTO,
  UpdateDiagnosticReportDTO,
} from "@/types/diagnostic-report";
import { IDiagnosticReportRepository } from "./diagnostic-report-repository.interface";
import { MockStorage } from "../mock/mock-storage";
import { IPatientRepository } from "./patient-repository.interface";
import { MockPatientRepository } from "./mock-patient-repository";
import { IConsultationRepository } from "./consultation-repository.interface";
import { MockConsultationRepository } from "./mock-consultation-repository";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";

export class MockDiagnosticReportRepository implements IDiagnosticReportRepository {
  private storageKey = "diagnostic_reports_list";

  constructor(
    private patientRepo: IPatientRepository = new MockPatientRepository(),
    private consultationRepo: IConsultationRepository = new MockConsultationRepository()
  ) {}

  private getAllInternal(): DiagnosticReport[] {
    return MockStorage.get<DiagnosticReport[]>(this.storageKey) || [];
  }

  private saveAllInternal(items: DiagnosticReport[]): void {
    MockStorage.set(this.storageKey, items);
  }

  private async enrichReportMetadata(report: DiagnosticReport): Promise<DiagnosticReport> {
    try {
      const patient = await this.patientRepo.getPatientById(report.patientId);
      if (patient) {
        report.patientName = patient.name;
        report.patientCode = patient.patientId;
      }
    } catch {
      // Non-fatal metadata enrichment
    }

    if (report.consultationId) {
      try {
        const consultation = await this.consultationRepo.getConsultationById(report.consultationId);
        if (consultation) {
          report.consultationDate = consultation.consultationDate;
        }
      } catch {
        // Non-fatal
      }
    }

    return report;
  }

  async getReportsForPatient(patientId: string): Promise<DiagnosticReport[]> {
    const all = this.getAllInternal();
    const filtered = all.filter(
      (r) => r.patientId === patientId || r.patientCode === patientId
    );

    // Sort chronologically: newest testDate first
    filtered.sort((a, b) => {
      const dateDiff = new Date(b.testDate).getTime() - new Date(a.testDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const enriched = await Promise.all(
      filtered.map((item) => this.enrichReportMetadata({ ...item }))
    );
    return enriched;
  }

  async getReportsForConsultation(consultationId: string): Promise<DiagnosticReport[]> {
    const all = this.getAllInternal();
    const filtered = all.filter((r) => r.consultationId === consultationId);

    filtered.sort((a, b) => {
      const dateDiff = new Date(b.testDate).getTime() - new Date(a.testDate).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const enriched = await Promise.all(
      filtered.map((item) => this.enrichReportMetadata({ ...item }))
    );
    return enriched;
  }

  async getReportById(id: string): Promise<DiagnosticReport | null> {
    const all = this.getAllInternal();
    const item = all.find((r) => r.id === id);
    if (!item) return null;
    return this.enrichReportMetadata({ ...item });
  }

  async createReport(dto: CreateDiagnosticReportDTO): Promise<DiagnosticReport> {
    // 1. Google Drive URL validation and normalization
    const driveResult = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
    if (!driveResult.isValid || !driveResult.normalizedUrl) {
      throw new ValidationError(
        driveResult.error || "Must be a valid HTTPS Google Drive URL"
      );
    }

    // 2. Patient existence check
    const patient = await this.patientRepo.getPatientById(dto.patientId);
    if (!patient) {
      throw new DataError(`Patient with ID "${dto.patientId}" does not exist`, "NOT_FOUND");
    }

    // 3. Consultation existence check if linked
    if (dto.consultationId) {
      const consultation = await this.consultationRepo.getConsultationById(dto.consultationId);
      if (!consultation) {
        throw new DataError(
          `Consultation with ID "${dto.consultationId}" does not exist`,
          "NOT_FOUND"
        );
      }
    }

    const now = new Date().toISOString();
    const newReport: DiagnosticReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: patient.id,
      consultationId: dto.consultationId || null,
      testName: dto.testName.trim(),
      category: dto.category,
      testDate: dto.testDate,
      diagnosticCenter: dto.diagnosticCenter?.trim() || null,
      doctorNotes: dto.doctorNotes?.trim() || null,
      driveUrl: driveResult.normalizedUrl,
      createdAt: now,
      updatedAt: now,
      patientName: patient.name,
      patientCode: patient.patientId,
    };

    const all = this.getAllInternal();
    all.push(newReport);
    this.saveAllInternal(all);

    return this.enrichReportMetadata({ ...newReport });
  }

  async updateReport(id: string, dto: UpdateDiagnosticReportDTO): Promise<DiagnosticReport> {
    const all = this.getAllInternal();
    const index = all.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new DataError(`Diagnostic report with ID "${id}" was not found`, "NOT_FOUND");
    }

    const current = all[index];
    let updatedDriveUrl = current.driveUrl;

    if (dto.driveUrl) {
      const driveResult = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
      if (!driveResult.isValid || !driveResult.normalizedUrl) {
        throw new ValidationError(
          driveResult.error || "Must be a valid HTTPS Google Drive URL"
        );
      }
      updatedDriveUrl = driveResult.normalizedUrl;
    }

    if (dto.consultationId) {
      const consultation = await this.consultationRepo.getConsultationById(dto.consultationId);
      if (!consultation) {
        throw new DataError(
          `Consultation with ID "${dto.consultationId}" does not exist`,
          "NOT_FOUND"
        );
      }
    }

    const updated: DiagnosticReport = {
      ...current,
      testName: dto.testName !== undefined ? dto.testName.trim() : current.testName,
      category: dto.category !== undefined ? dto.category : current.category,
      testDate: dto.testDate !== undefined ? dto.testDate : current.testDate,
      diagnosticCenter:
        dto.diagnosticCenter !== undefined
          ? dto.diagnosticCenter?.trim() || null
          : current.diagnosticCenter,
      doctorNotes:
        dto.doctorNotes !== undefined ? dto.doctorNotes?.trim() || null : current.doctorNotes,
      driveUrl: updatedDriveUrl,
      consultationId:
        dto.consultationId !== undefined ? dto.consultationId : current.consultationId,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    this.saveAllInternal(all);

    return this.enrichReportMetadata({ ...updated });
  }

  async deleteReport(id: string): Promise<boolean> {
    const all = this.getAllInternal();
    const filtered = all.filter((r) => r.id !== id);
    if (filtered.length === all.length) {
      return false;
    }
    this.saveAllInternal(filtered);
    return true;
  }
}
