import test from "node:test";
import assert from "node:assert/strict";
import { MockStorage } from "../src/lib/data/mock/mock-storage";
import { MockPatientRepository } from "../src/lib/data/repositories/mock-patient-repository";
import { MockConsultationRepository } from "../src/lib/data/repositories/mock-consultation-repository";
import { PatientNotFoundError, ValidationError } from "../src/lib/data/errors";

test("Consultation Clinical Records Suite", async (t) => {
  MockStorage.clear();
  const patientRepo = new MockPatientRepository();
  const consultationRepo = new MockConsultationRepository(patientRepo);

  await t.test("initializes with seed consultations", async () => {
    const count = await consultationRepo.getTotalConsultationCount();
    assert.ok(count >= 3, "Should have seed consultations");

    const pt1Consultations = await consultationRepo.getConsultationsByPatient(
      "PT-000001"
    );
    assert.ok(
      pt1Consultations.length >= 2,
      "PT-000001 should have at least 2 historical consultations"
    );
  });

  await t.test("returns consultations in reverse chronological order (newest first)", async () => {
    const list = await consultationRepo.getConsultationsByPatient("PT-000001");
    assert.ok(list.length >= 2);

    for (let i = 0; i < list.length - 1; i++) {
      const current = new Date(list[i]!.consultationDate).getTime();
      const next = new Date(list[i + 1]!.consultationDate).getTime();
      assert.ok(
        current >= next,
        `Consultation at index ${i} (${list[i]!.consultationDate}) must be >= index ${i + 1} (${list[i + 1]!.consultationDate})`
      );
    }
  });

  await t.test("creates a new consultation linked to an existing patient", async () => {
    const patient = await patientRepo.getPatientByIdentifier("PT-000001");
    assert.ok(patient);

    const prevPatientUpdated = patient.updatedAt;

    const created = await consultationRepo.createConsultation({
      patientId: patient.patientId,
      consultationDate: "2026-09-20",
      chiefComplaint: "Severe migraine and photophobia for 3 days.",
      consanguinity: "no",
      provisionalDiagnosis: "Acute Migraine without aura",
      plan: "Prescribe Sumatriptan 50mg PRN. Adequate sleep hygiene.",
      nextFollowUp: "2026-09-27",
    });

    assert.ok(created.id, "Should generate a unique ID");
    assert.strictEqual(created.patientId, "PT-000001");
    assert.strictEqual(created.consultationDate, "2026-09-20");
    assert.strictEqual(created.consanguinity, "no");
    assert.strictEqual(created.provisionalDiagnosis, "Acute Migraine without aura");
    assert.strictEqual(created.nextFollowUp, "2026-09-27");
    assert.ok(created.createdAt);
    assert.ok(created.updatedAt);

    // Patient's updatedAt should have been updated
    const reloadedPatient = await patientRepo.getPatientByIdentifier("PT-000001");
    assert.ok(reloadedPatient);
    assert.ok(
      new Date(reloadedPatient.updatedAt).getTime() >=
        new Date(prevPatientUpdated).getTime()
    );
  });

  await t.test("historical record immutability: new consultation never overwrites past records", async () => {
    const patient = await patientRepo.getPatientByIdentifier("PT-000001");
    assert.ok(patient);

    const historyBefore = await consultationRepo.getConsultationsByPatient(
      patient.patientId
    );
    const initialCount = historyBefore.length;

    // Create another consultation
    const newRecord = await consultationRepo.createConsultation({
      patientId: patient.patientId,
      consultationDate: "2026-09-21",
      chiefComplaint: "Routine follow-up, headache completely resolved.",
      provisionalDiagnosis: "Migraine in remission",
    });

    const historyAfter = await consultationRepo.getConsultationsByPatient(
      patient.patientId
    );
    assert.strictEqual(historyAfter.length, initialCount + 1);

    // Newest consultation appears at index 0
    assert.strictEqual(historyAfter[0]!.id, newRecord.id);
    assert.strictEqual(historyAfter[0]!.consultationDate, "2026-09-21");

    // Previous consultations are still fully intact
    const prevExists = historyAfter.some(
      (c) => c.chiefComplaint === "Severe migraine and photophobia for 3 days."
    );
    assert.ok(prevExists, "Previous consultation must still exist");
  });

  await t.test("rejects consultation creation referencing non-existent patient", async () => {
    await assert.rejects(
      async () => {
        await consultationRepo.createConsultation({
          patientId: "PT-NONEXISTENT",
          consultationDate: "2026-09-20",
          chiefComplaint: "Test",
        });
      },
      (err: unknown) => {
        return err instanceof PatientNotFoundError;
      }
    );
  });

  await t.test("rejects consultation with invalid date format", async () => {
    await assert.rejects(
      async () => {
        await consultationRepo.createConsultation({
          patientId: "PT-000001",
          consultationDate: "invalid-date",
        });
      },
      (err: unknown) => {
        return err instanceof ValidationError;
      }
    );
  });

  await t.test("updates an existing consultation preserving id and createdAt", async () => {
    const history = await consultationRepo.getConsultationsByPatient("PT-000001");
    const target = history[0]!;

    const originalId = target.id;
    const originalCreatedAt = target.createdAt;

    const updated = await consultationRepo.updateConsultation(target.id, {
      provisionalDiagnosis: "Updated Diagnosis Title",
      advice: "Take medication after meals.",
    });

    assert.strictEqual(updated.id, originalId);
    assert.strictEqual(updated.createdAt, originalCreatedAt);
    assert.strictEqual(updated.provisionalDiagnosis, "Updated Diagnosis Title");
    assert.strictEqual(updated.advice, "Take medication after meals.");
    assert.ok(
      new Date(updated.updatedAt).getTime() >= new Date(target.updatedAt).getTime()
    );

    // Verify retrieval by ID
    const retrieved = await consultationRepo.getConsultationById(target.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.provisionalDiagnosis, "Updated Diagnosis Title");
  });
});
