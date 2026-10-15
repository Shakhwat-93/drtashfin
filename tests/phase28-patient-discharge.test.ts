import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  validateAndNormalizeGoogleDriveUrl,
} from "../src/lib/drive/drive-url-utils";
import {
  createDischargeSchema,
  amendDischargeSchema,
} from "../src/schemas/discharge";
import { MockDischargeRepository } from "../src/lib/data/repositories/mock-discharge-repository";
import { MockPatientRepository } from "../src/lib/data/repositories/mock-patient-repository";
import { MockConsultationRepository } from "../src/lib/data/repositories/mock-consultation-repository";
import { MockPrescriptionRepository } from "../src/lib/data/repositories/mock-prescription-repository";
import { MockFollowUpRepository } from "../src/lib/data/repositories/mock-follow-up-repository";
import { MockStorage } from "../src/lib/data/mock/mock-storage";
import {
  setRepositoryProvider,
  resetRepositoryInstances,
} from "../src/lib/data";
import {
  DISCHARGE_CONDITIONS,
  DISCHARGE_STATUSES,
  DischargeCondition,
  DischargeStatus,
} from "../src/types/discharge";

describe("Phase 28 — Patient Discharge & Final Clinical Report Management", () => {
  let patientRepo: MockPatientRepository;
  let consultRepo: MockConsultationRepository;
  let followUpRepo: MockFollowUpRepository;
  let dischargeRepo: MockDischargeRepository;

  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
    MockStorage.clear();

    patientRepo = new MockPatientRepository();
    consultRepo = new MockConsultationRepository();
    followUpRepo = new MockFollowUpRepository(patientRepo);
    dischargeRepo = new MockDischargeRepository(patientRepo, consultRepo, followUpRepo);
  });

  describe("1. Clinical Conditions & Schema Validation", () => {
    it("should recognize all 8 clinical discharge conditions", () => {
      assert.deepEqual(DISCHARGE_CONDITIONS, [
        "Recovered",
        "Improved",
        "Stable",
        "Unchanged",
        "Deteriorated",
        "Transferred",
        "Discharged Against Medical Advice",
        "Other",
      ]);
    });

    it("should recognize both discharge lifecycle statuses", () => {
      assert.deepEqual(DISCHARGE_STATUSES, ["draft", "finalized"]);
    });

    it("should validate a comprehensive discharge payload", () => {
      const validPayload = {
        patientId: "pt-uuid-1",
        consultationId: "cons-uuid-1",
        dischargeDate: "2026-10-15",
        dischargeTime: "14:30",
        status: "finalized" as DischargeStatus,
        clinicalReason: "Resolution of acute surgical condition and tolerance of regular diet",
        finalDiagnosis: "Acute appendicitis - Post laparoscopic appendectomy",
        treatmentSummary: "Patient made an uneventful recovery following 4-port laparoscopic appendectomy. Port sites clean and dry.",
        conditionAtDischarge: "Recovered" as DischargeCondition,
        dischargeInstructions: "Keep operative sites clean and dry. Avoid strenuous physical exertion for 2 weeks.",
        medicationInstructions: "Tab. Cefuroxime 500mg BD x 5 days\nTab. Paracetamol 500mg TDS PRN",
        recommendedFollowUpDate: "2026-10-22",
        followUpInstructions: "Post-op wound evaluation and stitch check",
        complications: "None",
        doctorId: "doc-1",
        doctorName: "Prof. Dr. Tashfin",
        driveUrl: "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view",
        scheduleFollowUp: true,
      };

      const result = createDischargeSchema.safeParse(validPayload);
      assert.equal(result.success, true);
    });

    it("should validate a minimal draft discharge payload", () => {
      const minimalPayload = {
        patientId: "pt-uuid-1",
        dischargeDate: "2026-10-15",
        status: "draft" as DischargeStatus,
        clinicalReason: "Elective discharge",
        finalDiagnosis: "Acute gastritis, improved",
        treatmentSummary: "Symptomatic relief with PPI and hydration",
        conditionAtDischarge: "Improved" as DischargeCondition,
        dischargeInstructions: "Bland diet, follow-up if symptoms recur",
      };

      const result = createDischargeSchema.safeParse(minimalPayload);
      assert.equal(result.success, true);
    });

    it("should reject invalid discharge condition", () => {
      const invalidCondition = {
        patientId: "pt-uuid-1",
        dischargeDate: "2026-10-15",
        clinicalReason: "Elective discharge",
        finalDiagnosis: "Gastritis",
        treatmentSummary: "Antacids",
        conditionAtDischarge: "Fully Recovered But Sick", // invalid condition
        dischargeInstructions: "Home care",
      };

      const result = createDischargeSchema.safeParse(invalidCondition);
      assert.equal(result.success, false);
    });

    it("should reject invalid date formats", () => {
      const invalidDate = {
        patientId: "pt-uuid-1",
        dischargeDate: "15/10/2026", // Not YYYY-MM-DD
        clinicalReason: "Elective discharge",
        finalDiagnosis: "Gastritis",
        treatmentSummary: "Antacids",
        conditionAtDischarge: "Improved" as DischargeCondition,
        dischargeInstructions: "Home care",
      };

      const result = createDischargeSchema.safeParse(invalidDate);
      assert.equal(result.success, false);
    });

    it("should reject amendment without valid amendment notes", () => {
      const invalidAmendment = {
        amendmentNotes: "   ",
        amendedBy: "Dr. Tashfin",
      };

      const result = amendDischargeSchema.safeParse(invalidAmendment);
      assert.equal(result.success, false);
    });
  });

  describe("2. Google Drive Link-Only Integrity", () => {
    it("should accept valid Google Drive file and folder links", () => {
      const fileUrl = "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing";
      const fileRes = validateAndNormalizeGoogleDriveUrl(fileUrl);
      assert.equal(fileRes.isValid, true);
      assert.equal(fileRes.resourceType, "file");

      const folderUrl = "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ";
      const folderRes = validateAndNormalizeGoogleDriveUrl(folderUrl);
      assert.equal(folderRes.isValid, true);
      assert.equal(folderRes.resourceType, "folder");
    });

    it("should reject non-Google Drive URLs", () => {
      const dropboxUrl = "https://www.dropbox.com/s/12345/discharge_summary.pdf";
      const dropRes = validateAndNormalizeGoogleDriveUrl(dropboxUrl);
      assert.equal(dropRes.isValid, false);

      const localPath = "C:\\reports\\discharge.pdf";
      const localRes = validateAndNormalizeGoogleDriveUrl(localPath);
      assert.equal(localRes.isValid, false);
    });

    it("should allow empty or omitted Google Drive URL", () => {
      const payload = {
        patientId: "pt-uuid-1",
        dischargeDate: "2026-10-15",
        clinicalReason: "Elective discharge",
        finalDiagnosis: "Gastritis",
        treatmentSummary: "Hydration",
        conditionAtDischarge: "Improved" as DischargeCondition,
        dischargeInstructions: "Home care",
        driveUrl: "",
      };

      const result = createDischargeSchema.safeParse(payload);
      assert.equal(result.success, true);
    });
  });

  describe("3. Draft Management & Repository Operations", () => {
    it("should create, retrieve, update, and delete draft discharge records", async () => {
      // Seed patient
      const patient = await patientRepo.createPatient({
        name: "Test Patient Draft",
        age: 35,
        gender: "female",
        dateOfBirth: "1991-05-10",
        phone: "+8801711223344",
      });

      // Create draft
      const created = await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-15",
        clinicalReason: "Treatment cycle concluded",
        finalDiagnosis: "Uncomplicated urinary tract infection",
        treatmentSummary: "Completed 5-day course of Nitrofurantoin. Urine microscopy clear.",
        conditionAtDischarge: "Recovered",
        dischargeInstructions: "Drink plenty of water. Return if dysuria recurs.",
        status: "draft",
      });

      assert.ok(created.id);
      assert.equal(created.status, "draft");
      assert.equal(created.conditionAtDischarge, "Recovered");

      // Retrieve by ID
      const fetched = await dischargeRepo.getDischargeById(created.id);
      assert.ok(fetched);
      assert.equal(fetched.finalDiagnosis, "Uncomplicated urinary tract infection");

      // Update draft
      const updated = await dischargeRepo.updateDischarge(created.id, {
        finalDiagnosis: "Acute cystitis, completely resolved",
        dischargeInstructions: "Drink at least 2.5L water daily.",
      });

      assert.equal(updated.finalDiagnosis, "Acute cystitis, completely resolved");
      assert.equal(updated.dischargeInstructions, "Drink at least 2.5L water daily.");

      // Delete draft
      const deleteResult = await dischargeRepo.deleteDraftDischarge(created.id);
      assert.equal(deleteResult, true);

      // Verify deletion
      const afterDelete = await dischargeRepo.getDischargeById(created.id);
      assert.equal(afterDelete, null);
    });

    it("should sort patient discharges reverse-chronologically", async () => {
      const patient = await patientRepo.createPatient({
        name: "Test Patient Sort",
        age: 42,
        gender: "male",
        dateOfBirth: "1984-02-15",
        phone: "+8801711223355",
      });

      await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-01",
        clinicalReason: "Cycle 1 complete",
        finalDiagnosis: "Diagnosis 1",
        treatmentSummary: "Treatment 1",
        conditionAtDischarge: "Improved",
        dischargeInstructions: "Instructions 1",
        status: "draft",
      });

      await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-15",
        clinicalReason: "Cycle 3 complete",
        finalDiagnosis: "Diagnosis 3",
        treatmentSummary: "Treatment 3",
        conditionAtDischarge: "Recovered",
        dischargeInstructions: "Instructions 3",
        status: "finalized",
      });

      await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-08",
        clinicalReason: "Cycle 2 complete",
        finalDiagnosis: "Diagnosis 2",
        treatmentSummary: "Treatment 2",
        conditionAtDischarge: "Stable",
        dischargeInstructions: "Instructions 2",
        status: "draft",
      });

      const list = await dischargeRepo.getDischarges({ patientId: patient.id });
      assert.equal(list.length, 3);
      assert.equal(list[0].dischargeDate, "2026-10-15");
      assert.equal(list[1].dischargeDate, "2026-10-08");
      assert.equal(list[2].dischargeDate, "2026-10-01");
    });
  });

  describe("4. Finalization Lock & Medico-Legal Immutability", () => {
    it("should lock finalized discharge summaries against direct edits", async () => {
      const patient = await patientRepo.createPatient({
        name: "Lock Test Patient",
        age: 50,
        gender: "male",
        dateOfBirth: "1976-08-20",
        phone: "+8801711223366",
      });

      const draft = await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-15",
        clinicalReason: "Clinical resolution of acute illness",
        finalDiagnosis: "Dengue fever with warning signs - recovered",
        treatmentSummary: "IV fluid resuscitation according to national dengue protocol. Platelet count normalized.",
        conditionAtDischarge: "Recovered",
        dischargeInstructions: "Rest and hydration. Monitor for any signs of bleeding.",
        status: "draft",
      });

      // Explicitly finalize
      const finalized = await dischargeRepo.finalizeDischarge(
        draft.id,
        "Prof. Dr. Tashfin"
      );

      assert.equal(finalized.status, "finalized");
      assert.ok(finalized.finalizedAt);
      assert.equal(finalized.finalizedBy, "Prof. Dr. Tashfin");

      // Attempting direct edit must throw
      await assert.rejects(
        async () => {
          await dischargeRepo.updateDischarge(draft.id, {
            finalDiagnosis: "Malaria",
          });
        },
        /Cannot modify a finalized discharge report/
      );
    });

    it("should reject deletion of finalized discharge records", async () => {
      const patient = await patientRepo.createPatient({
        name: "Delete Test Patient",
        age: 28,
        gender: "female",
        dateOfBirth: "1998-11-04",
        phone: "+8801711223377",
      });

      const finalized = await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-15",
        clinicalReason: "Resolution of symptoms",
        finalDiagnosis: "Acute viral pharyngitis",
        treatmentSummary: "Supportive management, antipyretics, and warm saline gargles.",
        conditionAtDischarge: "Recovered",
        dischargeInstructions: "Continue vocal rest for 48 hours.",
        status: "finalized",
        finalizedBy: "Dr. Tashfin",
      });

      await assert.rejects(
        async () => {
          await dischargeRepo.deleteDraftDischarge(finalized.id);
        },
        /Finalized discharge reports cannot be deleted/
      );
    });
  });

  describe("5. Auditable Amendment Trail", () => {
    it("should append auditable timestamped addendums to finalized records", async () => {
      const patient = await patientRepo.createPatient({
        name: "Amend Test Patient",
        age: 60,
        gender: "male",
        dateOfBirth: "1966-03-12",
        phone: "+8801711223388",
      });

      const finalized = await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-15",
        clinicalReason: "Completion of antimicrobial therapy",
        finalDiagnosis: "Enteric Fever",
        treatmentSummary: "Completed 7 days IV Ceftriaxone. Afebrile for 48 hours.",
        conditionAtDischarge: "Recovered",
        dischargeInstructions: "Maintain strict hand and food hygiene.",
        status: "finalized",
        finalizedBy: "Prof. Dr. Tashfin",
      });

      // First amendment
      const amended1 = await dischargeRepo.amendDischarge(finalized.id, {
        amendmentNotes: "Blood culture sensitivity report received: Sensitive to Azithromycin.",
        amendedBy: "Prof. Dr. Tashfin",
      });

      assert.ok(amended1.amendedAt);
      assert.equal(amended1.amendedBy, "Prof. Dr. Tashfin");
      assert.ok(amended1.amendmentNotes?.includes("Sensitive to Azithromycin"));

      // Second amendment
      const amended2 = await dischargeRepo.amendDischarge(finalized.id, {
        amendmentNotes: "Patient telephoned: rash cleared, no fever.",
        amendedBy: "Prof. Dr. Tashfin",
      });

      // Must preserve both notes in chronological order
      assert.ok(amended2.amendmentNotes?.includes("Sensitive to Azithromycin"));
      assert.ok(amended2.amendmentNotes?.includes("Patient telephoned"));
    });
  });

  describe("6. Optional Follow-Up Scheduling Integration", () => {
    it("should automatically schedule a follow-up visit when requested", async () => {
      const patient = await patientRepo.createPatient({
        name: "Followup Test Patient",
        age: 48,
        gender: "male",
        dateOfBirth: "1978-06-25",
        phone: "+8801711223399",
      });

      const discharge = await dischargeRepo.createDischarge({
        patientId: patient.id,
        dischargeDate: "2026-10-15",
        clinicalReason: "Post-operative discharge",
        finalDiagnosis: "Inguinal hernia - post Lichtenstein repair",
        treatmentSummary: "Mesh repair completed without incident. Wound healthy.",
        conditionAtDischarge: "Recovered",
        dischargeInstructions: "Avoid lifting >5kg for 6 weeks.",
        status: "finalized",
        scheduleFollowUp: true,
        recommendedFollowUpDate: "2026-10-25",
        followUpInstructions: "Routine 10-day post-discharge clinical review",
        followUpPriority: "review",
      });

      assert.ok(discharge.id);

      // Check followUp repository
      const followUps = await followUpRepo.getFollowUpsByPatient(patient.id);
      assert.equal(followUps.length, 1);
      assert.equal(followUps[0].scheduledDate, "2026-10-25");
      assert.equal(followUps[0].reason, "Routine 10-day post-discharge clinical review");
      assert.equal(followUps[0].status, "scheduled");
    });
  });

  describe("7. Clinical Workflow Isolation & Invariants", () => {
    it("should preserve existing patients, prescriptions, and consultations without conflict", async () => {
      const rxRepo = new MockPrescriptionRepository();

      // Create patient
      const patient = await patientRepo.createPatient({
        name: "Rahim Uddin",
        age: 45,
        gender: "male",
        dateOfBirth: "1981-04-12",
        phone: "+8801711000000",
      });

      // Create consultation
      const consult = await consultRepo.createConsultation({
        patientId: patient.id,
        consultationDate: "2026-10-15",
        chiefComplaint: "Abdominal pain and fever",
      });

      // Create prescription
      const rx = await rxRepo.createPrescription({
        patientId: patient.id,
        consultationId: consult.id,
        prescriptionDate: "2026-10-15",
        items: [],
        advice: "Rest and hydration",
      });

      // Create discharge
      const discharge = await dischargeRepo.createDischarge({
        patientId: patient.id,
        consultationId: consult.id,
        dischargeDate: "2026-10-15",
        clinicalReason: "Resolution of symptoms",
        finalDiagnosis: "Acute viral gastritis",
        treatmentSummary: "Hydration and symptomatic relief",
        conditionAtDischarge: "Recovered",
        dischargeInstructions: "Continue light diet",
        status: "finalized",
      });

      // Invariants check
      const verifiedPatient = await patientRepo.getPatientById(patient.id);
      assert.ok(verifiedPatient);
      assert.equal(verifiedPatient.name, "Rahim Uddin");

      const verifiedConsult = await consultRepo.getConsultationById(consult.id);
      assert.ok(verifiedConsult);

      const verifiedRx = await rxRepo.getPrescriptionById(rx.id);
      assert.ok(verifiedRx);

      const verifiedDischarges = await dischargeRepo.getDischarges({ patientId: patient.id });
      assert.equal(verifiedDischarges.length, 1);
      assert.equal(verifiedDischarges[0].id, discharge.id);
    });
  });
});
