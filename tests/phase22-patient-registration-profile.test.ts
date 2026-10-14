import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  setRepositoryProvider,
  getPatientRepository,
  getChamberRepository,
  resetRepositoryInstances,
} from "../src/lib/data";
import { KNOWN_CHAMBERS } from "../src/types/chamber";
import { CreatePatientDTO, UpdatePatientDTO } from "../src/types/patient";

describe("Phase 22: Complete Patient Registration & Lifetime Patient Profile", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Complete Patient Registration with Full Profile", () => {
    it("registers a patient with complete identity, family, contact, emergency, and clinical background fields", async () => {
      const repo = getPatientRepository();

      const newPatientData: CreatePatientDTO = {
        name: "Mohammad Tareq Rahman",
        dateOfBirth: "1988-06-15",
        gender: "male",
        weight: 74.5,
        bloodGroup: "B+",
        phone: "+8801712345678",
        secondaryPhone: "01819999888",
        email: "tareq.rahman@example.com",
        address: "House 14, Road 5, Dhanmondi, Dhaka",
        permanentAddress: "Vill: Gobindapur, PS: Mithapukur, Rangpur",

        // Section A: Family
        fatherName: "Late Golam Rahman",
        motherName: "Rokeya Begum",
        guardianName: "Kamrul Rahman",
        guardianRelationship: "Elder Brother",

        // Section B: Emergency
        emergencyContactName: "Dr. Kamrul Rahman",
        emergencyContactRelationship: "Elder Brother",
        emergencyContactPhone: "01711223344",

        // Section C: Clinical Background
        occupation: "Software Engineer",
        allergies: "Penicillin, Cephalosporins (rash & urticaria)",
        medicalHistory: "Hypertension (HTN) for 3 years, Childhood Asthma",
        currentMedications: "Tab. Amlodipine 5mg (1+0+0), Salbutamol Inhaler PRN",
        patientNotes: "Patient has needle anxiety. Family history of type 2 diabetes.",
        chamberId: "d1a4a001-0000-4000-8000-000000000001", // Dhaka
      };

      const created = await repo.createPatient(newPatientData);

      assert.ok(created.id, "Internal UUID must be generated");
      assert.match(created.patientId, /^DH-\d{6}$/, "Must receive Dhaka chamber prefix DH");
      assert.equal(created.name, "Mohammad Tareq Rahman");
      assert.equal(created.gender, "male");
      assert.equal(created.bloodGroup, "B+");
      assert.equal(created.weight, 74.5);
      assert.equal(created.phone, "+8801712345678");
      assert.equal(created.secondaryPhone, "01819999888");
      assert.equal(created.address, "House 14, Road 5, Dhanmondi, Dhaka");
      assert.equal(created.permanentAddress, "Vill: Gobindapur, PS: Mithapukur, Rangpur");

      // Section A
      assert.equal(created.fatherName, "Late Golam Rahman");
      assert.equal(created.motherName, "Rokeya Begum");
      assert.equal(created.guardianName, "Kamrul Rahman");
      assert.equal(created.guardianRelationship, "Elder Brother");

      // Section B
      assert.equal(created.emergencyContactName, "Dr. Kamrul Rahman");
      assert.equal(created.emergencyContactRelationship, "Elder Brother");
      assert.equal(created.emergencyContactPhone, "01711223344");

      // Section C
      assert.equal(created.occupation, "Software Engineer");
      assert.equal(created.allergies, "Penicillin, Cephalosporins (rash & urticaria)");
      assert.equal(created.medicalHistory, "Hypertension (HTN) for 3 years, Childhood Asthma");
      assert.equal(created.currentMedications, "Tab. Amlodipine 5mg (1+0+0), Salbutamol Inhaler PRN");
      assert.equal(created.patientNotes, "Patient has needle anxiety. Family history of type 2 diabetes.");

      // Retrieval verification
      const fetched = await repo.getPatientById(created.id);
      assert.ok(fetched, "Must be retrievable by ID");
      assert.equal(fetched?.patientId, created.patientId);
      assert.equal(fetched?.fatherName, "Late Golam Rahman");
      assert.equal(fetched?.emergencyContactPhone, "01711223344");
      assert.equal(fetched?.allergies, "Penicillin, Cephalosporins (rash & urticaria)");
    });

    it("optional and nullable fields remain truly optional and don't fail when omitted", async () => {
      const repo = getPatientRepository();

      const minimalData: CreatePatientDTO = {
        name: "Minimalist Patient",
        dateOfBirth: "1995-10-20",
        gender: "female",
        chamberId: "d1a4a002-0000-4000-8000-000000000002", // Rangpur
      };

      const created = await repo.createPatient(minimalData);

      assert.ok(created.id);
      assert.match(created.patientId, /^RNG-\d{6}$/);
      assert.equal(created.name, "Minimalist Patient");
      assert.equal(created.gender, "female");
      assert.equal(created.phone, undefined);
      assert.equal(created.secondaryPhone, undefined);
      assert.equal(created.fatherName, undefined);
      assert.equal(created.allergies, undefined);
      assert.equal(created.patientNotes, undefined);
    });
  });

  describe("2. Age Auto-Calculation & Manual Override", () => {
    it("auto-calculates age from date of birth when age is omitted", async () => {
      const repo = getPatientRepository();
      const birthYear = new Date().getFullYear() - 25;
      const dob = `${birthYear}-01-01`;

      const patient = await repo.createPatient({
        name: "Auto Age Patient",
        dateOfBirth: dob,
        gender: "female",
      });

      assert.ok(patient.age >= 24 && patient.age <= 26, `Age should be approximately 25, got ${patient.age}`);
    });

    it("respects explicit age override when provided by the clinician", async () => {
      const repo = getPatientRepository();

      const patient = await repo.createPatient({
        name: "Explicit Age Patient",
        dateOfBirth: "1990-05-10",
        age: 38, // Clinician override
        gender: "male",
      });

      assert.equal(patient.age, 38, "Clinician explicit age must be preserved");
    });
  });

  describe("3. Contact & Phone Format Validation", () => {
    it("accepts valid Bangladeshi phone formats and international numbers", async () => {
      const repo = getPatientRepository();

      const validPhones = [
        "01712345678",
        "+8801812345678",
        "+880 1912-345678",
        "01300000000",
        "+1 (555) 123-4567",
      ];

      for (const phone of validPhones) {
        const patient = await repo.createPatient({
          name: `Valid Phone ${phone}`,
          dateOfBirth: "1992-03-14",
          gender: "other",
          phone: phone,
          secondaryPhone: "+8801700000000",
        });

        assert.equal(patient.phone, phone);
      }
    });

    it("rejects malformed phone numbers with validation error", async () => {
      const repo = getPatientRepository();

      await assert.rejects(
        async () => {
          await repo.createPatient({
            name: "Invalid Phone Patient",
            dateOfBirth: "1992-03-14",
            gender: "male",
            phone: "this-is-not-a-phone-number-at-all",
          });
        },
        /validation/i,
        "Should reject invalid phone number"
      );
    });
  });

  describe("4. Duplicate Patient Warning Logic", () => {
    it("detects potential duplicate patient by primary phone or secondary phone", async () => {
      const repo = getPatientRepository();

      await repo.createPatient({
        name: "Original Patient",
        dateOfBirth: "1985-02-14",
        gender: "male",
        phone: "01755554433",
        secondaryPhone: "01855554433",
      });

      // Match on primary phone
      const matchPrimary = await repo.checkPotentialDuplicate("Any Different Name", "01755554433");
      assert.ok(matchPrimary, "Must match on primary phone");
      assert.equal(matchPrimary.name, "Original Patient");

      // Match on secondary phone
      const matchSecondary = await repo.checkPotentialDuplicate("Another Different Name", "01855554433");
      assert.ok(matchSecondary, "Must match on secondary phone");
      assert.equal(matchSecondary.name, "Original Patient");

      // Match on exact name
      const matchName = await repo.checkPotentialDuplicate("original patient");
      assert.ok(matchName, "Must match on case-insensitive name");

      // Non-match returns null
      const nonMatch = await repo.checkPotentialDuplicate("Completely New Individual", "01999999999");
      assert.equal(nonMatch, null, "Distinct patient should return null");
    });
  });

  describe("5. Profile Updates & Partial Modification", () => {
    it("updates newly added clinical background and emergency fields cleanly without altering other fields", async () => {
      const repo = getPatientRepository();

      const created = await repo.createPatient({
        name: "Update Subject",
        dateOfBirth: "1991-07-20",
        gender: "female",
        phone: "01711002233",
        fatherName: "Original Father",
        allergies: "None",
      });

      const updateData: UpdatePatientDTO = {
        allergies: "Penicillin (anaphylaxis confirmed)",
        emergencyContactName: "Hafizur Rahman",
        emergencyContactRelationship: "Husband",
        emergencyContactPhone: "01799887766",
        patientNotes: "Prefers morning appointments.",
      };

      const updated = await repo.updatePatient(created.id, updateData);

      assert.equal(updated.id, created.id);
      assert.equal(updated.name, "Update Subject", "Name must remain untouched");
      assert.equal(updated.fatherName, "Original Father", "Existing fatherName must remain untouched");
      assert.equal(updated.allergies, "Penicillin (anaphylaxis confirmed)", "Allergies must be updated");
      assert.equal(updated.emergencyContactName, "Hafizur Rahman");
      assert.equal(updated.emergencyContactPhone, "01799887766");
      assert.equal(updated.patientNotes, "Prefers morning appointments.");
    });
  });

  describe("6. Search by Extended Profile Fields", () => {
    it("searches patients by father's name and secondary phone", async () => {
      const repo = getPatientRepository();

      await repo.createPatient({
        name: "Nasir Uddin",
        dateOfBirth: "1980-01-10",
        gender: "male",
        fatherName: "Alhajj Mofizur Rahman",
        secondaryPhone: "01622334455",
      });

      // Search by father's name
      const searchFather = await repo.getPatients({ search: "Mofizur" });
      assert.ok(searchFather.items.length >= 1);
      assert.ok(searchFather.items.some((p) => p.name === "Nasir Uddin"));

      // Search by secondary phone
      const searchSecPhone = await repo.getPatients({ search: "01622334455" });
      assert.ok(searchSecPhone.items.length >= 1);
      assert.ok(searchSecPhone.items.some((p) => p.name === "Nasir Uddin"));
    });
  });

  describe("7. Legacy Record Backwards Compatibility & Chamber Independence", () => {
    it("preserves legacy unassigned patient records with undefined new fields without crashing", async () => {
      const repo = getPatientRepository();

      // Legacy patient PT-000001 from seed
      const legacy = await repo.getPatientByIdentifier("PT-000001");
      if (legacy) {
        assert.ok(legacy.id);
        assert.equal(legacy.patientId, "PT-000001");
        // Nullable fields default to undefined or null without throwing
        assert.equal(typeof legacy.name, "string");
      }
    });

    it("creates sequential IDs across Dhaka, Rangpur, and Narayanganj with full profiles independently", async () => {
      const repo = getPatientRepository();

      const dhakaPatient = await repo.createPatient({
        name: "Dhaka Profile",
        dateOfBirth: "1994-04-12",
        gender: "male",
        chamberId: "d1a4a001-0000-4000-8000-000000000001",
        occupation: "Teacher",
      });

      const rangpurPatient = await repo.createPatient({
        name: "Rangpur Profile",
        dateOfBirth: "1986-09-08",
        gender: "female",
        chamberId: "d1a4a002-0000-4000-8000-000000000002",
        occupation: "Doctor",
      });

      const narayanganjPatient = await repo.createPatient({
        name: "Narayanganj Profile",
        dateOfBirth: "1979-11-25",
        gender: "male",
        chamberId: "d1a4a003-0000-4000-8000-000000000003",
        occupation: "Merchant",
      });

      assert.match(dhakaPatient.patientId, /^DH-\d{6}$/);
      assert.match(rangpurPatient.patientId, /^RNG-\d{6}$/);
      assert.match(narayanganjPatient.patientId, /^N-\d{6}$/);

      assert.equal(dhakaPatient.occupation, "Teacher");
      assert.equal(rangpurPatient.occupation, "Doctor");
      assert.equal(narayanganjPatient.occupation, "Merchant");
    });
  });
});
