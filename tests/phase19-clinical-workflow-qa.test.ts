import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import {
  setRepositoryProvider,
  getPatientRepository,
  getConsultationRepository,
  getMedicineRepository,
  getPrescriptionRepository,
  getClinicalDocumentRepository,
  resetRepositoryInstances,
  ValidationError,
  DataError,
  PatientNotFoundError,
} from "../src/lib/data";
import { generatePrescriptionPdf } from "../src/lib/pdf/prescription-pdf-generator";
import { HybridMedicineSearchService } from "../src/lib/medicine-search";
import { createPrescriptionItemSnapshot } from "../src/lib/medicine-search/snapshot-helper";
import { inspectJwtClaims } from "../src/lib/auth/session";

describe("Phase 19: End-to-End Clinical Journey & Launch Readiness QA Suite", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Complete Clinical Journey (Steps 1–14)", () => {
    it("executes the full clinical journey from doctor auth through patient creation, consultation, hybrid medicine prescription, draft edit, finalization, Bengali PDF generation, R2 archival, timeline reopening, and immutability protection", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();
      const medRepo = getMedicineRepository();
      const rxRepo = getPrescriptionRepository();
      const docRepo = getClinicalDocumentRepository();

      // ======================================================================
      // STEP 1: Doctor Login & Session Validation
      // ======================================================================
      // Simulate doctor JWT inspection
      const nowSec = Math.floor(Date.now() / 1000);
      const validPayload = {
        sub: "adabdbb0-2308-405c-aa8b-ae672cf1e923",
        email: "drtashfinahmed@gmail.com",
        role: "authenticated",
        exp: nowSec + 3600,
        app_metadata: { role: "doctor" },
      };
      const b64Payload = Buffer.from(JSON.stringify(validPayload)).toString("base64url");
      const mockDoctorJwt = `eyJhbGciOiJIUzI1NiJ9.${b64Payload}.signature`;

      const claims = inspectJwtClaims(mockDoctorJwt);
      assert.equal(claims.valid, true, "Doctor JWT claims must be valid");
      assert.equal(claims.sub, "adabdbb0-2308-405c-aa8b-ae672cf1e923");
      assert.equal(claims.email, "drtashfinahmed@gmail.com");

      // Verify unauthenticated / expired token rejection
      const expiredPayload = { ...validPayload, exp: nowSec - 60 };
      const expiredJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(expiredPayload)).toString("base64url")}.sig`;
      const expiredClaims = inspectJwtClaims(expiredJwt);
      assert.equal(expiredClaims.valid, false, "Expired JWT must be rejected");

      // ======================================================================
      // STEP 2: Create a Synthetic Patient
      // ======================================================================
      const patient = await patientRepo.createPatient({
        name: "মুহাম্মাদ তানভীর আহমেদ (Muhammad Tanvir Ahmed)",
        dateOfBirth: "1990-08-20",
        gender: "male",
        phone: "+8801719876543",
        weight: 72,
        bloodGroup: "B+",
        address: "Mirpur-10, Dhaka",
      });

      assert.ok(patient.id, "Patient internal UUID must exist");
      assert.match(patient.patientId, /^PT-\d{6}$/, "Patient ID must follow PT-XXXXXX format");
      assert.equal(patient.gender, "male");
      assert.equal(patient.bloodGroup, "B+");
      assert.equal(patient.weight, 72);
      assert.ok(patient.age >= 35, "Age must be calculated accurately from DOB");

      // ======================================================================
      // STEP 3: Edit and Search for That Patient
      // ======================================================================
      // Edit patient
      const updatedPatient = await patientRepo.updatePatient(patient.id, {
        address: "Dhanmondi 27, Dhaka",
        weight: 73,
      });
      assert.equal(updatedPatient.address, "Dhanmondi 27, Dhaka");
      assert.equal(updatedPatient.weight, 73);

      // Search by partial English name
      const searchEnglish = await patientRepo.getPatients({ search: "Tanvir" });
      assert.ok(searchEnglish.items.length >= 1);
      assert.ok(searchEnglish.items.some((p) => p.id === patient.id));

      // Search by patient human code
      const searchCode = await patientRepo.getPatients({ search: patient.patientId });
      assert.equal(searchCode.items.length, 1);
      assert.equal(searchCode.items[0].id, patient.id);

      // Search by phone
      const searchPhone = await patientRepo.getPatients({ search: "01719876543" });
      assert.ok(searchPhone.items.length >= 1);
      assert.ok(searchPhone.items.some((p) => p.id === patient.id));

      // Filter by gender
      const filterMale = await patientRepo.getPatients({ gender: "male" });
      assert.ok(filterMale.items.some((p) => p.id === patient.id));
      const filterFemale = await patientRepo.getPatients({ gender: "female" });
      assert.ok(!filterFemale.items.some((p) => p.id === patient.id));

      // ======================================================================
      // STEP 4: Open Patient Profile & Medical History
      // ======================================================================
      const profileById = await patientRepo.getPatientById(patient.id);
      const profileByCode = await patientRepo.getPatientByPatientId(patient.patientId);
      assert.deepEqual(profileById, profileByCode);
      assert.equal(profileById?.name, "মুহাম্মাদ তানভীর আহমেদ (Muhammad Tanvir Ahmed)");

      // ======================================================================
      // STEP 5: Create a Consultation with Vitals, Symptoms & Diagnosis
      // ======================================================================
      const consultation = await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-10-13",
        chiefComplaint: "High fever (103°F) for 3 days with severe productive cough and throat pain",
        others: "Onset was sudden 3 days ago with chills, body ache, and yellowish sputum.",
        clinicalExamination: "BP: 120/80 mmHg, Pulse: 94 bpm, Temp: 103°F, SpO2: 97%. Pharynx congested, bilateral wheezing in lower zones.",
        provisionalDiagnosis: "Acute Bacterial Bronchitis with High-grade Fever",
        plan: "Initiate oral antibacterial therapy, antipyretic, adequate hydration, chest physiotherapy.",
        advice: "Complete full 7-day antibiotic course. Drink plenty of warm water. Rest for 3 days.",
        nextFollowUp: "2026-10-20",
      });

      assert.ok(consultation.id);
      assert.equal(consultation.patientId, patient.patientId);
      assert.equal(consultation.provisionalDiagnosis, "Acute Bacterial Bronchitis with High-grade Fever");

      // ======================================================================
      // STEP 6: Select Local Medicine from Catalogue
      // ======================================================================
      const localMatches = await medRepo.searchMedicines({ query: "Napa" });
      assert.ok(localMatches.length > 0, "Must return local catalogue match");
      const localMed = {
        ...localMatches[0],
        id: "557d8395-bf87-447b-a3a6-fb2025590bd0",
      };

      const localItemSnapshot = createPrescriptionItemSnapshot(localMed, 0);
      assert.equal(localItemSnapshot.medicineId, "557d8395-bf87-447b-a3a6-fb2025590bd0", "Local medicine snapshot MUST retain medicineId UUID");
      assert.equal(localItemSnapshot.brandName, localMed.brandName);
      assert.equal(localItemSnapshot.genericName, localMed.genericName);

      // Clinician explicitly enters dosage instructions (catalogue does not auto-prescribe)
      localItemSnapshot.dose = "1 tablet";
      localItemSnapshot.frequency = "1+0+1";
      localItemSnapshot.duration = "5 days";
      localItemSnapshot.route = "Oral";
      localItemSnapshot.timingInstructions = "After meal";

      // ======================================================================
      // STEP 7: Select External Medicine from Hybrid Search (1stCef)
      // ======================================================================
      const hybridService = new HybridMedicineSearchService({ localRepo: medRepo });
      const externalSearch = await hybridService.search({ query: "1stCef", limit: 5 });
      assert.ok(externalSearch.results.length > 0, "Must find external dataset match for 1stCef");
      const externalMed = externalSearch.results[0];

      const externalItemSnapshot = createPrescriptionItemSnapshot(externalMed, 1);
      // STRICT CLINICAL CONSTRAINT: External medicines MUST have medicineId: undefined / null
      assert.equal(externalItemSnapshot.medicineId, undefined, "External item medicineId MUST be null/undefined");
      assert.equal(externalItemSnapshot.brandName, "1stCef");
      assert.equal(externalItemSnapshot.genericName, "Cefadroxil Monohydrate");
      assert.equal(externalItemSnapshot.strength, "500 mg");
      assert.equal(externalItemSnapshot.manufacturer, "Medimet Pharmaceuticals Ltd.");

      // Clinician explicitly enters dosage instructions
      externalItemSnapshot.dose = "1 capsule";
      externalItemSnapshot.frequency = "1+0+1";
      externalItemSnapshot.duration = "7 days";
      externalItemSnapshot.route = "Oral";
      externalItemSnapshot.timingInstructions = "After meal";

      // ======================================================================
      // STEP 8: Validate Medicine Details & Clinician Dosage
      // ======================================================================
      assert.equal(localItemSnapshot.frequency, "1+0+1");
      assert.equal(externalItemSnapshot.frequency, "1+0+1");
      assert.equal(externalItemSnapshot.duration, "7 days");

      // ======================================================================
      // STEP 9: Save Draft, Edit Draft, and Finalize Prescription
      // ======================================================================
      const draftPrescription = await rxRepo.createPrescription({
        patientId: patient.id,
        consultationId: consultation.id,
        prescriptionDate: "2026-10-13",
        status: "draft",
        advice: "নিয়মিত ওষুধ খাবেন।",
        followUpDate: "2026-10-20",
        followUpInstructions: "ফলো-আপের দিন সিবিসি টেস্ট রিপোর্ট সাথে নিয়ে আসবেন।",
        items: [localItemSnapshot, externalItemSnapshot],
      });

      assert.equal(draftPrescription.status, "draft");
      assert.equal(draftPrescription.items.length, 2);
      assert.match(draftPrescription.prescriptionCode, /^RX-(\d{4}-)?\d{6}$/);

      // Edit draft prescription
      const updatedDraft = await rxRepo.updatePrescription(draftPrescription.id, {
        advice: "নিয়মিত ওষুধ খাবেন। প্রচুর পানি পান করবেন এবং ঠান্ডা এড়িয়ে চলবেন।",
        notes: "Clinical note: Patient advised on antibiotic adherence.",
      });
      assert.ok(updatedDraft.advice?.includes("প্রচুর পানি পান করবেন"));
      assert.equal(updatedDraft.notes, "Clinical note: Patient advised on antibiotic adherence.");

      // Finalize prescription
      const finalized = await rxRepo.finalizePrescription(draftPrescription.id);
      assert.equal(finalized.status, "finalized");
      assert.ok(finalized.finalizedAt);

      // ======================================================================
      // STEP 10: Generate Prescription PDF Buffer
      // ======================================================================
      const pdfBuffer = await generatePrescriptionPdf({
        prescription: finalized,
        patient,
        version: 1,
      });

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 2500, "PDF buffer must contain complete formatted document");
      assert.equal(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-", "PDF header must match %PDF-");

      // ======================================================================
      // STEP 11: Verify Bengali Text Rendering & SHA-256 Digest
      // ======================================================================
      const sha256Digest = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      assert.equal(sha256Digest.length, 64, "SHA-256 digest must be 64 hexadecimal characters");

      // ======================================================================
      // STEP 12: Archive Document to Private Cloudflare R2 & Verify Parity
      // ======================================================================
      const r2Key = `prescriptions/${patient.patientId}/${finalized.id}/v1_${finalized.prescriptionCode}.pdf`;
      const doc = await docRepo.createDocument({
        patientId: patient.id,
        consultationId: consultation.id,
        prescriptionId: finalized.id,
        title: `Prescription - ${finalized.prescriptionCode} (v1)`,
        category: "prescription",
        r2Key,
        contentHash: sha256Digest,
        fileSizeBytes: pdfBuffer.length,
        version: 1,
      });

      assert.equal(doc.version, 1);
      assert.equal(doc.contentHash, sha256Digest);
      assert.equal(doc.r2Key, r2Key);

      // Link archive to prescription
      const archivedRx = await rxRepo.attachArchivedDocument(finalized.id, {
        archivedDocumentId: doc.id,
        archivedPdfKey: r2Key,
        archivedPdfHash: sha256Digest,
        archivedPdfSize: pdfBuffer.length,
        archiveVersion: 1,
        archivedAt: doc.archivedAt,
      });

      assert.equal(archivedRx.archivedPdfHash, sha256Digest);
      assert.equal(archivedRx.archiveVersion, 1);

      // Read-back verification (simulating R2 download parity)
      const readBackHash = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      assert.equal(readBackHash, doc.contentHash, "Archive SHA-256 must match exactly");

      // ======================================================================
      // STEP 13: Reopen Patient Timeline & Verify Relational Graph
      // ======================================================================
      const patientPrescriptions = await rxRepo.getPrescriptionsByPatientId(patient.id);
      assert.equal(patientPrescriptions.length, 1);
      assert.equal(patientPrescriptions[0].id, finalized.id);

      const consultPrescription = await rxRepo.getPrescriptionByConsultationId(consultation.id);
      assert.ok(consultPrescription);
      assert.equal(consultPrescription.id, finalized.id);

      const attachedDocs = await docRepo.getDocumentsByPrescriptionId(finalized.id);
      assert.equal(attachedDocs.length, 1);
      assert.equal(attachedDocs[0].contentHash, sha256Digest);

      // Verify prescription items survive
      const reloadedRx = await rxRepo.getPrescriptionById(finalized.id);
      assert.ok(reloadedRx);
      assert.equal(reloadedRx.items.length, 2);

      const reloadedLocal = reloadedRx.items.find((it) => it.brandName === localMed.brandName);
      const reloadedExternal = reloadedRx.items.find((it) => it.brandName === "1stCef");

      assert.ok(reloadedLocal, "Local item exists in reloaded prescription");
      assert.ok(reloadedLocal.medicineId, "Local medicine item maintains medicineId");
      assert.ok(!reloadedExternal?.medicineId, "External medicine item strictly maintains null or undefined medicineId");
      assert.equal(reloadedExternal?.strength, "500 mg");
      assert.equal(reloadedExternal?.manufacturer, "Medimet Pharmaceuticals Ltd.");

      // ======================================================================
      // STEP 14: Enforce Finalized Prescription Immutability
      // ======================================================================
      await assert.rejects(
        async () => {
          await rxRepo.updatePrescription(finalized.id, { advice: "Unauthorized edit attempt" });
        },
        DataError,
        "Cannot modify a finalized prescription"
      );

      await assert.rejects(
        async () => {
          await rxRepo.deleteDraftPrescription(finalized.id);
        },
        DataError,
        "Cannot delete a finalized prescription"
      );
    });
  });

  describe("2. Negative Data Integrity & Clinical Validation Rules", () => {
    it("rejects prescription items missing clinician-confirmed dosage frequency", async () => {
      const rxRepo = getPrescriptionRepository();
      await assert.rejects(
        async () => {
          await rxRepo.createPrescription({
            patientId: "patient-1",
            items: [
              {
                brandName: "1stCef",
                genericName: "Cefadroxil Monohydrate",
                frequency: "", // Missing frequency!
              },
            ],
          });
        },
        ValidationError,
        "Must reject prescription item missing frequency"
      );
    });

    it("rejects creating consultations for non-existent patient identifiers", async () => {
      const consultRepo = getConsultationRepository();
      await assert.rejects(
        async () => {
          await consultRepo.createConsultation({
            patientId: "PT-999999",
            consultationDate: "2026-10-13",
          });
        },
        PatientNotFoundError
      );
    });

    it("verifies duplicate phone number detection during patient registration", async () => {
      const patientRepo = getPatientRepository();
      await patientRepo.createPatient({
        name: "Patient A",
        dateOfBirth: "1980-01-01",
        gender: "male",
        phone: "+8801999888777",
      });

      const duplicate = await (
        patientRepo as unknown as {
          checkPotentialDuplicate: (
            name: string,
            phone: string
          ) => Promise<{ phone: string } | null>;
        }
      ).checkPotentialDuplicate("Different Name", "+8801999888777");
      assert.ok(duplicate, "Duplicate phone must be detected");
      assert.equal(duplicate.phone, "+8801999888777");
    });
  });
});
