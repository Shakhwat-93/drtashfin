import test from "node:test";
import assert from "node:assert/strict";
import { MockPatientRepository } from "../src/lib/data/repositories/mock-patient-repository";
import { MockStorage } from "../src/lib/data/mock/mock-storage";

test("Patient Workflow Suite", async (t) => {
  // Clear mock storage before tests
  MockStorage.clear();
  const repo = new MockPatientRepository();

  await t.test("resolve patient by both human ID and internal UUID", async () => {
    const p1 = await repo.getPatientByIdentifier("PT-000001");
    assert.ok(p1, "Should find patient by PT-000001");
    assert.strictEqual(p1.patientId, "PT-000001");

    const pByUUID = await repo.getPatientByIdentifier(p1.id);
    assert.ok(pByUUID, "Should find patient by UUID");
    assert.strictEqual(pByUUID.id, p1.id);
    assert.strictEqual(pByUUID.patientId, "PT-000001");

    // Case-insensitive check
    const pLower = await repo.getPatientByIdentifier("pt-000001");
    assert.ok(pLower, "Should find patient case-insensitively");

    const nonexistent = await repo.getPatientByIdentifier("PT-999999");
    assert.strictEqual(nonexistent, null);
  });

  await t.test("search filter supports date of birth", async () => {
    // Eleanor Vance was born in 1972
    const res = await repo.getPatients({ search: "1972" });
    assert.ok(res.items.length > 0, "Should find at least 1 patient born in 1972");
    assert.ok(
      res.items.some((p) => p.dateOfBirth.includes("1972")),
      "Result should have dateOfBirth containing 1972"
    );
  });

  await t.test("search filter matches phone numbers", async () => {
    // Eleanor Vance phone: +1 (555) 234-5678
    const res = await repo.getPatients({ search: "234-5678" });
    assert.ok(res.items.length >= 1, "Should find patient with phone containing 234-5678");
    assert.strictEqual(res.items[0]?.patientId, "PT-000001");
  });

  await t.test("duplicate detection flags matching phone numbers", async () => {
    // Phone from seed data: +1 (555) 234-5678
    const duplicate = await repo.checkPotentialDuplicate(
      "Different Name",
      "555-234-5678"
    );
    assert.ok(duplicate, "Should detect duplicate phone number");
    assert.strictEqual(duplicate?.patientId, "PT-000001");
  });

  await t.test("duplicate detection flags matching exact name", async () => {
    const duplicate = await repo.checkPotentialDuplicate(
      "Arthur Pendelton",
      "+1 (999) 000-0000"
    );
    assert.ok(duplicate, "Should detect duplicate exact name");
    assert.strictEqual(duplicate?.patientId, "PT-000002");
  });

  await t.test("update patient profile updates fields and recalculates age", async () => {
    const p1 = await repo.getPatientByIdentifier("PT-000001");
    assert.ok(p1);

    const updated = await repo.updatePatient(p1.id, {
      name: "Eleanor Vance Updated",
      weight: 82.5,
      dateOfBirth: "1980-01-01",
    });

    assert.strictEqual(updated.name, "Eleanor Vance Updated");
    assert.strictEqual(updated.weight, 82.5);
    assert.strictEqual(updated.dateOfBirth, "1980-01-01");
    assert.ok(updated.age > 40, "Age should be recalculated from 1980 birth year");

    // Verify retrieval reflects the updated record
    const reloaded = await repo.getPatientByIdentifier("PT-000001");
    assert.strictEqual(reloaded?.name, "Eleanor Vance Updated");
  });

  await t.test("gender filter limits results accurately", async () => {
    const femaleRes = await repo.getPatients({ gender: "female", pageSize: 50 });
    assert.ok(femaleRes.items.length > 0);
    assert.ok(
      femaleRes.items.every((p) => p.gender === "female"),
      "All returned patients should be female"
    );

    const maleRes = await repo.getPatients({ gender: "male", pageSize: 50 });
    assert.ok(maleRes.items.length > 0);
    assert.ok(
      maleRes.items.every((p) => p.gender === "male"),
      "All returned patients should be male"
    );
  });
});
