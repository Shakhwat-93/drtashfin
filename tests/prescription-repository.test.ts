import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getPrescriptionRepository,
  setRepositoryProvider,
  resetRepositoryInstances,
  DataError,
} from "../src/lib/data";

describe("Doctor-Controlled Prescription Repository Suite", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  test("creates a new draft prescription with medicine items and sequential code", async () => {
    const repo = getPrescriptionRepository();

    const created = await repo.createPrescription({
      patientId: "pt-uuid-001",
      consultationId: "cons-uuid-001",
      doctorId: "dr-tashfin",
      prescriptionDate: "2026-10-12",
      status: "draft",
      advice: "Drink plenty of water and avoid cold food.",
      followUpDate: "2026-10-19",
      followUpInstructions: "Review after 7 days with fever log.",
      items: [
        {
          medicineId: "med-001",
          brandName: "Napa Extra",
          genericName: "Paracetamol + Caffeine",
          strength: "500 mg + 65 mg",
          dosageForm: "Tablet",
          manufacturer: "Beximco Pharmaceuticals Ltd.",
          dose: "1 tablet",
          frequency: "1+0+1",
          route: "Oral",
          duration: "5 days",
          timingInstructions: "After meal",
          specialInstructions: "Take with a full glass of water",
          orderIndex: 0,
        },
        {
          medicineId: "med-004",
          brandName: "Seclo 20",
          genericName: "Omeprazole",
          strength: "20 mg",
          dosageForm: "Capsule",
          manufacturer: "Square Pharmaceuticals PLC",
          dose: "1 capsule",
          frequency: "1+0+1",
          route: "Oral",
          duration: "14 days",
          timingInstructions: "Before breakfast and dinner",
          orderIndex: 1,
        },
      ],
    });

    assert.ok(created.id, "Expected valid prescription ID");
    assert.ok(created.prescriptionCode.startsWith("RX-"), "Expected RX- sequence code");
    assert.equal(created.status, "draft");
    assert.equal(created.items.length, 2);
    assert.equal(created.items[0].brandName, "Napa Extra");
    assert.equal(created.items[0].frequency, "1+0+1");
    assert.equal(created.items[1].brandName, "Seclo 20");
    assert.equal(created.advice, "Drink plenty of water and avoid cold food.");
  });

  test("retrieves prescription by patientId and by consultationId", async () => {
    const repo = getPrescriptionRepository();

    await repo.createPrescription({
      patientId: "patient-123",
      consultationId: "consult-456",
      status: "draft",
      items: [
        {
          brandName: "Ace 500",
          genericName: "Paracetamol",
          frequency: "1+1+1",
          route: "Oral",
        },
      ],
    });

    const forPatient = await repo.getPrescriptionsByPatientId("patient-123");
    assert.equal(forPatient.length, 1);
    assert.equal(forPatient[0].items[0].brandName, "Ace 500");

    const forConsult = await repo.getPrescriptionByConsultationId("consult-456");
    assert.ok(forConsult);
    assert.equal(forConsult?.consultationId, "consult-456");
  });

  test("updates an existing draft prescription", async () => {
    const repo = getPrescriptionRepository();

    const initial = await repo.createPrescription({
      patientId: "pt-update-001",
      status: "draft",
      advice: "Initial advice",
      items: [
        {
          brandName: "Napa",
          genericName: "Paracetamol",
          frequency: "1+0+1",
        },
      ],
    });

    const updated = await repo.updatePrescription(initial.id, {
      advice: "Updated clinical advice with diet restrictions",
      items: [
        {
          brandName: "Napa",
          genericName: "Paracetamol",
          frequency: "1+1+1",
          duration: "3 days",
        },
        {
          brandName: "Fexo 120",
          genericName: "Fexofenadine",
          frequency: "0+0+1",
          duration: "7 days",
        },
      ],
    });

    assert.equal(updated.advice, "Updated clinical advice with diet restrictions");
    assert.equal(updated.items.length, 2);
    assert.equal(updated.items[0].frequency, "1+1+1");
    assert.equal(updated.items[1].brandName, "Fexo 120");
  });

  test("locks finalized prescription from edits to protect medico-legal integrity", async () => {
    const repo = getPrescriptionRepository();

    const draft = await repo.createPrescription({
      patientId: "pt-lock-001",
      status: "draft",
      items: [
        {
          brandName: "Zimax 500",
          genericName: "Azithromycin",
          frequency: "1+0+0",
          duration: "3 days",
        },
      ],
    });

    // Clinician finalizes prescription
    const finalized = await repo.finalizePrescription(draft.id);
    assert.equal(finalized.status, "finalized");
    assert.ok(finalized.finalizedAt);

    // Attempted edits to finalized prescription must be rejected
    await assert.rejects(
      async () => {
        await repo.updatePrescription(draft.id, {
          advice: "Attempting unauthorized modification after lock",
        });
      },
      (err: Error) => {
        return err instanceof DataError && err.message.includes("Cannot modify a finalized prescription");
      }
    );

    // Attempted deletion must be rejected
    await assert.rejects(
      async () => {
        await repo.deleteDraftPrescription(draft.id);
      },
      (err: Error) => {
        return err instanceof DataError && err.message.includes("Cannot delete a finalized prescription");
      }
    );
  });

  test("allows deleting draft prescriptions cleanly", async () => {
    const repo = getPrescriptionRepository();

    const draft = await repo.createPrescription({
      patientId: "pt-delete-001",
      status: "draft",
      items: [{ brandName: "Test Med", genericName: "Test Generic", frequency: "1+0+1" }],
    });

    const deleted = await repo.deleteDraftPrescription(draft.id);
    assert.equal(deleted, true);

    const check = await repo.getPrescriptionById(draft.id);
    assert.equal(check, null);
  });
});
