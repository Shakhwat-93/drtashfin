import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { MockPatientRepository } from "../src/lib/data/repositories/mock-patient-repository";
import { MockStorage } from "../src/lib/data/mock/mock-storage";
import {
  formatPatientId,
  parsePatientSequence,
} from "../src/lib/data/id-generator";
import {
  PatientNotFoundError,
  ValidationError,
} from "../src/lib/data/errors";

describe("Patient Repository & Data Architecture Tests", () => {
  let repository: MockPatientRepository;

  beforeEach(() => {
    // Clear storage before each test to guarantee test isolation
    MockStorage.clear();
    repository = new MockPatientRepository();
  });

  test("Initializes repository with seed dataset", async () => {
    const result = await repository.getPatients();
    assert.ok(result.total >= 8, `Expected at least 8 seed patients, got ${result.total}`);
    assert.equal(result.items.length, 10);
    assert.equal(result.page, 1);
  });

  test("Generates sequential patient IDs in PT-XXXXXX format", () => {
    assert.equal(formatPatientId(1), "PT-000001");
    assert.equal(formatPatientId(42), "PT-000042");
    assert.equal(formatPatientId(100492), "PT-100492");

    assert.equal(parsePatientSequence("PT-000001"), 1);
    assert.equal(parsePatientSequence("PT-000042"), 42);
    assert.equal(parsePatientSequence("INVALID"), 0);
  });

  test("Creates a new patient with validated schema and sequential ID", async () => {
    const newPatient = await repository.createPatient({
      name: "Dr. Gregory House",
      dateOfBirth: "1959-06-11",
      gender: "male",
      weight: 82.5,
      phone: "+1 (555) 999-0001",
      bloodGroup: "O+",
    });

    assert.ok(newPatient.id, "Patient should have internal UUID");
    assert.equal(newPatient.name, "Dr. Gregory House");
    assert.equal(newPatient.gender, "male");
    assert.equal(newPatient.patientId, "PT-000011", "Next sequence should be PT-000011");
    assert.ok(newPatient.age > 60, "Age should be computed from birth date");

    // Verify retrieval by internal ID
    const retrievedById = await repository.getPatientById(newPatient.id);
    assert.deepEqual(retrievedById, newPatient);

    // Verify retrieval by visible Patient ID
    const retrievedByPatientId = await repository.getPatientByPatientId("PT-000011");
    assert.deepEqual(retrievedByPatientId, newPatient);
  });

  test("Rejects creation with invalid data (validation check)", async () => {
    await assert.rejects(
      async () => {
        await repository.createPatient({
          name: "A", // too short (min 2 chars)
          dateOfBirth: "2099-01-01", // future date
          gender: "female",
        });
      },
      (err: unknown) => {
        return err instanceof ValidationError;
      }
    );
  });

  test("Searches patients by name, patientId, and phone case-insensitively", async () => {
    // Search by name
    const searchByName = await repository.getPatients({ search: "eleanor" });
    assert.ok(searchByName.items.some((p) => p.name.includes("Eleanor")));

    // Search by Patient ID
    const searchById = await repository.getPatients({ search: "PT-000002" });
    assert.equal(searchById.items.length, 1);
    assert.equal(searchById.items[0]?.name, "Arthur Pendelton");

    // Search by phone snippet
    const searchByPhone = await repository.getPatients({ search: "345-6789" });
    assert.equal(searchByPhone.items.length, 1);
    assert.equal(searchByPhone.items[0]?.patientId, "PT-000002");
  });

  test("Filters patients by gender", async () => {
    const femalePatients = await repository.getPatients({ gender: "female" });
    assert.ok(femalePatients.items.every((p) => p.gender === "female"));

    const malePatients = await repository.getPatients({ gender: "male" });
    assert.ok(malePatients.items.every((p) => p.gender === "male"));
  });

  test("Paginates results correctly", async () => {
    const page1 = await repository.getPatients({ page: 1, pageSize: 3 });
    assert.equal(page1.items.length, 3);
    assert.equal(page1.page, 1);
    assert.equal(page1.pageSize, 3);
    assert.equal(page1.totalPages, 4);

    const page2 = await repository.getPatients({ page: 2, pageSize: 3 });
    assert.equal(page2.items.length, 3);
    assert.equal(page2.page, 2);
    assert.notEqual(page1.items[0]?.id, page2.items[0]?.id);
  });

  test("Updates patient record and updates timestamp", async () => {
    const patients = await repository.getPatients();
    const patientToUpdate = patients.items[0]!;

    const updated = await repository.updatePatient(patientToUpdate.id, {
      name: "Eleanor Vance-Sterling",
      weight: 69.2,
    });

    assert.equal(updated.name, "Eleanor Vance-Sterling");
    assert.equal(updated.weight, 69.2);
    assert.ok(new Date(updated.updatedAt) >= new Date(patientToUpdate.updatedAt));

    const reloaded = await repository.getPatientById(patientToUpdate.id);
    assert.equal(reloaded?.name, "Eleanor Vance-Sterling");
  });

  test("Throws PatientNotFoundError when accessing or updating non-existent patient", async () => {
    await assert.rejects(
      async () => {
        await repository.updatePatient("non-existent-uuid-9999", {
          name: "Ghost Patient",
        });
      },
      (err: unknown) => {
        return err instanceof PatientNotFoundError;
      }
    );

    await assert.rejects(
      async () => {
        await repository.deletePatient("non-existent-uuid-9999");
      },
      (err: unknown) => {
        return err instanceof PatientNotFoundError;
      }
    );
  });

  test("Deletes patient successfully and decreases count", async () => {
    const initial = await repository.getTotalPatientCount();
    const list = await repository.getPatients();
    const target = list.items[list.items.length - 1]!;

    const success = await repository.deletePatient(target.id);
    assert.equal(success, true);

    const afterCount = await repository.getTotalPatientCount();
    assert.equal(afterCount, initial - 1);

    const notFound = await repository.getPatientById(target.id);
    assert.equal(notFound, null);
  });
});
