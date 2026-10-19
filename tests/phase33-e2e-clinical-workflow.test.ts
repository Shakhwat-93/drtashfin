import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateAgeFromDob, getClinicToday } from "@/lib/date-utils";
import { MockPatientRepository } from "@/lib/data/repositories/mock-patient-repository";
import { MockConsultationRepository } from "@/lib/data/repositories/mock-consultation-repository";
import { MockPrescriptionRepository } from "@/lib/data/repositories/mock-prescription-repository";
import { MockDiagnosticReportRepository } from "@/lib/data/repositories/mock-diagnostic-report-repository";
import { MockReportRepository } from "@/lib/data/repositories/mock-report-repository";
import { validateAndNormalizeGoogleDriveUrl } from "@/lib/drive/drive-url-utils";
import { generatePrescriptionPdf } from "@/lib/pdf/prescription-pdf-generator";
import { OFFICIAL_DOCTOR_PROFILE } from "@/config/doctor-profile";
import { verifyDoctorSession, inspectJwtClaims } from "@/lib/auth/session";
import { NextRequest } from "next/server";
import { createConsultationSchema } from "@/schemas/consultation";

describe("Phase 33: End-to-End Clinical Acceptance & Doctor Workflow Run-Through", () => {
  let patientRepo: MockPatientRepository;
  let consultationRepo: MockConsultationRepository;
  let prescriptionRepo: MockPrescriptionRepository;
  let diagRepo: MockDiagnosticReportRepository;
  let reportRepo: MockReportRepository;

  beforeEach(() => {
    patientRepo = new MockPatientRepository();
    consultationRepo = new MockConsultationRepository(patientRepo);
    prescriptionRepo = new MockPrescriptionRepository();
    diagRepo = new MockDiagnosticReportRepository(patientRepo);
    reportRepo = new MockReportRepository();
  });

  describe("1. Patient Registration & Dynamic DOB-to-Age Recalculation", () => {
    it("dynamically calculates age upon entering and changing date of birth", () => {
      const today = getClinicToday();
      const [year, month, day] = today.split("-").map(Number);

      // Initial DOB: exactly 10 years ago today
      const dob10 = `${year - 10}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const calculatedAge10 = calculateAgeFromDob(dob10, today);
      assert.equal(calculatedAge10, 10);

      // Changed DOB: exactly 25 years ago
      const dob25 = `${year - 25}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const calculatedAge25 = calculateAgeFromDob(dob25, today);
      assert.equal(calculatedAge25, 25);

      // Changed DOB: infant born today
      assert.equal(calculateAgeFromDob(today, today), 0);
    });

    it("saves and retrieves a new patient in isolated test repository", async () => {
      const patient = await patientRepo.createPatient({
        name: "Test Child Patient",
        dateOfBirth: "2018-06-15",
        age: calculateAgeFromDob("2018-06-15") || 8,
        gender: "male",
        phone: "+8801700112233",
        chamberId: "chamber-dhaka-01",
        address: "Dhanmondi, Dhaka",
        bloodGroup: "O+",
      });

      assert.ok(patient.id, "Expected patient to have generated UUID");
      assert.ok(patient.patientId, "Expected patient to have sequential patientId code");

      // Retrieve by internal UUID
      const byId = await patientRepo.getPatientById(patient.id);
      assert.ok(byId);
      assert.equal(byId?.name, "Test Child Patient");

      // Retrieve by human-readable identifier
      const byIdentifier = await patientRepo.getPatientByIdentifier(patient.patientId);
      assert.ok(byIdentifier);
      assert.equal(byIdentifier?.id, patient.id);
      assert.equal(byIdentifier?.gender, "male");
    });
  });

  describe("2. Consultation Recording & Drug History Clinical Mapping", () => {
    it("creates consultation with full clinical fields including drugHistory and clinicalExamination", async () => {
      const patient = await patientRepo.createPatient({
        name: "Orthopaedic Case Patient",
        dateOfBirth: "2016-03-20",
        age: 10,
        gender: "female",
        chamberId: "d1a4a002-0000-4000-8000-000000000002",
      });

      const consultation = await consultationRepo.createConsultation({
        patientId: patient.patientId,
        chamberId: "d1a4a002-0000-4000-8000-000000000002",
        consultationDate: "2026-10-19",
        consultationTime: "11:30 AM",
        chiefComplaint: "Pain and stiffness in right elbow following fall",
        birthHistory: "Full term normal delivery, cried immediately after birth",
        familyHistory: "No hereditary skeletal disorders",
        consanguinity: "no",
        drugHistory: "Paracetamol syrup 120mg/5ml taken irregularly for 3 days",
        clinicalExamination: "Tenderness over lateral epicondyle, restricted pronation/supination",
        clinicalNotes: "Neurovascular status intact distally",
        investigationAdvised: "X-ray right elbow AP & Lateral views",
        provisionalDiagnosis: "Supracondylar fracture right humerus (Gartland Type I)",
        plan: "Posterior long arm slab immobilisation, check X-ray in 1 week",
        advice: "Keep limb elevated, observe fingers for swelling or discoloration",
        status: "completed",
      });

      assert.ok(consultation.id);
      assert.equal(consultation.drugHistory, "Paracetamol syrup 120mg/5ml taken irregularly for 3 days");
      assert.equal(
        consultation.clinicalExamination,
        "Tenderness over lateral epicondyle, restricted pronation/supination"
      );
      assert.equal(consultation.consanguinity, "no");

      // Retrieve from repository
      const retrieved = await consultationRepo.getConsultationById(consultation.id);
      assert.ok(retrieved);
      assert.equal(retrieved?.drugHistory, consultation.drugHistory);
      assert.equal(retrieved?.provisionalDiagnosis, "Supracondylar fracture right humerus (Gartland Type I)");
    });

    it("rejects invalid consultation data according to schema validation", () => {
      const invalidPayload = {
        patientId: "", // Empty patientId rejected
        consultationDate: "not-a-valid-date",
      };

      const result = createConsultationSchema.safeParse(invalidPayload);
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.length > 0);
      }
    });
  });

  describe("3. Prescription Generation & Doctor Credential Integrity", () => {
    it("creates prescription with medication items and verifies official doctor credentials in PDF", async () => {
      const patient = await patientRepo.createPatient({
        name: "Prescription Child",
        dateOfBirth: "2020-01-10",
        age: 6,
        gender: "male",
        weight: 20,
      });

      const prescription = await prescriptionRepo.createPrescription({
        patientId: patient.patientId,
        doctorId: "dr-tashfin",
        prescriptionDate: "2026-10-19",
        advice: "Take medications with food. Return if pain increases.",
        followUpDate: "2026-10-26",
        followUpInstructions: "Review with fresh X-ray report",
        items: [
          {
            brandName: "Napa Syrup",
            genericName: "Paracetamol",
            strength: "120mg/5ml",
            dose: "5 ml",
            frequency: "1+1+1",
            route: "Oral",
            duration: "5 days",
            timingInstructions: "After meals",
          },
          {
            brandName: "Calbo D",
            genericName: "Calcium + Vitamin D3",
            strength: "500mg+200IU",
            dose: "1/2 tablet",
            frequency: "0+0+1",
            route: "Oral",
            duration: "30 days",
            timingInstructions: "Night after meal",
          },
        ],
      });

      assert.ok(prescription.id);
      assert.equal(prescription.items.length, 2);

      // Generate official PDF buffer
      const pdfBuffer = await generatePrescriptionPdf({
        prescription,
        patient,
        version: 1,
      });

      assert.ok(pdfBuffer instanceof Buffer);
      assert.ok(pdfBuffer.length > 1000);

      const pdfString = pdfBuffer.toString("latin1");
      // Verify valid PDF header and doctor info in PDF
      assert.ok(pdfString.startsWith("%PDF-"));
      assert.ok(pdfString.includes(OFFICIAL_DOCTOR_PROFILE.fullName));
    });
  });

  describe("4. Diagnostic Document Linking & Link-Only Integrity", () => {
    it("validates legitimate Google Drive and Google Docs links", () => {
      const fileUrl = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing";
      const validFile = validateAndNormalizeGoogleDriveUrl(fileUrl);
      assert.equal(validFile.isValid, true);
      assert.equal(validFile.resourceType, "file");
      assert.ok(validFile.normalizedUrl?.startsWith("https://drive.google.com/file/d/"));

      const folderUrl = "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ123456";
      const validFolder = validateAndNormalizeGoogleDriveUrl(folderUrl);
      assert.equal(validFolder.isValid, true);
      assert.equal(validFolder.resourceType, "folder");
    });

    it("strictly rejects non-Google domains, insecure HTTP, and malformed links", () => {
      assert.equal(validateAndNormalizeGoogleDriveUrl("http://drive.google.com/file/d/1234567890/view").isValid, false);
      assert.equal(validateAndNormalizeGoogleDriveUrl("https://dropbox.com/s/1234567890/report.pdf").isValid, false);
      assert.equal(validateAndNormalizeGoogleDriveUrl("https://malicious-site.com/drive.google.com").isValid, false);
      assert.equal(validateAndNormalizeGoogleDriveUrl("javascript:alert(1)").isValid, false);
      assert.equal(validateAndNormalizeGoogleDriveUrl("").isValid, false);
    });

    it("saves diagnostic report as link-only reference without uploading file content", async () => {
      const patient = await patientRepo.createPatient({
        name: "Diagnostic Case Patient",
        dateOfBirth: "2015-08-12",
        age: 11,
        gender: "female",
      });

      const driveUrl = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view";
      const report = await diagRepo.createReport({
        patientId: patient.patientId,
        testName: "Right Elbow X-ray AP/Lat",
        category: "X-ray",
        testDate: "2026-10-19",
        diagnosticCenter: "Popular Diagnostic Centre, Rangpur",
        doctorNotes: "Cortical buckle noted at distal humeral metaphysis",
        driveUrl,
      });

      assert.ok(report.id);
      assert.equal(report.driveUrl, driveUrl);

      // Verify retrieved report retains link
      const reports = await diagRepo.getReportsForPatient(patient.patientId);
      assert.equal(reports.length, 1);
      assert.equal(reports[0].driveUrl, driveUrl);
    });
  });

  describe("5. Clinical Dashboard & Multi-Chamber Isolation", () => {
    it("filters dashboard data by chamber without cross-chamber data leaks", async () => {
      // Query Dhaka Chamber
      const dhakaData = await reportRepo.getClinicalDashboard({
        chamberId: "d1a4a001-0000-4000-8000-000000000001",
        preset: "last30days",
      });
      assert.ok(dhakaData.lifetime);
      assert.ok(dhakaData.range);
      assert.equal(dhakaData.chamberLabel, "Dhaka Chamber");

      // Query Rangpur Chamber
      const rangpurData = await reportRepo.getClinicalDashboard({
        chamberId: "d1a4a002-0000-4000-8000-000000000002",
        preset: "last30days",
      });
      assert.ok(rangpurData.lifetime);
      assert.ok(rangpurData.range);
      assert.equal(rangpurData.chamberLabel, "Rangpur Chamber");

      // Query All Chambers
      const allData = await reportRepo.getClinicalDashboard({
        chamberId: "all",
        preset: "last30days",
      });
      assert.ok(allData.lifetime);
      assert.ok(allData.range);
      assert.equal(allData.chamberLabel, "All Chambers");

      // Total count across all chambers must be >= individual chamber counts
      assert.ok(allData.lifetime.totalPatients >= dhakaData.lifetime.totalPatients);
      assert.ok(allData.lifetime.totalPatients >= rangpurData.lifetime.totalPatients);
    });
  });

  describe("6. Route Availability & Security Guards", () => {
    const clinicalRoutes = [
      "consultations",
      "investigations",
      "prescriptions",
      "documents",
      "operations",
      "audit-logs",
      "profile",
      "settings",
    ];

    clinicalRoutes.forEach((route) => {
      it(`confirms route page exists for /${route}`, () => {
        const filePath = path.join(process.cwd(), `src/app/${route}/page.tsx`);
        assert.ok(fs.existsSync(filePath), `Route missing at ${filePath}`);
        const content = fs.readFileSync(filePath, "utf8");
        assert.ok(content.includes("export default"), `Route /${route} missing export default`);
      });
    });

    it("rejects unauthenticated requests without doctor token", async () => {
      const unauthReq = new NextRequest("http://localhost:3000/api/reports/dashboard");
      const sessionResult = await verifyDoctorSession(unauthReq);
      assert.equal(sessionResult.authenticated, false);
      if (!sessionResult.authenticated) {
        assert.equal(sessionResult.status, 401);
      }
    });

    it("verifies JWT structural check rejects malformed or unverified tokens", () => {
      assert.equal(inspectJwtClaims("invalid.token").valid, false);
      assert.equal(inspectJwtClaims("").valid, false);
      assert.equal(inspectJwtClaims(null).valid, false);
    });
  });
});
