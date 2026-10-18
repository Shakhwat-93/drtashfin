/**
 * Supabase Diagnostic Report Repository
 * Phase 26: Diagnostic Test Reports & Google Drive Link-Only Management
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { IDiagnosticReportRepository } from "./diagnostic-report-repository.interface";
import {
  DiagnosticReport,
  CreateDiagnosticReportDTO,
  UpdateDiagnosticReportDTO,
  DiagnosticReportCategory,
} from "@/types/diagnostic-report";
import { supabase } from "@/lib/supabase/client";
import { IPatientRepository } from "./patient-repository.interface";
import { SupabasePatientRepository } from "./supabase-patient-repository";
import { IConsultationRepository } from "./consultation-repository.interface";
import { SupabaseConsultationRepository } from "./supabase-consultation-repository";
import { DataError, ValidationError } from "../errors";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import {
  createDiagnosticReportSchema,
  updateDiagnosticReportSchema,
} from "@/schemas/diagnostic-report";

function mapReportFromRow(row: Record<string, unknown>): DiagnosticReport {
  const patientRel = row.patients as Record<string, unknown> | undefined;
  const consultationRel = row.consultations as Record<string, unknown> | undefined;

  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    consultationId: row.consultation_id ? String(row.consultation_id) : null,
    testName: String(row.test_name),
    category: row.category as DiagnosticReportCategory,
    testDate: String(row.test_date),
    diagnosticCenter: row.diagnostic_center ? String(row.diagnostic_center) : null,
    doctorNotes: row.doctor_notes ? String(row.doctor_notes) : null,
    driveUrl: String(row.drive_url),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    patientName: patientRel?.name ? String(patientRel.name) : undefined,
    patientCode: patientRel?.patient_id ? String(patientRel.patient_id) : undefined,
    consultationDate: consultationRel?.consultation_date
      ? String(consultationRel.consultation_date)
      : null,
  };
}

export class SupabaseDiagnosticReportRepository implements IDiagnosticReportRepository {
  private client: SupabaseClient;
  private patientRepo: IPatientRepository;
  private consultationRepo: IConsultationRepository;

  constructor(
    client?: SupabaseClient,
    patientRepo?: IPatientRepository,
    consultationRepo?: IConsultationRepository
  ) {
    this.client = client || supabase;
    this.patientRepo = patientRepo || new SupabasePatientRepository(this.client);
    this.consultationRepo =
      consultationRepo ||
      new SupabaseConsultationRepository(this.patientRepo, this.client);
  }

  private async resolvePatientDbId(patientIdentifier: string): Promise<string> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        patientIdentifier
      );
    if (isUuid) {
      return patientIdentifier;
    }

    const patient = await this.patientRepo.getPatientByIdentifier(patientIdentifier);
    if (!patient) {
      throw new DataError(
        `Patient with identifier "${patientIdentifier}" does not exist`,
        "NOT_FOUND"
      );
    }
    return patient.id;
  }

  async getReportsForPatient(patientId: string): Promise<DiagnosticReport[]> {
    const resolvedPatientId = await this.resolvePatientDbId(patientId);

    const { data, error } = await this.client
      .from("diagnostic_reports")
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .eq("patient_id", resolvedPatientId)
      .order("test_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new DataError(`Failed to fetch diagnostic reports: ${error.message}`, error.code);
    }

    return (data || []).map((row) => mapReportFromRow(row as Record<string, unknown>));
  }

  async getReportsForConsultation(consultationId: string): Promise<DiagnosticReport[]> {
    const { data, error } = await this.client
      .from("diagnostic_reports")
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .eq("consultation_id", consultationId)
      .order("test_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      throw new DataError(
        `Failed to fetch diagnostic reports for consultation: ${error.message}`,
        error.code
      );
    }

    return (data || []).map((row) => mapReportFromRow(row as Record<string, unknown>));
  }

  async getReportById(id: string): Promise<DiagnosticReport | null> {
    const { data, error } = await this.client
      .from("diagnostic_reports")
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch diagnostic report: ${error.message}`, error.code);
    }

    if (!data) return null;
    return mapReportFromRow(data as Record<string, unknown>);
  }

  async createReport(dto: CreateDiagnosticReportDTO): Promise<DiagnosticReport> {
    // 1. Resolve patient ID
    const resolvedPatientId = await this.resolvePatientDbId(dto.patientId);

    // 2. Validate Google Drive URL
    const driveValidation = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
    if (!driveValidation.isValid || !driveValidation.normalizedUrl) {
      throw new ValidationError(
        driveValidation.error || "Must be a valid HTTPS Google Drive URL"
      );
    }

    // 3. Validate Zod Schema
    const parseResult = createDiagnosticReportSchema.safeParse({
      ...dto,
      patientId: resolvedPatientId,
      driveUrl: driveValidation.normalizedUrl,
    });

    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.issues.map((i) => i.message).join(", ")
      );
    }

    // 4. Verify consultation if linked
    if (dto.consultationId) {
      const consultation = await this.consultationRepo.getConsultationById(dto.consultationId);
      if (!consultation) {
        throw new DataError(
          `Consultation with ID "${dto.consultationId}" does not exist`,
          "NOT_FOUND"
        );
      }
    }

    const insertPayload = {
      patient_id: resolvedPatientId,
      consultation_id: dto.consultationId || null,
      test_name: parseResult.data.testName,
      category: parseResult.data.category,
      test_date: parseResult.data.testDate,
      diagnostic_center: parseResult.data.diagnosticCenter,
      doctor_notes: parseResult.data.doctorNotes,
      drive_url: driveValidation.normalizedUrl,
    };

    const { data, error } = await this.client
      .from("diagnostic_reports")
      .insert(insertPayload)
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .single();

    if (error) {
      throw new DataError(`Failed to create diagnostic report: ${error.message}`, error.code);
    }

    return mapReportFromRow(data as Record<string, unknown>);
  }

  async updateReport(id: string, dto: UpdateDiagnosticReportDTO): Promise<DiagnosticReport> {
    const parseResult = updateDiagnosticReportSchema.safeParse(dto);
    if (!parseResult.success) {
      throw new ValidationError(
        parseResult.error.issues.map((i) => i.message).join(", ")
      );
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.testName !== undefined) updatePayload.test_name = parseResult.data.testName;
    if (dto.category !== undefined) updatePayload.category = parseResult.data.category;
    if (dto.testDate !== undefined) updatePayload.test_date = parseResult.data.testDate;
    if (dto.diagnosticCenter !== undefined)
      updatePayload.diagnostic_center = parseResult.data.diagnosticCenter;
    if (dto.doctorNotes !== undefined)
      updatePayload.doctor_notes = parseResult.data.doctorNotes;

    if (dto.driveUrl !== undefined) {
      const driveValidation = validateAndNormalizeGoogleDriveUrl(dto.driveUrl);
      if (!driveValidation.isValid || !driveValidation.normalizedUrl) {
        throw new ValidationError(
          driveValidation.error || "Must be a valid HTTPS Google Drive URL"
        );
      }
      updatePayload.drive_url = driveValidation.normalizedUrl;
    }

    if (dto.consultationId !== undefined) {
      if (dto.consultationId) {
        const consultation = await this.consultationRepo.getConsultationById(dto.consultationId);
        if (!consultation) {
          throw new DataError(
            `Consultation with ID "${dto.consultationId}" does not exist`,
            "NOT_FOUND"
          );
        }
      }
      updatePayload.consultation_id = dto.consultationId;
    }

    const { data, error } = await this.client
      .from("diagnostic_reports")
      .update(updatePayload)
      .eq("id", id)
      .select(
        `
        *,
        patients ( id, patient_id, name ),
        consultations ( id, consultation_date )
      `
      )
      .single();

    if (error) {
      throw new DataError(`Failed to update diagnostic report: ${error.message}`, error.code);
    }

    return mapReportFromRow(data as Record<string, unknown>);
  }

  async deleteReport(id: string): Promise<boolean> {
    const { error, count } = await this.client
      .from("diagnostic_reports")
      .delete({ count: "exact" })
      .eq("id", id);

    if (error) {
      throw new DataError(`Failed to delete diagnostic report: ${error.message}`, error.code);
    }

    return (count || 0) > 0;
  }
}
