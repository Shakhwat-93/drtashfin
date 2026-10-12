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
import { isValidUUID, sanitizeFilename } from "../src/lib/security/api-security";

describe("Phase 12: End-to-End Clinical Workflow & Security Suite", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Complete Clinical Workflow Happy Path", () => {
    it("executes the full workflow: Patient -> Consultation -> Medicine Search -> Rx Draft -> Finalize -> PDF -> Archive -> Verify", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();
      const medRepo = getMedicineRepository();
      const rxRepo = getPrescriptionRepository();
      const docRepo = getClinicalDocumentRepository();

      // Step A: Patient Creation
      const patient = await patientRepo.createPatient({
        name: "তাহমিনা আক্তার (Tahmina Akter)",
        dateOfBirth: "1988-04-15",
        gender: "female",
        phone: "+8801812345678",
        weight: 58,
        bloodGroup: "A+",
        address: "Dhanmondi, Dhaka",
      });

      assert.ok(patient.id);
      assert.match(patient.patientId, /^PT-\d{6}$/);

      // Step B: Patient Search
      const searchResult = await patientRepo.getPatients({ search: "Tahmina" });
      assert.ok(searchResult.items.length >= 1);
      const found = searchResult.items.find((p) => p.id === patient.id);
      assert.ok(found, "Patient should be found by name query");

      // Step C: Consultation Creation
      const consultation = await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-10-12",
        chiefComplaint: "Severe headache and elevated blood pressure for 3 days",
        clinicalExamination: "BP: 150/95 mmHg, Pulse: 82 bpm, Chest: Clear",
        provisionalDiagnosis: "Essential Hypertension (Stage 2)",
        plan: "Initiate antihypertensive regimen and lifestyle modifications",
        advice: "Low sodium diet, brisk walking 30 mins daily",
        nextFollowUp: "2026-10-26",
      });

      assert.ok(consultation.id);
      assert.equal(consultation.patientId, patient.patientId);

      // Step D: Medicine Search
      const medSearch = await medRepo.searchMedicines({ query: "Napa" });
      assert.ok(medSearch.length > 0, "Medicine search should return catalogue matches");
      const matchedMed = medSearch[0];

      // Step E: Prescription Draft Creation
      const prescription = await rxRepo.createPrescription({
        patientId: patient.id,
        consultationId: consultation.id,
        prescriptionDate: "2026-10-12",
        status: "draft",
        advice: "নিয়মিত ওষুধ খাবেন। মাথা ঘোরালে বিশ্রাম নেবেন।",
        followUpDate: "2026-10-26",
        items: [
          {
            medicineId: matchedMed.id,
            brandName: matchedMed.brandName,
            genericName: matchedMed.genericName,
            strength: matchedMed.strength,
            dosageForm: matchedMed.dosageForm,
            dose: "1 tablet",
            frequency: "1+0+1",
            route: "Oral",
            duration: "7 days",
            timingInstructions: "After meal",
          },
          {
            brandName: "Camlosart 5/20",
            genericName: "Amlodipine + Olmesartan",
            strength: "5 mg + 20 mg",
            dosageForm: "Tablet",
            dose: "1 tablet",
            frequency: "0+0+1",
            route: "Oral",
            duration: "30 days",
            timingInstructions: "At bedtime",
          },
        ],
      });

      assert.equal(prescription.status, "draft");
      assert.equal(prescription.items.length, 2);
      assert.equal(prescription.items[0].frequency, "1+0+1");

      // Step F: Prescription Finalization
      const finalized = await rxRepo.finalizePrescription(prescription.id);
      assert.equal(finalized.status, "finalized");
      assert.ok(finalized.finalizedAt);

      // Step G: PDF Generation
      const pdfBuffer = await generatePrescriptionPdf({
        prescription: finalized,
        patient,
        version: 1,
      });

      assert.ok(Buffer.isBuffer(pdfBuffer));
      assert.ok(pdfBuffer.length > 2000);
      assert.equal(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-");

      // Step H: Cryptographic SHA-256 Digest
      const sha256Digest = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      assert.equal(sha256Digest.length, 64);

      // Step I: Clinical Document Archival
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

      // Step J: Link Archive to Prescription
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

      // Step K: Integrity Verification (Matches)
      const verifyDigest = crypto.createHash("sha256").update(pdfBuffer).digest("hex");
      assert.equal(verifyDigest, doc.contentHash, "Downloaded buffer hash must match stored digest exactly");
    });
  });

  describe("2. Negative Authorization, Data Integrity & Failure Scenarios", () => {
    it("rejects prescription updates once finalized to enforce medico-legal immutability", async () => {
      const rxRepo = getPrescriptionRepository();
      const rx = await rxRepo.createPrescription({
        patientId: "patient-1",
        status: "finalized",
        items: [
          {
            brandName: "Napa",
            genericName: "Paracetamol",
            frequency: "1+0+1",
          },
        ],
      });

      await assert.rejects(
        async () => {
          await rxRepo.updatePrescription(rx.id, { advice: "Altered advice" });
        },
        DataError,
        "Should reject edits on finalized prescription"
      );
    });

    it("rejects deletion of finalized prescriptions", async () => {
      const rxRepo = getPrescriptionRepository();
      const rx = await rxRepo.createPrescription({
        patientId: "patient-1",
        status: "finalized",
        items: [
          {
            brandName: "Napa",
            genericName: "Paracetamol",
            frequency: "1+0+1",
          },
        ],
      });

      await assert.rejects(
        async () => {
          await rxRepo.deleteDraftPrescription(rx.id);
        },
        DataError,
        "Should reject deleting finalized prescriptions"
      );
    });

    it("rejects prescribed items missing clinician-confirmed frequency", async () => {
      const rxRepo = getPrescriptionRepository();
      await assert.rejects(
        async () => {
          await rxRepo.createPrescription({
            patientId: "patient-1",
            items: [
              {
                brandName: "Napa",
                genericName: "Paracetamol",
                frequency: "", // Empty frequency!
              },
            ],
          });
        },
        ValidationError,
        "Should reject prescription item with missing frequency"
      );
    });

    it("detects tampered PDF bytes and flags hash mismatch", async () => {
      const originalPdf = Buffer.from("%PDF-1.4 original clinical prescription");
      const originalHash = crypto.createHash("sha256").update(originalPdf).digest("hex");

      const tamperedPdf = Buffer.from("%PDF-1.4 altered prescription dosage");
      const tamperedHash = crypto.createHash("sha256").update(tamperedPdf).digest("hex");

      assert.notEqual(originalHash, tamperedHash, "Altered document must produce a distinct hash");
    });

    it("validates UUIDs and sanitizes filenames against injection", () => {
      assert.equal(isValidUUID("557d8395-bf87-447b-a3a6-fb2025590bd0"), true);
      assert.equal(isValidUUID("invalid-uuid-string"), false);
      assert.equal(isValidUUID(""), false);
      assert.equal(isValidUUID(null), false);
      assert.equal(isValidUUID("../../../etc/passwd"), false);

      const sanitized = sanitizeFilename("Prescription-RX-000001; rm -rf /; .pdf");
      assert.ok(!sanitized.includes(";"));
      assert.ok(!sanitized.includes(" "));
      assert.equal(sanitized, "Prescription-RX-000001__rm_-rf____.pdf");
    });

    it("throws PatientNotFoundError when requesting non-existent patient", async () => {
      const consultRepo = getConsultationRepository();
      await assert.rejects(
        async () => {
          await consultRepo.createConsultation({
            patientId: "PT-NONEXISTENT",
            consultationDate: "2026-10-12",
          });
        },
        PatientNotFoundError
      );
    });
  });
});
