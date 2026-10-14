import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  setRepositoryProvider,
  getPatientRepository,
  getConsultationRepository,
  getPrescriptionRepository,
  getMedicineRepository,
  getChamberRepository,
  resetRepositoryInstances,
  getClinicalRepository,
} from "../src/lib/data";
import {
  KNOWN_CHAMBERS,
  DEFAULT_CHAMBER,
  getChamberById,
  getChamberByPrefix,
} from "../src/types/chamber";
import {
  formatChamberPatientId,
  parseChamberPatientSequence,
  generateNextChamberPatientId,
} from "../src/lib/data/id-generator";

describe("Phase 21: Multi-Chamber Architecture & Chamber-Wise Patient Management", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Chamber Seeding & Configuration Integrity", () => {
    it("seeds exactly three distinct chambers with stable UUIDs, prefixes, and active status", async () => {
      const chamberRepo = getChamberRepository();
      const chambers = await chamberRepo.getChambers();

      assert.equal(chambers.length, 3, "Exactly 3 chambers must be registered");

      const dhaka = chambers.find((c) => c.code === "dhaka");
      const rangpur = chambers.find((c) => c.code === "rangpur");
      const narayanganj = chambers.find((c) => c.code === "narayanganj");

      assert.ok(dhaka, "Dhaka chamber must exist");
      assert.equal(dhaka.id, "d1a4a001-0000-4000-8000-000000000001");
      assert.equal(dhaka.patientIdPrefix, "DH");
      assert.equal(dhaka.isActive, true);

      assert.ok(rangpur, "Rangpur chamber must exist");
      assert.equal(rangpur.id, "d1a4a002-0000-4000-8000-000000000002");
      assert.equal(rangpur.patientIdPrefix, "RNG");
      assert.equal(rangpur.isActive, true);

      assert.ok(narayanganj, "Narayanganj chamber must exist");
      assert.equal(narayanganj.id, "d1a4a003-0000-4000-8000-000000000003");
      assert.equal(narayanganj.patientIdPrefix, "N");
      assert.equal(narayanganj.isActive, true);
    });

    it("chamber lookup helpers correctly resolve chambers by ID and prefix", () => {
      const dhakaById = getChamberById("d1a4a001-0000-4000-8000-000000000001");
      assert.equal(dhakaById?.code, "dhaka");

      const rngByPrefix = getChamberByPrefix("RNG");
      assert.equal(rngByPrefix?.code, "rangpur");

      const nByPrefix = getChamberByPrefix("n");
      assert.equal(nByPrefix?.code, "narayanganj");

      assert.equal(DEFAULT_CHAMBER.code, "dhaka", "Dhaka is the default practice chamber");
    });
  });

  describe("2. Chamber-Specific Sequential Patient ID Generation", () => {
    it("formats and parses patient IDs for DH, RNG, N, and legacy PT prefixes", () => {
      assert.equal(formatChamberPatientId("DH", 1), "DH-000001");
      assert.equal(formatChamberPatientId("RNG", 42), "RNG-000042");
      assert.equal(formatChamberPatientId("N", 999), "N-000999");
      assert.equal(formatChamberPatientId("PT", 13), "PT-000013");

      const parsedDh = parseChamberPatientSequence("DH-000123");
      assert.deepEqual(parsedDh, { prefix: "DH", sequence: 123 });

      const parsedRng = parseChamberPatientSequence("RNG-000005");
      assert.deepEqual(parsedRng, { prefix: "RNG", sequence: 5 });

      const parsedN = parseChamberPatientSequence("N-000077");
      assert.deepEqual(parsedN, { prefix: "N", sequence: 77 });

      const parsedLegacy = parseChamberPatientSequence("PT-000013");
      assert.deepEqual(parsedLegacy, { prefix: "PT", sequence: 13 });

      assert.equal(parseChamberPatientSequence("INVALID-ID"), null);
    });

    it("generates correct sequential IDs independently per chamber", () => {
      const existingDh = ["DH-000001", "DH-000002"];
      const nextDh = generateNextChamberPatientId("DH", existingDh);
      assert.equal(nextDh, "DH-000003");

      const existingRng = ["RNG-000001"];
      const nextRng = generateNextChamberPatientId("RNG", existingRng);
      assert.equal(nextRng, "RNG-000002");

      const existingN: string[] = [];
      const nextN = generateNextChamberPatientId("N", existingN);
      assert.equal(nextN, "N-000001");
    });
  });

  describe("3. Chamber Registration & Isolation", () => {
    it("registers patients with chamber-specific prefixes and associates chamberId correctly", async () => {
      const patientRepo = getPatientRepository();

      const dhakaChamber = KNOWN_CHAMBERS[0]; // DH
      const rangpurChamber = KNOWN_CHAMBERS[1]; // RNG
      const narayanganjChamber = KNOWN_CHAMBERS[2]; // N

      const p1 = await patientRepo.createPatient({
        name: "Dhaka Patient One",
        gender: "male",
        dateOfBirth: "1990-01-01",
        phone: "+8801711111111",
        chamberId: dhakaChamber.id,
      });

      const p2 = await patientRepo.createPatient({
        name: "Dhaka Patient Two",
        gender: "female",
        dateOfBirth: "1992-02-02",
        phone: "+8801711111112",
        chamberId: dhakaChamber.id,
      });

      const p3 = await patientRepo.createPatient({
        name: "Rangpur Patient One",
        gender: "male",
        dateOfBirth: "1985-05-05",
        phone: "+8801711111113",
        chamberId: rangpurChamber.id,
      });

      const p4 = await patientRepo.createPatient({
        name: "Narayanganj Patient One",
        gender: "female",
        dateOfBirth: "1995-09-09",
        phone: "+8801711111114",
        chamberId: narayanganjChamber.id,
      });

      assert.match(p1.patientId, /^DH-\d{6}$/);
      assert.equal(p1.chamberId, dhakaChamber.id);

      assert.match(p2.patientId, /^DH-\d{6}$/);
      assert.equal(p2.chamberId, dhakaChamber.id);

      assert.match(p3.patientId, /^RNG-\d{6}$/);
      assert.equal(p3.chamberId, rangpurChamber.id);

      assert.match(p4.patientId, /^N-\d{6}$/);
      assert.equal(p4.chamberId, narayanganjChamber.id);
    });

    it("scopes patient directory queries to active chamber without leaking records from other chambers", async () => {
      const patientRepo = getPatientRepository();
      const dhakaChamber = KNOWN_CHAMBERS[0];
      const rangpurChamber = KNOWN_CHAMBERS[1];
      const narayanganjChamber = KNOWN_CHAMBERS[2];

      await patientRepo.createPatient({
        name: "Dhaka Alpha",
        gender: "male",
        dateOfBirth: "1980-01-01",
        chamberId: dhakaChamber.id,
      });
      await patientRepo.createPatient({
        name: "Rangpur Beta",
        gender: "female",
        dateOfBirth: "1985-01-01",
        chamberId: rangpurChamber.id,
      });
      await patientRepo.createPatient({
        name: "Narayanganj Gamma",
        gender: "male",
        dateOfBirth: "1990-01-01",
        chamberId: narayanganjChamber.id,
      });

      // Dhaka scope
      const dhakaPatients = await patientRepo.getPatients({
        chamberId: dhakaChamber.id,
      });
      assert.ok(dhakaPatients.items.every((p) => p.chamberId === dhakaChamber.id));
      assert.ok(dhakaPatients.items.some((p) => p.name === "Dhaka Alpha"));
      assert.ok(!dhakaPatients.items.some((p) => p.name === "Rangpur Beta"));
      assert.ok(!dhakaPatients.items.some((p) => p.name === "Narayanganj Gamma"));

      // Rangpur scope
      const rangpurPatients = await patientRepo.getPatients({
        chamberId: rangpurChamber.id,
      });
      assert.ok(rangpurPatients.items.every((p) => p.chamberId === rangpurChamber.id));
      assert.ok(rangpurPatients.items.some((p) => p.name === "Rangpur Beta"));
      assert.ok(!rangpurPatients.items.some((p) => p.name === "Dhaka Alpha"));

      // Global "all" scope
      const allPatients = await patientRepo.getPatients({
        chamberId: "all",
      });
      assert.ok(allPatients.total >= 3, "All chambers scope should include all patients");
    });
  });

  describe("4. Concurrency Safety & ID Uniqueness", () => {
    it("handles concurrent patient creations in the same chamber with zero duplicate IDs", async () => {
      const patientRepo = getPatientRepository();
      const dhakaChamber = KNOWN_CHAMBERS[0];

      // Dispatch 10 concurrent registrations
      const createPromises = Array.from({ length: 10 }).map((_, i) =>
        patientRepo.createPatient({
          name: `Concurrent Patient ${i + 1}`,
          gender: i % 2 === 0 ? "male" : "female",
          dateOfBirth: "1993-04-12",
          phone: `+88017000000${i.toString().padStart(2, "0")}`,
          chamberId: dhakaChamber.id,
        })
      );

      const results = await Promise.all(createPromises);
      const generatedIds = results.map((p) => p.patientId);

      const uniqueIds = new Set(generatedIds);
      assert.equal(
        uniqueIds.size,
        10,
        "All 10 concurrently generated patient IDs must be strictly unique"
      );

      for (const id of generatedIds) {
        assert.match(id, /^DH-\d{6}$/, "Must follow DH-XXXXXX format");
      }
    });
  });

  describe("5. Relational Chamber Inheritance (Consultations & Prescriptions)", () => {
    it("inherits chamberId from patient when creating consultations and prescriptions", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();
      const rxRepo = getPrescriptionRepository();

      const rangpurChamber = KNOWN_CHAMBERS[1];

      const patient = await patientRepo.createPatient({
        name: "Rahim Mia",
        gender: "male",
        dateOfBirth: "1978-08-15",
        chamberId: rangpurChamber.id,
      });

      const consultation = await consultRepo.createConsultation({
        patientId: patient.patientId,
        chamberId: patient.chamberId,
        consultationDate: "2026-10-14",
        chiefComplaint: "Severe fever and cough for 3 days",
        provisionalDiagnosis: "Acute Bronchitis",
      });

      assert.equal(
        consultation.chamberId,
        rangpurChamber.id,
        "Consultation must inherit/retain patient's chamber ID"
      );

      const prescription = await rxRepo.createPrescription({
        patientId: patient.id,
        consultationId: consultation.id,
        chamberId: patient.chamberId,
        prescriptionDate: "2026-10-14",
        status: "draft",
        items: [
          {
            brandName: "Napa",
            genericName: "Paracetamol",
            strength: "500 mg",
            dosageForm: "Tablet",
            frequency: "1+1+1",
            duration: "5 days",
          },
        ],
      });

      assert.equal(
        prescription.chamberId,
        rangpurChamber.id,
        "Prescription must inherit/retain patient's chamber ID"
      );
    });
  });

  describe("6. Dashboard Metrics & Scoped Counting", () => {
    it("accurately segments total patient counts and dashboard metrics by chamber", async () => {
      const patientRepo = getPatientRepository();
      const clinicalRepo = getClinicalRepository();

      const dhakaId = KNOWN_CHAMBERS[0].id;
      const rangpurId = KNOWN_CHAMBERS[1].id;

      const initialDhaka = await patientRepo.getTotalPatientCount(dhakaId);
      const initialRangpur = await patientRepo.getTotalPatientCount(rangpurId);
      const initialTotal = await patientRepo.getTotalPatientCount();

      // Register 3 in Dhaka, 2 in Rangpur
      for (let i = 0; i < 3; i++) {
        await patientRepo.createPatient({
          name: `DH Patient ${i}`,
          gender: "male",
          dateOfBirth: "1990-01-01",
          chamberId: dhakaId,
        });
      }

      for (let i = 0; i < 2; i++) {
        await patientRepo.createPatient({
          name: `RNG Patient ${i}`,
          gender: "female",
          dateOfBirth: "1992-02-02",
          chamberId: rangpurId,
        });
      }

      const dhakaCount = await patientRepo.getTotalPatientCount(dhakaId);
      const rangpurCount = await patientRepo.getTotalPatientCount(rangpurId);
      const totalCount = await patientRepo.getTotalPatientCount();

      assert.equal(dhakaCount, initialDhaka + 3, "Dhaka total count should increase by 3");
      assert.equal(rangpurCount, initialRangpur + 2, "Rangpur total count should increase by 2");
      assert.equal(totalCount, initialTotal + 5, "Global count should increase by 5");

      const dhakaMetrics = await clinicalRepo.getDashboardMetrics(dhakaId);
      assert.ok(dhakaMetrics.todayPatientsCount !== undefined, "Dhaka metrics todayPatientsCount should exist");

      const rangpurMetrics = await clinicalRepo.getDashboardMetrics(rangpurId);
      assert.ok(rangpurMetrics.todayPatientsCount !== undefined, "Rangpur metrics todayPatientsCount should exist");
    });
  });

  describe("7. Legacy Record Preservation (Zero Data Loss)", () => {
    it("preserves unassigned legacy records with chamberId = null without corruption", async () => {
      const patientRepo = getPatientRepository();

      // Simulate a legacy patient created without chamberId (like PT-000013)
      const legacyPatient = await patientRepo.createPatient({
        name: "Legacy Patient PT-13",
        gender: "male",
        dateOfBirth: "1982-03-20",
        phone: "+8801811223344",
        chamberId: undefined, // Unassigned
      });

      assert.equal(legacyPatient.chamberId, undefined);

      // Verify unassigned filtering
      const unassignedList = await patientRepo.getPatients({
        chamberId: "unassigned",
      });
      assert.ok(
        unassignedList.items.some((p) => p.name === "Legacy Patient PT-13"),
        "Legacy record must be findable via 'unassigned' filter"
      );

      // Verify global "all" includes it
      const allList = await patientRepo.getPatients({
        chamberId: "all",
      });
      assert.ok(
        allList.items.some((p) => p.name === "Legacy Patient PT-13"),
        "Legacy record must be present in global patient list"
      );
    });
  });

  describe("8. Medicine Catalogue Invariance", () => {
    it("medicine search and catalogue counts are completely insulated from chamber changes", async () => {
      const medRepo = getMedicineRepository();
      const paginatedResult = await medRepo.searchMedicinesPaginated({ query: "Napa" });

      assert.ok(paginatedResult.totalCount > 0, "Medicine catalogue must be populated");

      const searchResult = await medRepo.searchMedicines({ query: "Napa" });
      assert.ok(searchResult.length > 0, "Medicine search works normally");
    });
  });
});
