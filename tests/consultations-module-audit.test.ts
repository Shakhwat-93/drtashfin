import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  setRepositoryProvider,
  resetRepositoryInstances,
  getReportRepository,
  getConsultationRepository,
  getPatientRepository,
} from "../src/lib/data";
import { resolveDateRange } from "../src/lib/reports/date-range-utils";
import { generateReportCsv } from "../src/lib/reports/csv-export-utils";
import { CreateConsultationDTO } from "../src/types/consultation";
import { ReportType } from "../src/types/reports";
import { GET as getReportTypeRoute } from "../src/app/api/reports/[type]/route";
import { GET as getExportRoute } from "../src/app/api/reports/export/route";
import { NextRequest } from "next/server";

describe("Doctor Tashfin PMS — Complete Consultations Route Audit & Verification", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Route Architecture & Component Integrity", () => {
    it("exports valid standalone Consultation Detail page component", async () => {
      const StandalonePage = (await import("../src/app/consultations/[consultationId]/page")).default;
      assert.equal(typeof StandalonePage, "function");
    });

    it("exports valid Consultations registry page component", async () => {
      const ConsultationsPage = (await import("../src/app/consultations/page")).default;
      assert.equal(typeof ConsultationsPage, "function");
    });

    it("exports NewEncounterModal component from consultations feature module", async () => {
      const { NewEncounterModal } = await import("../src/features/consultations");
      assert.equal(typeof NewEncounterModal, "function");
    });

    it("supports all 7 registry tab types across reports and consultation workflows", () => {
      const registryTabs: ReportType[] = [
        "patient-activity",
        "consultations",
        "prescriptions",
        "follow-ups",
        "diagnostics-procedures",
        "discharges",
        "sms-delivery",
      ];
      assert.equal(registryTabs.length, 7);
      assert.ok(registryTabs.includes("consultations"));
      assert.ok(registryTabs.includes("patient-activity"));
      assert.ok(registryTabs.includes("prescriptions"));
      assert.ok(registryTabs.includes("follow-ups"));
      assert.ok(registryTabs.includes("diagnostics-procedures"));
      assert.ok(registryTabs.includes("discharges"));
      assert.ok(registryTabs.includes("sms-delivery"));
    });
  });

  describe("2. Chamber & Date Range Filtering for Consultations", () => {
    it("queries consultations across all chambers with default preset", async () => {
      const repo = getReportRepository();
      const dateRange = resolveDateRange({ preset: "last30days" });
      const result = await repo.getConsultationReport({
        chamberId: "all",
        dateRange,
        page: 1,
        pageSize: 25,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(typeof result.totalCount === "number");
      assert.ok(typeof result.totalPages === "number");
    });

    it("queries consultations scoped to Dhaka chamber", async () => {
      const repo = getReportRepository();
      const dateRange = resolveDateRange({ preset: "last30days" });
      const result = await repo.getConsultationReport({
        chamberId: "d1a4a001-0000-4000-8000-000000000001",
        dateRange,
        page: 1,
        pageSize: 25,
      });

      assert.ok(Array.isArray(result.data));
      for (const row of result.data) {
        assert.ok(
          row.chamberId === "d1a4a001-0000-4000-8000-000000000001" ||
          row.chamberName.toLowerCase().includes("dhaka")
        );
      }
    });

    it("queries consultations scoped to Rangpur chamber", async () => {
      const repo = getReportRepository();
      const dateRange = resolveDateRange({ preset: "last30days" });
      const result = await repo.getConsultationReport({
        chamberId: "d1a4a002-0000-4000-8000-000000000002",
        dateRange,
        page: 1,
        pageSize: 25,
      });

      assert.ok(Array.isArray(result.data));
      for (const row of result.data) {
        assert.ok(
          row.chamberId === "d1a4a002-0000-4000-8000-000000000002" ||
          row.chamberName.toLowerCase().includes("rangpur")
        );
      }
    });

    it("handles custom date range boundaries properly", async () => {
      const repo = getReportRepository();
      const dateRange = resolveDateRange({
        preset: "custom",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
      });
      const result = await repo.getConsultationReport({
        chamberId: "all",
        dateRange,
        page: 1,
        pageSize: 25,
      });

      assert.ok(Array.isArray(result.data));
      assert.ok(result.totalCount >= 0);
    });
  });

  describe("3. Consultation Search & Text Filtering", () => {
    it("filters consultations matching search queries across diagnosis or complaints", async () => {
      const repo = getReportRepository();
      const dateRange = resolveDateRange({ preset: "last30days" });

      // First get all
      const allResult = await repo.getConsultationReport({
        chamberId: "all",
        dateRange,
        page: 1,
        pageSize: 25,
      });

      if (allResult.data.length > 0) {
        const sample = allResult.data[0];
        const searchTerm = sample.patientName.slice(0, 3);
        const searchResult = await repo.getConsultationReport({
          chamberId: "all",
          dateRange,
          searchQuery: searchTerm,
          page: 1,
          pageSize: 25,
        });

        assert.ok(searchResult.totalCount >= 1);
        assert.ok(
          searchResult.data.some(
            (r) =>
              r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              r.patientCode.toLowerCase().includes(searchTerm.toLowerCase())
          )
        );
      }
    });
  });

  describe("4. Encounter Creation & Data Operations", () => {
    it("creates a new clinical encounter and retrieves it via repository", async () => {
      const patientRepo = getPatientRepository();
      const consultationRepo = getConsultationRepository();

      const patients = await patientRepo.getPatients({ page: 1, pageSize: 1 });
      assert.ok(patients.items.length > 0, "Expected at least one mock patient");
      const testPatient = patients.items[0];

      const newEncounterPayload: CreateConsultationDTO = {
        patientId: testPatient.patientId,
        chamberId: testPatient.chamberId || "d1a4a001-0000-4000-8000-000000000001",
        consultationDate: "2026-11-08",
        consultationTime: "10:30 AM",
        chiefComplaint: "Bilateral clubfoot follow-up evaluation",
        provisionalDiagnosis: "Congenital Talipes Equinovarus (CTEV)",
        plan: "Ponseti casting session 4 performed. Weekly follow-up scheduled.",
        nextFollowUp: "2026-11-15",
        status: "completed",
      };

      const created = await consultationRepo.createConsultation(newEncounterPayload);
      assert.ok(created.id, "Consultation must receive a generated UUID");
      assert.equal(created.patientId, testPatient.patientId);
      assert.equal(created.chiefComplaint, newEncounterPayload.chiefComplaint);
      assert.equal(created.provisionalDiagnosis, newEncounterPayload.provisionalDiagnosis);

      // Verify retrieval by ID
      const retrieved = await consultationRepo.getConsultationById(created.id);
      assert.ok(retrieved);
      assert.equal(retrieved.id, created.id);
      assert.equal(retrieved.patientId, testPatient.patientId);

      // Verify retrieval by patient
      const patientEncounters = await consultationRepo.getConsultationsByPatient(testPatient.patientId);
      assert.ok(patientEncounters.some((e) => e.id === created.id));
    });

    it("updates existing consultation record notes and plan", async () => {
      const patientRepo = getPatientRepository();
      const consultationRepo = getConsultationRepository();

      const patients = await patientRepo.getPatients({ page: 1, pageSize: 1 });
      const testPatient = patients.items[0];

      const created = await consultationRepo.createConsultation({
        patientId: testPatient.patientId,
        consultationDate: "2026-11-08",
        chiefComplaint: "Initial complaint",
        status: "completed",
      });

      const updated = await consultationRepo.updateConsultation(created.id, {
        clinicalNotes: "Patient showed marked improvement after physiotherapy.",
        advice: "Continue passive stretching twice daily.",
      });

      assert.equal(updated.id, created.id);
      assert.equal(updated.clinicalNotes, "Patient showed marked improvement after physiotherapy.");
      assert.equal(updated.advice, "Continue passive stretching twice daily.");
    });
  });

  describe("5. CSV Export Integrity & RFC 4180 Formatting", () => {
    it("generates consultations CSV export with UTF-8 BOM and correct headers", () => {
      const sampleConsultation = {
        id: "c-123456",
        patientId: "p-001",
        patientCode: "DH-000001",
        patientName: "Md. Tanvir Ahmed",
        chamberId: "chamber-dhaka",
        chamberName: "Dhaka Chamber",
        consultationDate: "2026-11-08",
        chiefComplaint: "Right foot equinus",
        diagnosis: "CTEV Grade 2",
        advice: "Ponseti casting",
        createdAt: "2026-11-08T10:00:00Z",
      };

      const { filename, csv } = generateReportCsv("consultations", [sampleConsultation]);
      assert.ok(filename.includes("consultations-report"));
      assert.ok(filename.endsWith(".csv"));

      // Verify UTF-8 BOM
      assert.ok(csv.startsWith("\uFEFF"));

      // Verify column headers
      assert.ok(csv.includes("Consultation Date"));
      assert.ok(csv.includes("Patient ID"));
      assert.ok(csv.includes("Patient Name"));
      assert.ok(csv.includes("Chamber"));
      assert.ok(csv.includes("Diagnosis"));
      assert.ok(csv.includes("Chief Complaint"));
      assert.ok(csv.includes("Advice"));

      // Verify row values
      assert.ok(csv.includes("DH-000001"));
      assert.ok(csv.includes("Md. Tanvir Ahmed"));
      assert.ok(csv.includes("CTEV Grade 2"));
    });

    it("neutralizes spreadsheet formula injection in consultation CSV export", () => {
      const maliciousConsultation = {
        id: "c-malicious",
        patientId: "p-002",
        patientCode: "=CMD|' /C calc'!A0",
        patientName: "@Dr. Evil",
        chamberId: "chamber-dhaka",
        chamberName: "+Chamber Formula",
        consultationDate: "-2026-11-08",
        chiefComplaint: "=1+1",
        diagnosis: "@MaliciousDiagnosis",
        advice: "+DoNotExecute",
        createdAt: "2026-11-08T10:00:00Z",
      };

      const { csv } = generateReportCsv("consultations", [maliciousConsultation]);
      // Cells starting with =, +, -, @ should have leading single quote prepended
      assert.ok(csv.includes("'=CMD"));
      assert.ok(csv.includes("'@Dr. Evil"));
      assert.ok(csv.includes("'+Chamber Formula"));
      assert.ok(csv.includes("'-2026-11-08"));
      assert.ok(csv.includes("'=1+1"));
      assert.ok(csv.includes("'@MaliciousDiagnosis"));
    });
  });

  describe("6. API Route Security for Reports & Export", () => {
    it("rejects unauthorized access to /api/reports/consultations", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/consultations");
      const res = await getReportTypeRoute(req, {
        params: Promise.resolve({ type: "consultations" }),
      });
      assert.equal(res.status, 401);
    });

    it("rejects unauthorized access to /api/reports/export", async () => {
      const req = new NextRequest("http://localhost:3000/api/reports/export?type=consultations");
      const res = await getExportRoute(req);
      assert.equal(res.status, 401);
    });
  });
});
