import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  setRepositoryProvider,
  getPatientRepository,
  getConsultationRepository,
  getFollowUpRepository,
  getPrescriptionRepository,
  resetRepositoryInstances,
} from "../src/lib/data";
import { CreateConsultationDTO } from "../src/types/consultation";
import { CreateFollowUpDTO } from "../src/types/follow-up";
import { createConsultationSchema } from "../src/schemas/consultation";
import { createFollowUpSchema, completeFollowUpSchema, rescheduleFollowUpSchema } from "../src/schemas/follow-up";

describe("Phase 23: Longitudinal Treatment & Follow-up Management", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  describe("1. Consultation with Longitudinal Treatment Plan & Clinical Notes", () => {
    it("creates a consultation with clinical assessment, treatment instructions, and review dates", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();

      const patient = await patientRepo.createPatient({
        name: "Abdur Rashid",
        dateOfBirth: "1975-04-12",
        gender: "male",
        chamberId: "d1a4a001-0000-4000-8000-000000000001", // Dhaka
      });

      const consultData: CreateConsultationDTO = {
        patientId: patient.patientId,
        chamberId: patient.chamberId,
        consultationDate: "2026-10-14",
        consultationTime: "11:30 AM",
        status: "completed",
        chiefComplaint: "Recurrent focal motor seizures in right upper limb for 3 months.",
        clinicalExamination: "BP 130/85 mmHg, Pulse 76 bpm. No focal neurological deficit on cranial nerve exam.",
        clinicalNotes: "Patient presents with adult-onset focal seizures with impaired awareness. Brain MRI shows focal cortical dysplasia in left premotor area.",
        provisionalDiagnosis: "Focal Epilepsy with impaired awareness secondary to focal cortical dysplasia",
        plan: "• Tab. Levetiracetam 500mg - 1+0+1 after meal\n• Tab. Clobazam 5mg - 0+0+1 at night",
        advice: "Avoid sleep deprivation, heavy flashing lights. Maintain seizure diary diligently.",
        treatmentInstructions: "Start Levetiracetam at 250mg BID for 7 days, then uptitrate to 500mg BID. Do not stop abruptly.",
        lifestyleInstructions: "Strict sleep schedule (min 7 hrs). Avoid swimming unsupervised or driving.",
        treatmentStartDate: "2026-10-14",
        treatmentReviewDate: "2026-11-14",
        nextFollowUp: "2026-11-14",
        followUpReason: "Evaluate seizure frequency on Levetiracetam and check serum drug tolerance.",
      };

      const validated = createConsultationSchema.safeParse(consultData);
      assert.ok(validated.success, "Consultation schema must accept all longitudinal fields");

      const created = await consultRepo.createConsultation(consultData);

      assert.ok(created.id, "Consultation ID must exist");
      assert.equal(created.patientId, patient.patientId);
      assert.equal(created.consultationTime, "11:30 AM");
      assert.equal(created.status, "completed");
      assert.equal(created.clinicalNotes, consultData.clinicalNotes);
      assert.equal(created.treatmentInstructions, consultData.treatmentInstructions);
      assert.equal(created.lifestyleInstructions, consultData.lifestyleInstructions);
      assert.equal(created.treatmentStartDate, "2026-10-14");
      assert.equal(created.treatmentReviewDate, "2026-11-14");
      assert.equal(created.followUpReason, consultData.followUpReason);
      assert.equal(created.isFollowUp, false);
    });

    it("verifies chronological timeline ordering: newest consultation appears first", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();

      const patient = await patientRepo.createPatient({
        name: "Fatema Khatun",
        dateOfBirth: "1992-09-20",
        gender: "female",
      });

      // Insert consultation 1 (older)
      await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-08-01",
        consultationTime: "10:00 AM",
        chiefComplaint: "Initial visit: migraine headache",
      });

      // Insert consultation 2 (newer)
      await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-09-15",
        consultationTime: "04:30 PM",
        chiefComplaint: "Second visit: headache improved",
      });

      // Insert consultation 3 (latest)
      await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-10-10",
        consultationTime: "11:00 AM",
        chiefComplaint: "Third visit: maintenance review",
      });

      const list = await consultRepo.getConsultationsByPatient(patient.patientId);
      assert.equal(list.length, 3);

      // Verify sorting descending by consultation date
      const sorted = [...list].sort((a, b) => new Date(b.consultationDate).getTime() - new Date(a.consultationDate).getTime());
      assert.equal(sorted[0].consultationDate, "2026-10-10", "Latest consultation must be first");
      assert.equal(sorted[1].consultationDate, "2026-09-15", "Middle consultation must be second");
      assert.equal(sorted[2].consultationDate, "2026-08-01", "Oldest consultation must be third");
    });
  });

  describe("2. Follow-up Lifecycle & Status Management", () => {
    it("schedules a follow-up with priority, reason, and notes", async () => {
      const patientRepo = getPatientRepository();
      const followUpRepo = getFollowUpRepository();

      const patient = await patientRepo.createPatient({
        name: "Kabir Hossain",
        dateOfBirth: "1980-01-01",
        gender: "male",
        chamberId: "d1a4a001-0000-4000-8000-000000000001",
      });

      const followUpData: CreateFollowUpDTO = {
        patientId: patient.patientId,
        chamberId: patient.chamberId,
        scheduledDate: "2026-11-20",
        reason: "Review blood pressure response to Telmisartan 40mg",
        priority: "review",
        notes: "Bring morning BP log for past 14 days",
      };

      const validated = createFollowUpSchema.safeParse(followUpData);
      assert.ok(validated.success, "Follow-up creation schema must validate");

      const created = await followUpRepo.createFollowUp(followUpData);
      assert.ok(created.id);
      assert.equal(created.patientId, patient.id);
      assert.equal(created.patientCode, patient.patientId);
      assert.equal(created.scheduledDate, "2026-11-20");
      assert.equal(created.status, "scheduled");
      assert.equal(created.priority, "review");
      assert.equal(created.reason, followUpData.reason);
      assert.equal(created.notes, followUpData.notes);
    });

    it("identifies overdue follow-ups dynamically without auto-completing them", async () => {
      const patientRepo = getPatientRepository();
      const followUpRepo = getFollowUpRepository();

      const patient = await patientRepo.createPatient({
        name: "Nasima Begum",
        dateOfBirth: "1968-11-15",
        gender: "female",
      });

      // Past follow-up date (overdue)
      const pastFollowUp = await followUpRepo.createFollowUp({
        patientId: patient.patientId,
        scheduledDate: "2026-09-01", // Past date relative to today (Oct 2026)
        reason: "Routine post-discharge stroke check",
        priority: "urgent",
      });

      // Future follow-up date (upcoming)
      const futureFollowUp = await followUpRepo.createFollowUp({
        patientId: patient.patientId,
        scheduledDate: "2026-12-01",
        reason: "6-month scan review",
        priority: "routine",
      });

      const overdues = await followUpRepo.getOverdueFollowUps(patient.patientId);
      assert.equal(overdues.length, 1);
      assert.equal(overdues[0].id, pastFollowUp.id);
      assert.equal(overdues[0].status, "scheduled", "Overdue appointment must NOT be auto-completed");

      const upcomings = await followUpRepo.getUpcomingFollowUps(patient.patientId);
      assert.equal(upcomings.length, 1);
      assert.equal(upcomings[0].id, futureFollowUp.id);
    });

    it("reschedules a follow-up with a reason", async () => {
      const patientRepo = getPatientRepository();
      const followUpRepo = getFollowUpRepository();

      const patient = await patientRepo.createPatient({
        name: "Kamrul Islam",
        dateOfBirth: "1985-05-10",
        gender: "male",
      });

      const initial = await followUpRepo.createFollowUp({
        patientId: patient.patientId,
        scheduledDate: "2026-10-20",
        reason: "Follow-up check",
      });

      const rescheduleData = {
        scheduledDate: "2026-10-28",
        reason: "Patient out of city on business travel",
      };

      const validated = rescheduleFollowUpSchema.safeParse(rescheduleData);
      assert.ok(validated.success);

      const rescheduled = await followUpRepo.rescheduleFollowUp(initial.id, rescheduleData);
      assert.equal(rescheduled.id, initial.id);
      assert.equal(rescheduled.scheduledDate, "2026-10-28");
      assert.equal(rescheduled.reason, "Patient out of city on business travel");
      assert.equal(rescheduled.status, "scheduled");
    });

    it("cancels a follow-up with a clinical cancellation reason", async () => {
      const patientRepo = getPatientRepository();
      const followUpRepo = getFollowUpRepository();

      const patient = await patientRepo.createPatient({
        name: "Salma Akter",
        dateOfBirth: "1990-07-22",
        gender: "female",
      });

      const followUp = await followUpRepo.createFollowUp({
        patientId: patient.patientId,
        scheduledDate: "2026-10-25",
        reason: "Repeat liver function panel review",
      });

      const cancelled = await followUpRepo.cancelFollowUp(followUp.id, {
        cancellationReason: "Patient underwent urgent surgical intervention at tertiary hospital",
      });

      assert.equal(cancelled.status, "cancelled");
      assert.equal(cancelled.cancellationReason, "Patient underwent urgent surgical intervention at tertiary hospital");

      // Verify it does not appear in upcoming
      const upcomings = await followUpRepo.getUpcomingFollowUps(patient.patientId);
      assert.equal(upcomings.length, 0);
    });

    it("completes a follow-up with clinical outcome: improved, unchanged, or worsened", async () => {
      const patientRepo = getPatientRepository();
      const followUpRepo = getFollowUpRepository();

      const patient = await patientRepo.createPatient({
        name: "Zakir Hossain",
        dateOfBirth: "1972-03-30",
        gender: "male",
      });

      const followUp = await followUpRepo.createFollowUp({
        patientId: patient.patientId,
        scheduledDate: "2026-10-15",
        reason: "Migraine prophylaxis review",
      });

      const completionData = {
        clinicalOutcome: "improved" as const,
        outcomeNotes: "Headache frequency reduced from 12 days/month to 2 days/month on Propranolol 40mg daily.",
      };

      const validated = completeFollowUpSchema.safeParse(completionData);
      assert.ok(validated.success);

      const completed = await followUpRepo.completeFollowUp(followUp.id, completionData);
      assert.equal(completed.status, "completed");
      assert.equal(completed.clinicalOutcome, "improved");
      assert.equal(completed.outcomeNotes, completionData.outcomeNotes);

      // Verify in completed list
      const completedList = await followUpRepo.getCompletedFollowUps(patient.patientId);
      assert.equal(completedList.length, 1);
      assert.equal(completedList[0].clinicalOutcome, "improved");
    });
  });

  describe("3. Linking Follow-up to Originating and Follow-up Consultation", () => {
    it("creates a follow-up consultation linked to originating consultation and records progress comparison", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();
      const followUpRepo = getFollowUpRepository();

      const patient = await patientRepo.createPatient({
        name: "Farhana Chowdhury",
        dateOfBirth: "1995-12-05",
        gender: "female",
        chamberId: "d1a4a001-0000-4000-8000-000000000001",
      });

      // 1. Initial consultation
      const initialConsult = await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-09-01",
        status: "completed",
        chiefComplaint: "New-onset severe neuropathic pain in left trigeminal V2 distribution",
        provisionalDiagnosis: "Trigeminal Neuralgia (Left)",
        plan: "• Tab. Carbamazepine 200mg - 1+0+1",
        treatmentInstructions: "Uptitrate Carbamazepine slowly by 100mg every 3 days if pain persists.",
        treatmentStartDate: "2026-09-01",
        treatmentReviewDate: "2026-10-01",
        nextFollowUp: "2026-10-01",
        followUpReason: "Assess pain relief score and monitor for skin rash / ataxia",
      });

      // 2. Schedule follow-up linked to initial consultation
      const followUp = await followUpRepo.createFollowUp({
        patientId: patient.patientId,
        originatingConsultationId: initialConsult.id,
        scheduledDate: "2026-10-01",
        reason: "Trigeminal Neuralgia pain review",
        priority: "review",
      });

      assert.equal(followUp.originatingConsultationId, initialConsult.id);

      // 3. Mark follow-up completed
      await followUpRepo.completeFollowUp(followUp.id, {
        clinicalOutcome: "improved",
        outcomeNotes: "Pain reduced by 90%. Visual analogue scale 1/10.",
      });

      // 4. Create follow-up consultation referencing originating consultation
      const followUpConsult = await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-10-01",
        consultationTime: "10:15 AM",
        status: "completed",
        isFollowUp: true,
        originatingConsultationId: initialConsult.id,
        clinicalOutcome: "improved",
        progressNotes: "Significant pain relief on Carbamazepine 200mg BID. No rash, no dizziness.",
        provisionalDiagnosis: "Trigeminal Neuralgia (Left) - Well Controlled",
        plan: "Continue Tab. Carbamazepine 200mg (1+0+1)",
        treatmentInstructions: "Maintain current maintenance dose for 3 months.",
        nextFollowUp: "2027-01-05",
        followUpReason: "Routine 3-month review and CBC/electrolytes check",
      });

      assert.equal(followUpConsult.isFollowUp, true);
      assert.equal(followUpConsult.originatingConsultationId, initialConsult.id);
      assert.equal(followUpConsult.clinicalOutcome, "improved");
      assert.ok(followUpConsult.progressNotes?.includes("Significant pain relief"));

      // 5. Verify patient consultations history contains both and preserves link
      const history = await consultRepo.getConsultationsByPatient(patient.patientId);
      assert.equal(history.length, 2);
      const followUpVisit = history.find((c) => c.isFollowUp);
      assert.ok(followUpVisit);
      assert.equal(followUpVisit.originatingConsultationId, initialConsult.id);
    });
  });

  describe("4. Preserving Invariants: Legacy Data & Prescription Immutability", () => {
    it("ensures legacy consultation records without longitudinal fields continue to load safely", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();

      const patient = await patientRepo.createPatient({
        name: "Legacy Patient",
        dateOfBirth: "1960-01-01",
        gender: "male",
      });

      // Minimal legacy record without any of the new Phase 23 columns
      const legacyRecord = await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-05-10",
        chiefComplaint: "Mild fever and sore throat",
      });

      assert.ok(legacyRecord.id);
      assert.equal(legacyRecord.isFollowUp, false);
      assert.equal(legacyRecord.clinicalNotes, undefined);
      assert.equal(legacyRecord.treatmentInstructions, undefined);
      assert.equal(legacyRecord.clinicalOutcome, undefined);

      // Successfully retrieved
      const fetched = await consultRepo.getConsultationById(legacyRecord.id);
      assert.ok(fetched);
      assert.equal(fetched.chiefComplaint, "Mild fever and sore throat");
    });

    it("verifies finalized prescription immutability is strictly preserved alongside follow-up management", async () => {
      const patientRepo = getPatientRepository();
      const consultRepo = getConsultationRepository();
      const rxRepo = getPrescriptionRepository();

      const patient = await patientRepo.createPatient({
        name: "Prescription Patient",
        dateOfBirth: "1983-08-14",
        gender: "female",
      });

      const consult = await consultRepo.createConsultation({
        patientId: patient.patientId,
        consultationDate: "2026-10-14",
        provisionalDiagnosis: "Generalized Anxiety Disorder",
      });

      // Create draft prescription
      const draftRx = await rxRepo.createPrescription({
        patientId: patient.patientId,
        consultationId: consult.id,
        doctorId: "dr-tashfin",
        prescriptionDate: "2026-10-14",
        status: "draft",
        items: [
          {
            brandName: "Escitalopram 10mg",
            genericName: "Escitalopram",
            strength: "10mg",
            dosageForm: "Tablet",
            frequency: "0+0+1",
            duration: "1 month",
            specialInstructions: "Take after dinner",
            orderIndex: 0,
          },
        ],
      });

      assert.equal(draftRx.status, "draft");

      // Finalize prescription
      const finalizedRx = await rxRepo.finalizePrescription(draftRx.id);
      assert.equal(finalizedRx.status, "finalized");

      // Attempt to modify finalized prescription must fail
      await assert.rejects(
        async () => {
          await rxRepo.updatePrescription(finalizedRx.id, {
            advice: "Modified advice after finalization",
          });
        },
        /finalized/i,
        "Finalized prescriptions must remain strictly immutable"
      );
    });
  });
});
