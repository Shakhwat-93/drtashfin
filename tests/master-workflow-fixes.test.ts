import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import {
  getPatientRepository,
  getPrescriptionRepository,
  getFollowUpRepository,
  getDiagnosticReportRepository,
  getReportRepository,
} from "../src/lib/data";
import { createPatientSchema } from "../src/schemas/patient";
import { createDiagnosticReportSchema } from "../src/schemas/diagnostic-report";
import { calculateAgeFromDob } from "../src/lib/date-utils";

describe("Master Workflow Fixes — Verification Suite", () => {
  describe("Issue 1: New Patient Entry — Age without Date of Birth", () => {
    it("successfully creates a patient with Age only (no Date of Birth)", async () => {
      const repo = getPatientRepository();
      const patient = await repo.createPatient({
        name: "Age Only Patient",
        age: 45,
        gender: "male",
        chamberId: "chamber-dhaka",
      });

      assert.ok(patient.id, "Patient must have an ID");
      assert.strictEqual(patient.age, 45, "Age must be exactly 45");
      assert.strictEqual(patient.dateOfBirth, undefined, "dateOfBirth must be undefined");
    });

    it("successfully creates a patient with Date of Birth only (auto-calculates Age)", async () => {
      const repo = getPatientRepository();
      const patient = await repo.createPatient({
        name: "DOB Only Patient",
        dateOfBirth: "1995-06-15",
        gender: "female",
        chamberId: "chamber-dhaka",
      });

      const expectedAge = calculateAgeFromDob("1995-06-15");
      assert.ok(patient.id, "Patient must have an ID");
      assert.strictEqual(patient.dateOfBirth, "1995-06-15");
      assert.strictEqual(patient.age, expectedAge, "Age must match calculated age from DOB");
    });

    it("successfully creates a patient with both DOB and explicit Age override", async () => {
      const repo = getPatientRepository();
      const patient = await repo.createPatient({
        name: "Both DOB and Age Patient",
        dateOfBirth: "1990-01-01",
        age: 38,
        gender: "male",
        chamberId: "chamber-dhaka",
      });

      assert.strictEqual(patient.age, 38, "Clinician explicit age must be preserved");
      assert.strictEqual(patient.dateOfBirth, "1990-01-01");
    });

    it("rejects patient creation when NEITHER Date of Birth NOR Age is provided", () => {
      const result = createPatientSchema.safeParse({
        name: "No Age No DOB",
        gender: "male",
      });

      assert.strictEqual(result.success, false, "Validation should fail");
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message);
        assert.ok(
          messages.some((m) => m.includes("Either Date of Birth or Age")),
          "Should contain error requiring either DOB or Age"
        );
      }
    });

    it("verifies migration 016 removes NOT NULL constraint from date_of_birth and drive_url", () => {
      const migrationPath = path.resolve(
        process.cwd(),
        "supabase/migrations/016_patient_age_and_workflow_fixes.sql"
      );
      assert.ok(fs.existsSync(migrationPath), "Migration 016 must exist");
      const sql = fs.readFileSync(migrationPath, "utf-8");
      assert.ok(
        sql.includes("ALTER COLUMN date_of_birth DROP NOT NULL"),
        "Must alter patients date_of_birth DROP NOT NULL"
      );
      assert.ok(
        sql.includes("ALTER COLUMN drive_url DROP NOT NULL"),
        "Must alter diagnostic_reports drive_url DROP NOT NULL"
      );
    });
  });

  describe("Issue 2: Current Medicine & Prescription Integration & Navigation", () => {
    it("creates an active prescription linked to a patient and verifies it appears in repository", async () => {
      const patientRepo = getPatientRepository();
      const rxRepo = getPrescriptionRepository();

      const patient = await patientRepo.createPatient({
        name: "Medicine Test Patient",
        age: 30,
        gender: "male",
        chamberId: "chamber-dhaka",
      });

      const prescription = await rxRepo.createPrescription({
        patientId: patient.id,
        chamberId: "chamber-dhaka",
        prescriptionDate: new Date().toISOString().split("T")[0],
        status: "finalized",
        advice: "Take medicines after food",
        items: [
          {
            brandName: "Napa Extra",
            genericName: "Paracetamol + Caffeine",
            strength: "500mg+65mg",
            frequency: "1+0+1",
            duration: "5 days",
            orderIndex: 0,
          },
          {
            brandName: "Seclo",
            genericName: "Omeprazole",
            strength: "20mg",
            frequency: "1+0+1",
            duration: "14 days",
            orderIndex: 1,
          },
        ],
      });

      assert.ok(prescription.id, "Prescription must have an ID");
      assert.ok(prescription.prescriptionCode.startsWith("RX-"), "Prescription must have code RX-...");
      assert.strictEqual(prescription.items.length, 2, "Must contain 2 prescribed items");

      // Verify retrieval by patientId
      const patientPrescriptions = await rxRepo.getPrescriptionsByPatientId(patient.id);
      assert.ok(
        patientPrescriptions.some((p) => p.id === prescription.id),
        "Prescription must appear in patient prescriptions list"
      );

      // Verify retrieval by prescription ID and prescription code
      const byId = await rxRepo.getPrescriptionById(prescription.id);
      assert.ok(byId, "Must be retrievable by UUID id");
      const byCode = await rxRepo.getPrescriptionById(prescription.prescriptionCode);
      assert.ok(byCode, "Must be retrievable by prescriptionCode");
      assert.strictEqual(byId?.id, prescription.id);
      assert.strictEqual(byCode?.id, prescription.id);
    });

    it("verifies the standalone prescription page route exists to prevent 404", () => {
      const pagePath = path.resolve(
        process.cwd(),
        "src/app/prescriptions/[prescriptionId]/page.tsx"
      );
      assert.ok(
        fs.existsSync(pagePath),
        "src/app/prescriptions/[prescriptionId]/page.tsx must exist to prevent 404 on /prescriptions/[id]"
      );
    });

    it("verifies prescription report repository supports searching by patient name and code", async () => {
      const patientRepo = getPatientRepository();
      const rxRepo = getPrescriptionRepository();
      const reportRepo = getReportRepository();

      const patient = await patientRepo.createPatient({
        name: "Zubair Rahman UniqueName",
        age: 50,
        gender: "male",
        chamberId: "chamber-dhaka",
      });

      await rxRepo.createPrescription({
        patientId: patient.id,
        chamberId: "chamber-dhaka",
        prescriptionDate: new Date().toISOString().split("T")[0],
        status: "finalized",
        items: [
          {
            brandName: "Ace Plus",
            genericName: "Paracetamol",
            frequency: "1+0+1",
          },
        ],
      });

      const report = await reportRepo.getPrescriptionReport({
        searchQuery: "Zubair Rahman UniqueName",
      });

      assert.ok(
        report.data.some((r) => r.patientName.includes("Zubair Rahman UniqueName")),
        "Prescription report must find prescription by searching patient name"
      );
    });
  });

  describe("Issue 3: New Patient Entry — Follow-up Date Integration", () => {
    it("schedules a follow-up date and verifies it appears in follow-up repository and calendar", async () => {
      const patientRepo = getPatientRepository();
      const followUpRepo = getFollowUpRepository();

      const patient = await patientRepo.createPatient({
        name: "Followup Scheduled Patient",
        age: 28,
        gender: "female",
        chamberId: "chamber-dhaka",
      });

      const followUpDate = "2026-12-15";
      const followUp = await followUpRepo.createFollowUp({
        patientId: patient.id,
        patientCode: patient.patientId,
        chamberId: patient.chamberId,
        scheduledDate: followUpDate,
        reason: "Post-op plaster removal and X-ray check",
        priority: "routine",
      });

      assert.ok(followUp.id, "Follow-up record must be created");
      assert.strictEqual(followUp.scheduledDate, followUpDate);
      assert.strictEqual(followUp.reason, "Post-op plaster removal and X-ray check");

      // Verify retrieval by patient
      const patientFollowUps = await followUpRepo.getFollowUpsByPatient(patient.id);
      assert.ok(
        patientFollowUps.some((f) => f.id === followUp.id),
        "Follow-up must appear in patient's follow-up history"
      );

      // Verify retrieval by date range (calendar)
      const calendarFollowUps = await followUpRepo.getFollowUps({
        startDate: "2026-12-01",
        endDate: "2026-12-31",
        chamberId: "chamber-dhaka",
      });
      assert.ok(
        calendarFollowUps.some((f) => f.id === followUp.id),
        "Follow-up must appear in calendar query for that month and chamber"
      );
    });
  });

  describe("Issue 4: Patient Investigation & Report Integration", () => {
    it("allows creating diagnostic report with optional Google Drive URL (null or omitted)", async () => {
      const patientRepo = getPatientRepository();
      const diagRepo = getDiagnosticReportRepository();

      const patient = await patientRepo.createPatient({
        name: "Investigation Test Patient",
        age: 33,
        gender: "male",
        chamberId: "chamber-dhaka",
      });

      // Report without driveUrl (null)
      const report = await diagRepo.createReport({
        patientId: patient.id,
        testName: "X-Ray Right Knee AP/Lateral",
        category: "X-ray",
        testDate: "2026-11-01",
        diagnosticCenter: "Popular Diagnostic Center, Dhanmondi",
        doctorNotes: "No acute bony fracture. Joint space intact.",
        driveUrl: null,
      });

      assert.ok(report.id, "Diagnostic report must have an ID");
      assert.strictEqual(report.testName, "X-Ray Right Knee AP/Lateral");
      assert.strictEqual(report.category, "X-ray");
      assert.strictEqual(report.driveUrl, null, "driveUrl should be null when omitted");

      // Verify retrieval for patient
      const reports = await diagRepo.getReportsForPatient(patient.id);
      assert.ok(
        reports.some((r) => r.id === report.id),
        "Report must appear in patient's diagnostic reports list"
      );
    });

    it("allows creating diagnostic report with valid Google Drive URL", async () => {
      const patientRepo = getPatientRepository();
      const diagRepo = getDiagnosticReportRepository();

      const patient = await patientRepo.createPatient({
        name: "Investigation With Drive Patient",
        age: 40,
        gender: "female",
        chamberId: "chamber-dhaka",
      });

      const driveUrl = "https://drive.google.com/file/d/1abcXYZ_test12345/view";
      const report = await diagRepo.createReport({
        patientId: patient.id,
        testName: "MRI Lumbar Spine",
        category: "MRI",
        testDate: "2026-11-02",
        diagnosticCenter: "Ibn Sina Medical Imaging",
        driveUrl,
      });

      assert.ok(report.id, "Report must have an ID");
      assert.ok(report.driveUrl?.includes("1abcXYZ_test12345"), "Drive URL must be normalized and stored");
    });

    it("schema rejects invalid non-Drive URLs for diagnostic reports", () => {
      const invalidResult = createDiagnosticReportSchema.safeParse({
        patientId: "00000000-0000-0000-0000-000000000001",
        testName: "CBC",
        category: "Blood Test",
        testDate: "2026-11-01",
        driveUrl: "https://dropbox.com/somefile.pdf",
      });

      assert.strictEqual(invalidResult.success, false, "Should reject non-Google Drive links");
    });
  });
});
