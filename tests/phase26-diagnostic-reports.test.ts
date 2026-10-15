import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  validateAndNormalizeGoogleDriveUrl,
  maskGoogleDriveUrl,
} from "../src/lib/drive/drive-url-utils";
import {
  createDiagnosticReportSchema,
  updateDiagnosticReportSchema,
} from "../src/schemas/diagnostic-report";
import { MockDiagnosticReportRepository } from "../src/lib/data/repositories/mock-diagnostic-report-repository";
import { MockPatientRepository } from "../src/lib/data/repositories/mock-patient-repository";
import { MockConsultationRepository } from "../src/lib/data/repositories/mock-consultation-repository";
import { MockClinicalDocumentRepository } from "../src/lib/data/repositories/mock-clinical-document-repository";
import { MockStorage } from "../src/lib/data/mock/mock-storage";
import { setRepositoryProvider, resetRepositoryInstances } from "../src/lib/data";
import { DIAGNOSTIC_REPORT_CATEGORIES } from "../src/types/diagnostic-report";

describe("Phase 26 — Diagnostic Test Reports & Google Drive Link-Only Management", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
    MockStorage.clear();
  });

  describe("1. Google Drive URL Validation, Normalization & Security", () => {
    it("should accept and normalize standard Google Drive file URLs", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      const res = validateAndNormalizeGoogleDriveUrl(
        `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
      );
      assert.equal(res.isValid, true);
      assert.equal(res.resourceType, "file");
      assert.equal(res.resourceId, fileId);
      assert.equal(
        res.normalizedUrl,
        `https://drive.google.com/file/d/${fileId}/view`
      );
    });

    it("should accept and normalize Google Drive folder URLs", () => {
      const folderId = "1a2B3c4D5e6F7g8H9i0J_kLmNoPqRsTuV";
      const res = validateAndNormalizeGoogleDriveUrl(
        `https://drive.google.com/drive/folders/${folderId}?usp=drive_link`
      );
      assert.equal(res.isValid, true);
      assert.equal(res.resourceType, "folder");
      assert.equal(res.resourceId, folderId);
      assert.equal(
        res.normalizedUrl,
        `https://drive.google.com/drive/folders/${folderId}`
      );
    });

    it("should accept and normalize multi-account Google Drive folder URLs (/u/1/folders)", () => {
      const folderId = "1a2B3c4D5e6F7g8H9i0J_kLmNoPqRsTuV";
      const res = validateAndNormalizeGoogleDriveUrl(
        `https://drive.google.com/drive/u/1/folders/${folderId}`
      );
      assert.equal(res.isValid, true);
      assert.equal(res.resourceType, "folder");
      assert.equal(res.resourceId, folderId);
      assert.equal(
        res.normalizedUrl,
        `https://drive.google.com/drive/folders/${folderId}`
      );
    });

    it("should accept drive.google.com/open?id={fileId} and normalize to canonical view URL", () => {
      const fileId = "1AbCdEfGhIjKlMnOpQrStUvWxYz_123456789";
      const res = validateAndNormalizeGoogleDriveUrl(
        `https://drive.google.com/open?id=${fileId}`
      );
      assert.equal(res.isValid, true);
      assert.equal(res.resourceType, "file");
      assert.equal(res.resourceId, fileId);
      assert.equal(
        res.normalizedUrl,
        `https://drive.google.com/file/d/${fileId}/view`
      );
    });

    it("should accept Google Docs, Sheets, and Slides URLs on docs.google.com", () => {
      const docId = "1DocId1234567890abcdefghijklmnopqrstuvwxyz";
      const docRes = validateAndNormalizeGoogleDriveUrl(
        `https://docs.google.com/document/d/${docId}/edit`
      );
      assert.equal(docRes.isValid, true);
      assert.equal(docRes.resourceType, "document");

      const sheetId = "1SheetId1234567890abcdefghijklmnopqrstuvwx";
      const sheetRes = validateAndNormalizeGoogleDriveUrl(
        `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=0`
      );
      assert.equal(sheetRes.isValid, true);
      assert.equal(sheetRes.resourceType, "spreadsheet");
    });

    it("should strictly reject unencrypted HTTP links", () => {
      const res = validateAndNormalizeGoogleDriveUrl(
        "http://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view"
      );
      assert.equal(res.isValid, false);
      assert.match(res.error || "", /secure HTTPS/i);
    });

    it("should reject non-Google domains and phishing attempts", () => {
      assert.equal(
        validateAndNormalizeGoogleDriveUrl("https://dropbox.com/s/12345/report.pdf").isValid,
        false
      );
      assert.equal(
        validateAndNormalizeGoogleDriveUrl("https://onedrive.live.com/?id=12345").isValid,
        false
      );
      assert.equal(
        validateAndNormalizeGoogleDriveUrl("https://drive.google.com.malicious.com/file/d/12345/view").isValid,
        false
      );
      assert.equal(
        validateAndNormalizeGoogleDriveUrl("https://google.com/search?q=test").isValid,
        false
      );
    });

    it("should securely mask Google Drive URLs for privacy-preserving logs", () => {
      const fileId = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
      const masked = maskGoogleDriveUrl(
        `https://drive.google.com/file/d/${fileId}/view`
      );
      assert.ok(masked.startsWith("https://drive.google.com/file/d/1Bxi****"));
      assert.ok(masked.endsWith("/view"));
      assert.equal(masked.includes("MVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2"), false);
    });
  });

  describe("2. Schema Validation & Category Integrity", () => {
    it("should accept all 9 required clinical test categories", () => {
      assert.equal(DIAGNOSTIC_REPORT_CATEGORIES.length, 9);
      const expected = [
        "Blood Test",
        "Urine Test",
        "X-ray",
        "USG",
        "ECG",
        "CT Scan",
        "MRI",
        "Pathology",
        "Other",
      ];
      for (const cat of expected) {
        assert.ok(DIAGNOSTIC_REPORT_CATEGORIES.includes(cat as (typeof DIAGNOSTIC_REPORT_CATEGORIES)[number]));
      }
    });

    it("should validate and sanitize createDiagnosticReportSchema inputs", () => {
      const valid = createDiagnosticReportSchema.safeParse({
        patientId: "550e8400-e29b-41d4-a716-446655440000",
        testName: "  Echocardiogram (2D Echo)  ",
        category: "ECG",
        testDate: "2026-10-15",
        diagnosticCenter: "  National Heart Foundation  ",
        doctorNotes: "Normal EF 65%, mild aortic sclerosis.",
        driveUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_12345/view",
      });

      assert.equal(valid.success, true);
      if (valid.success) {
        assert.equal(valid.data.testName, "Echocardiogram (2D Echo)");
        assert.equal(valid.data.diagnosticCenter, "National Heart Foundation");
      }
    });

    it("should validate partial updates using updateDiagnosticReportSchema", () => {
      const valid = updateDiagnosticReportSchema.safeParse({
        testName: "Updated Lipid Panel",
        category: "Blood Test",
      });
      assert.equal(valid.success, true);
    });

    it("should reject invalid categories or malformed dates", () => {
      const invalidCat = createDiagnosticReportSchema.safeParse({
        patientId: "550e8400-e29b-41d4-a716-446655440000",
        testName: "Blood Test",
        category: "InvalidCategory" as unknown as (typeof DIAGNOSTIC_REPORT_CATEGORIES)[number],
        testDate: "2026-10-15",
        driveUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_12345/view",
      });
      assert.equal(invalidCat.success, false);

      const invalidDate = createDiagnosticReportSchema.safeParse({
        patientId: "550e8400-e29b-41d4-a716-446655440000",
        testName: "Blood Test",
        category: "Blood Test",
        testDate: "15/10/2026", // Not YYYY-MM-DD
        driveUrl: "https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz_12345/view",
      });
      assert.equal(invalidDate.success, false);
    });
  });

  describe("3. Repository CRUD Operations & Chronological Ordering", () => {
    it("should create diagnostic reports and retrieve them chronologically (newest test_date first)", async () => {
      const patientRepo = new MockPatientRepository();
      const patient = await patientRepo.createPatient({
        name: "Diagnostic Patient",
        dateOfBirth: "1985-05-15",
        gender: "female",
        phone: "01711223344",
      });

      const reportRepo = new MockDiagnosticReportRepository(patientRepo);

      // Create older report (2026-08-01)
      await reportRepo.createReport({
        patientId: patient.id,
        testName: "Lipid Profile",
        category: "Blood Test",
        testDate: "2026-08-01",
        diagnosticCenter: "Popular Diagnostic",
        driveUrl: "https://drive.google.com/file/d/1OlderReportFileId1234567890/view",
      });

      // Create newest report (2026-10-12)
      await reportRepo.createReport({
        patientId: patient.id,
        testName: "Chest X-Ray P/A View",
        category: "X-ray",
        testDate: "2026-10-12",
        diagnosticCenter: "Ibn Sina Hospital",
        driveUrl: "https://drive.google.com/file/d/1NewerReportFileId1234567890/view",
      });

      // Create middle report (2026-09-15)
      await reportRepo.createReport({
        patientId: patient.id,
        testName: "Ultrasonography of Whole Abdomen",
        category: "USG",
        testDate: "2026-09-15",
        diagnosticCenter: "Medinova",
        driveUrl: "https://drive.google.com/file/d/1MiddleReportFileId123456789/view",
      });

      const reports = await reportRepo.getReportsForPatient(patient.id);
      assert.equal(reports.length, 3);

      // Verify strict chronological order (newest testDate first)
      assert.equal(reports[0].testName, "Chest X-Ray P/A View");
      assert.equal(reports[0].testDate, "2026-10-12");

      assert.equal(reports[1].testName, "Ultrasonography of Whole Abdomen");
      assert.equal(reports[1].testDate, "2026-09-15");

      assert.equal(reports[2].testName, "Lipid Profile");
      assert.equal(reports[2].testDate, "2026-08-01");
    });

    it("should update diagnostic report metadata and Google Drive URL cleanly", async () => {
      const patientRepo = new MockPatientRepository();
      const patient = await patientRepo.createPatient({
        name: "Update Patient",
        dateOfBirth: "1990-01-01",
        gender: "male",
      });

      const reportRepo = new MockDiagnosticReportRepository(patientRepo);
      const created = await reportRepo.createReport({
        patientId: patient.id,
        testName: "Fasting Blood Sugar",
        category: "Blood Test",
        testDate: "2026-10-01",
        driveUrl: "https://drive.google.com/file/d/1InitialDriveUrlId123456789/view",
      });

      const updated = await reportRepo.updateReport(created.id, {
        testName: "Fasting Blood Sugar (FBS) & HbA1c",
        doctorNotes: "HbA1c 6.8% - pre-diabetic range.",
        driveUrl: "https://drive.google.com/file/d/1UpdatedDriveUrlId123456789/view",
      });

      assert.equal(updated.id, created.id);
      assert.equal(updated.testName, "Fasting Blood Sugar (FBS) & HbA1c");
      assert.equal(updated.doctorNotes, "HbA1c 6.8% - pre-diabetic range.");
      assert.equal(
        updated.driveUrl,
        "https://drive.google.com/file/d/1UpdatedDriveUrlId123456789/view"
      );
    });

    it("should delete report reference while keeping patient intact", async () => {
      const patientRepo = new MockPatientRepository();
      const patient = await patientRepo.createPatient({
        name: "Delete Patient",
        dateOfBirth: "1992-02-02",
        gender: "female",
      });

      const reportRepo = new MockDiagnosticReportRepository(patientRepo);
      const created = await reportRepo.createReport({
        patientId: patient.id,
        testName: "Urine Routine Examination",
        category: "Urine Test",
        testDate: "2026-10-05",
        driveUrl: "https://drive.google.com/file/d/1DeleteTestDriveUrl12345678/view",
      });

      const deleted = await reportRepo.deleteReport(created.id);
      assert.equal(deleted, true);

      const afterDelete = await reportRepo.getReportById(created.id);
      assert.equal(afterDelete, null);

      // Verify patient is completely preserved
      const preservedPatient = await patientRepo.getPatientById(patient.id);
      assert.ok(preservedPatient !== null);
      assert.equal(preservedPatient?.name, "Delete Patient");
    });
  });

  describe("4. Consultation Association & Standalone Support", () => {
    it("should allow linking a diagnostic report to an existing consultation", async () => {
      const patientRepo = new MockPatientRepository();
      const patient = await patientRepo.createPatient({
        name: "Consultation Patient",
        dateOfBirth: "1978-04-12",
        gender: "male",
      });

      const consultationRepo = new MockConsultationRepository(patientRepo);
      const consultation = await consultationRepo.createConsultation({
        patientId: patient.id,
        consultationDate: "2026-10-10",
        chiefComplaint: "Exertional chest heaviness",
        provisionalDiagnosis: "Stable Angina Pectoris",
      });

      const reportRepo = new MockDiagnosticReportRepository(patientRepo, consultationRepo);
      const linkedReport = await reportRepo.createReport({
        patientId: patient.id,
        consultationId: consultation.id,
        testName: "Exercise Tolerance Test (ETT)",
        category: "ECG",
        testDate: "2026-10-11",
        diagnosticCenter: "National Heart Foundation",
        doctorNotes: "Positive for inducible myocardial ischemia at 7 METs.",
        driveUrl: "https://drive.google.com/file/d/1EttReportFileId1234567890/view",
      });

      assert.equal(linkedReport.consultationId, consultation.id);

      // Retrieve reports specifically for this consultation
      const consultationReports = await reportRepo.getReportsForConsultation(consultation.id);
      assert.equal(consultationReports.length, 1);
      assert.equal(consultationReports[0].id, linkedReport.id);
      assert.equal(consultationReports[0].consultationDate, "2026-10-10");
    });

    it("should support standalone reports without any consultation link", async () => {
      const patientRepo = new MockPatientRepository();
      const patient = await patientRepo.createPatient({
        name: "Standalone Patient",
        dateOfBirth: "1995-12-25",
        gender: "female",
      });

      const reportRepo = new MockDiagnosticReportRepository(patientRepo);
      const standalone = await reportRepo.createReport({
        patientId: patient.id,
        consultationId: null,
        testName: "Serum Electrolytes",
        category: "Blood Test",
        testDate: "2026-10-14",
        driveUrl: "https://drive.google.com/file/d/1ElectrolytesFileId12345678/view",
      });

      assert.equal(standalone.consultationId, null);
      const patientReports = await reportRepo.getReportsForPatient(patient.id);
      assert.equal(patientReports.length, 1);
      assert.equal(patientReports[0].id, standalone.id);
    });
  });

  describe("5. Separation from Clinical Documents & Invariants Preservation", () => {
    it("should never duplicate or alter prescription PDF clinical_documents", async () => {
      const patientRepo = new MockPatientRepository();
      const patient = await patientRepo.createPatient({
        name: "Invariant Patient",
        dateOfBirth: "1980-01-01",
        gender: "male",
      });

      // Existing clinical document (prescription PDF archive in R2)
      const clinicalDocRepo = new MockClinicalDocumentRepository();
      const rxDoc = await clinicalDocRepo.createDocument({
        patientId: patient.id,
        title: "Prescription RX-000008",
        category: "prescription",
        r2Key: "prescriptions/PT-000013/RX-000008_v1.pdf",
        fileSizeBytes: 45000,
        contentHash: "hash1234567890abcdef",
        mimeType: "application/pdf",
      });

      // Add diagnostic report reference
      const reportRepo = new MockDiagnosticReportRepository(patientRepo);
      await reportRepo.createReport({
        patientId: patient.id,
        testName: "Brain MRI with Contrast",
        category: "MRI",
        testDate: "2026-10-14",
        driveUrl: "https://drive.google.com/drive/folders/1MriFolderId1234567890",
      });

      // Verify clinical_documents only contains the prescription PDF archive
      const docs = await clinicalDocRepo.getDocumentsByPatientId(patient.id);
      assert.equal(docs.length, 1);
      assert.equal(docs[0].id, rxDoc.id);
      assert.equal(docs[0].r2Key, "prescriptions/PT-000013/RX-000008_v1.pdf");

      // Verify diagnostic report is stored separately
      const reports = await reportRepo.getReportsForPatient(patient.id);
      assert.equal(reports.length, 1);
      assert.equal(reports[0].testName, "Brain MRI with Contrast");
      assert.equal(reports[0].category, "MRI");
    });
  });
});
