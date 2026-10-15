import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  validateAndNormalizeGoogleDriveUrl,
} from "../src/lib/drive/drive-url-utils";
import {
  createProcedureSchema,
} from "../src/schemas/procedure";
import { MockProcedureRepository } from "../src/lib/data/repositories/mock-procedure-repository";
import { MockPatientRepository } from "../src/lib/data/repositories/mock-patient-repository";
import { MockConsultationRepository } from "../src/lib/data/repositories/mock-consultation-repository";
import { MockPrescriptionRepository } from "../src/lib/data/repositories/mock-prescription-repository";
import { MockStorage } from "../src/lib/data/mock/mock-storage";
import {
  setRepositoryProvider,
  resetRepositoryInstances,
} from "../src/lib/data";
import { PROCEDURE_CATEGORIES, ProcedureCategory } from "../src/types/procedure";

describe("Phase 27 — Patient Operation & Procedure History Management", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
    MockStorage.clear();
  });

  describe("1. Procedure Categories & Domain Schema Validation", () => {
    it("should recognize all 5 designated procedure categories", () => {
      assert.deepEqual(PROCEDURE_CATEGORIES, [
        "Surgery",
        "Minor Procedure",
        "Diagnostic Procedure",
        "Therapeutic Procedure",
        "Other",
      ]);
    });

    it("should accept valid procedure payload with all fields", () => {
      const validPayload = {
        patientId: "patient-uuid-1",
        consultationId: "consult-uuid-1",
        procedureName: "Laparoscopic Cholecystectomy",
        category: "Surgery" as ProcedureCategory,
        procedureDate: "2026-10-14",
        hospitalFacility: "Dhaka Community Hospital",
        performingDoctor: "Prof. Dr. Tashfin",
        clinicalIndication: "Symptomatic cholelithiasis",
        doctorNotes: "Four-port technique, uneventful dissection of Calot triangle",
        outcome: "Successful complete excision",
        complications: "None",
        recoveryNotes: "Oral fluids tolerated, discharged on POD 1",
        driveUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
      };

      const result = createProcedureSchema.safeParse(validPayload);
      assert.equal(result.success, true);
    });

    it("should accept valid minimal payload with optional fields omitted", () => {
      const minimalPayload = {
        patientId: "patient-uuid-1",
        procedureName: "Skin Biopsy",
        category: "Minor Procedure" as ProcedureCategory,
        procedureDate: "2026-10-12",
      };

      const result = createProcedureSchema.safeParse(minimalPayload);
      assert.equal(result.success, true);
    });

    it("should reject invalid category strings", () => {
      const invalidPayload = {
        patientId: "patient-uuid-1",
        procedureName: "Invalid Procedure",
        category: "Major Operation", // Not in categories
        procedureDate: "2026-10-12",
      };

      const result = createProcedureSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
    });

    it("should reject empty procedure name or invalid date format", () => {
      const emptyNamePayload = {
        patientId: "patient-uuid-1",
        procedureName: "",
        category: "Surgery" as ProcedureCategory,
        procedureDate: "2026-10-12",
      };
      assert.equal(createProcedureSchema.safeParse(emptyNamePayload).success, false);

      const invalidDatePayload = {
        patientId: "patient-uuid-1",
        procedureName: "Appendectomy",
        category: "Surgery" as ProcedureCategory,
        procedureDate: "12-10-2026", // Not YYYY-MM-DD
      };
      assert.equal(createProcedureSchema.safeParse(invalidDatePayload).success, false);
    });
  });

  describe("2. Google Drive Link-Only Optional Validation", () => {
    it("should accept empty, null, or undefined driveUrl", () => {
      const nullDrive = {
        patientId: "patient-uuid-1",
        procedureName: "Incision & Drainage",
        category: "Minor Procedure" as ProcedureCategory,
        procedureDate: "2026-10-10",
        driveUrl: null,
      };
      assert.equal(createProcedureSchema.safeParse(nullDrive).success, true);

      const emptyDrive = {
        patientId: "patient-uuid-1",
        procedureName: "Incision & Drainage",
        category: "Minor Procedure" as ProcedureCategory,
        procedureDate: "2026-10-10",
        driveUrl: "",
      };
      assert.equal(createProcedureSchema.safeParse(emptyDrive).success, true);
    });

    it("should accept valid HTTPS Google Drive URL and normalize it", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      const validDrive = {
        patientId: "patient-uuid-1",
        procedureName: "Exploratory Laparotomy",
        category: "Surgery" as ProcedureCategory,
        procedureDate: "2026-10-11",
        driveUrl: `https://drive.google.com/file/d/${fileId}/view?usp=sharing`,
      };
      const res = createProcedureSchema.safeParse(validDrive);
      assert.equal(res.success, true);

      const normalized = validateAndNormalizeGoogleDriveUrl(validDrive.driveUrl);
      assert.equal(normalized.isValid, true);
      assert.equal(normalized.normalizedUrl, `https://drive.google.com/file/d/${fileId}/view`);
    });

    it("should strictly reject non-Google Drive or insecure HTTP URLs", () => {
      const insecureHttp = {
        patientId: "patient-uuid-1",
        procedureName: "Biopsy",
        category: "Diagnostic Procedure" as ProcedureCategory,
        procedureDate: "2026-10-11",
        driveUrl: "http://drive.google.com/file/d/123/view",
      };
      assert.equal(createProcedureSchema.safeParse(insecureHttp).success, false);

      const phishingLink = {
        patientId: "patient-uuid-1",
        procedureName: "Biopsy",
        category: "Diagnostic Procedure" as ProcedureCategory,
        procedureDate: "2026-10-11",
        driveUrl: "https://evil-phishing-site.com/file/123",
      };
      assert.equal(createProcedureSchema.safeParse(phishingLink).success, false);
    });
  });

  describe("3. Procedure Repository CRUD & Chronological Timeline", () => {
    it("should record a new surgical procedure for an existing patient", async () => {
      const patientRepo = new MockPatientRepository();
      const consultRepo = new MockConsultationRepository();
      const procRepo = new MockProcedureRepository(patientRepo, consultRepo);

      // Create test patient
      const patient = await patientRepo.createPatient({
        name: "Rahim Chowdhury",
        gender: "male",
        dateOfBirth: "1985-05-10",
        phone: "+8801711223344",
      });

      const procedure = await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Inguinal Hernia Repair (Lichtenstein)",
        category: "Surgery",
        procedureDate: "2026-10-14",
        hospitalFacility: "Popular Medical College Hospital",
        performingDoctor: "Prof. Dr. Tashfin",
        clinicalIndication: "Right reducible indirect inguinal hernia",
        doctorNotes: "Prolene mesh placed and secured, haemostasis achieved",
        outcome: "Uneventful successful repair",
        complications: "None",
        recoveryNotes: "Follow-up for stitch removal in 8 days",
        driveUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
      });

      assert.ok(procedure.id);
      assert.equal(procedure.patientId, patient.id);
      assert.equal(procedure.patientName, "Rahim Chowdhury");
      assert.equal(procedure.category, "Surgery");
      assert.equal(procedure.procedureName, "Inguinal Hernia Repair (Lichtenstein)");
      assert.equal(
        procedure.driveUrl,
        "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view"
      );
    });

    it("should sort procedures chronologically with newest procedureDate first", async () => {
      const patientRepo = new MockPatientRepository();
      const consultRepo = new MockConsultationRepository();
      const procRepo = new MockProcedureRepository(patientRepo, consultRepo);

      const patient = await patientRepo.createPatient({
        name: "Karim Ullah",
        gender: "male",
        dateOfBirth: "1990-01-01",
        phone: "+8801811223344",
      });

      // Insert older procedure first
      await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Colonoscopy",
        category: "Diagnostic Procedure",
        procedureDate: "2025-06-15",
      });

      // Insert middle procedure
      await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Polypectomy",
        category: "Therapeutic Procedure",
        procedureDate: "2025-08-20",
      });

      // Insert newest procedure
      await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Laparoscopic Cholecystectomy",
        category: "Surgery",
        procedureDate: "2026-10-10",
      });

      const list = await procRepo.getProcedures({ patientId: patient.id });
      assert.equal(list.length, 3);
      assert.equal(list[0].procedureDate, "2026-10-10");
      assert.equal(list[0].procedureName, "Laparoscopic Cholecystectomy");
      assert.equal(list[1].procedureDate, "2025-08-20");
      assert.equal(list[1].procedureName, "Polypectomy");
      assert.equal(list[2].procedureDate, "2025-06-15");
      assert.equal(list[2].procedureName, "Colonoscopy");
    });

    it("should filter procedures by category and search query", async () => {
      const patientRepo = new MockPatientRepository();
      const consultRepo = new MockConsultationRepository();
      const procRepo = new MockProcedureRepository(patientRepo, consultRepo);

      const patient = await patientRepo.createPatient({
        name: "Salma Begum",
        gender: "female",
        dateOfBirth: "1992-03-15",
        phone: "+8801911223344",
      });

      await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Upper GI Endoscopy",
        category: "Diagnostic Procedure",
        procedureDate: "2026-05-10",
        hospitalFacility: "City Hospital",
      });

      await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Laparoscopic Appendectomy",
        category: "Surgery",
        procedureDate: "2026-09-01",
        hospitalFacility: "General Hospital",
      });

      // Category filter: Surgery only
      const surgeries = await procRepo.getProcedures({
        patientId: patient.id,
        category: "Surgery",
      });
      assert.equal(surgeries.length, 1);
      assert.equal(surgeries[0].procedureName, "Laparoscopic Appendectomy");

      // Search query filter: "endoscopy"
      const searched = await procRepo.getProcedures({
        patientId: patient.id,
        searchQuery: "endoscopy",
      });
      assert.equal(searched.length, 1);
      assert.equal(searched[0].procedureName, "Upper GI Endoscopy");
    });

    it("should update procedure details cleanly", async () => {
      const patientRepo = new MockPatientRepository();
      const consultRepo = new MockConsultationRepository();
      const procRepo = new MockProcedureRepository(patientRepo, consultRepo);

      const patient = await patientRepo.createPatient({
        name: "Nusrat Jahan",
        gender: "female",
        dateOfBirth: "1988-07-20",
        phone: "+8801611223344",
      });

      const initial = await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Excision Biopsy",
        category: "Minor Procedure",
        procedureDate: "2026-10-01",
        outcome: "Pending histopathology",
      });

      const updated = await procRepo.updateProcedure(initial.id, {
        outcome: "Benign lipoma confirmed by histopathology",
        complications: "None",
        recoveryNotes: "Wound completely healed",
      });

      assert.equal(updated.id, initial.id);
      assert.equal(updated.outcome, "Benign lipoma confirmed by histopathology");
      assert.equal(updated.recoveryNotes, "Wound completely healed");
      assert.equal(updated.procedureName, "Excision Biopsy"); // preserved
    });

    it("should delete procedure record without touching other entities", async () => {
      const patientRepo = new MockPatientRepository();
      const consultRepo = new MockConsultationRepository();
      const procRepo = new MockProcedureRepository(patientRepo, consultRepo);

      const patient = await patientRepo.createPatient({
        name: "Farhan Ahmed",
        gender: "male",
        dateOfBirth: "1995-11-25",
        phone: "+8801511223344",
      });

      const proc = await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Wound Debridement",
        category: "Minor Procedure",
        procedureDate: "2026-10-05",
      });

      const deleteResult = await procRepo.deleteProcedure(proc.id);
      assert.equal(deleteResult, true);

      const found = await procRepo.getProcedureById(proc.id);
      assert.equal(found, null);

      // Verify patient still exists
      const patientStillExists = await patientRepo.getPatientById(patient.id);
      assert.ok(patientStillExists);
    });

    it("should throw NOT_FOUND error when patient does not exist", async () => {
      const patientRepo = new MockPatientRepository();
      const consultRepo = new MockConsultationRepository();
      const procRepo = new MockProcedureRepository(patientRepo, consultRepo);

      await assert.rejects(
        async () => {
          await procRepo.createProcedure({
            patientId: "non-existent-patient-uuid",
            procedureName: "Surgery",
            category: "Surgery",
            procedureDate: "2026-10-01",
          });
        },
        {
          name: "DataError",
          code: "NOT_FOUND",
        }
      );
    });
  });

  describe("4. Prescriptions & Clinical Documents Isolation", () => {
    it("should guarantee that procedure operations do not affect prescriptions", async () => {
      const patientRepo = new MockPatientRepository();
      const consultRepo = new MockConsultationRepository();
      const rxRepo = new MockPrescriptionRepository();
      const procRepo = new MockProcedureRepository(patientRepo, consultRepo);

      const patient = await patientRepo.createPatient({
        name: "Shahidul Islam",
        gender: "male",
        dateOfBirth: "1978-04-12",
        phone: "+8801711998877",
      });

      const prescription = await rxRepo.createPrescription({
        patientId: patient.id,
        consultationId: undefined,
        advice: "Rest and hydration",
        notes: "Clinical note for patient",
        items: [],
      });

      // Record a procedure
      const proc = await procRepo.createProcedure({
        patientId: patient.id,
        procedureName: "Diagnostic Laparoscopy",
        category: "Diagnostic Procedure",
        procedureDate: "2026-10-13",
      });

      // Verify prescription is unchanged
      const rxAfter = await rxRepo.getPrescriptionById(prescription.id);
      assert.ok(rxAfter);
      assert.equal(rxAfter?.advice, "Rest and hydration");
      assert.equal(rxAfter?.notes, "Clinical note for patient");

      // Delete procedure
      await procRepo.deleteProcedure(proc.id);

      // Verify prescription is still untouched
      const rxFinal = await rxRepo.getPrescriptionById(prescription.id);
      assert.ok(rxFinal);
      assert.equal(rxFinal?.advice, "Rest and hydration");
    });
  });
});
