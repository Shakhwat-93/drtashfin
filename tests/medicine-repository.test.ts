import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  getMedicineRepository,
  setRepositoryProvider,
  resetRepositoryInstances,
  MockMedicineRepository,
} from "../src/lib/data";

describe("Bangladesh Medicine Repository & Fast Search Suite", () => {
  beforeEach(() => {
    setRepositoryProvider("mock");
    resetRepositoryInstances();
  });

  test("initializes with seed Bangladesh medicine catalogue", async () => {
    const repo = getMedicineRepository();
    const count = await repo.getTotalMedicineCount();
    assert.ok(count >= 10, `Expected at least 10 seed medicines, found ${count}`);
  });

  test("searches medicine by brand name (case-insensitive)", async () => {
    const repo = getMedicineRepository();
    const results = await repo.searchMedicines({ query: "napa" });

    assert.ok(results.length >= 2, "Expected multiple Napa variants");
    assert.ok(results.some((m) => m.brandName === "Napa"));
    assert.ok(results.some((m) => m.brandName === "Napa Extra"));
  });

  test("searches medicine by generic name (case-insensitive)", async () => {
    const repo = getMedicineRepository();
    const results = await repo.searchMedicines({ query: "omeprazole" });

    assert.ok(results.length >= 2, "Expected Omeprazole brands like Seclo and Losectil");
    assert.ok(
      results.every((m) =>
        m.genericName.toLowerCase().includes("omeprazole")
      )
    );
  });

  test("filters medicines by dosage form", async () => {
    const repo = getMedicineRepository();
    const results = await repo.searchMedicines({ dosageForm: "Capsule" });

    assert.ok(results.length > 0, "Expected capsule medicines");
    assert.ok(results.every((m) => m.dosageForm === "Capsule"));
  });

  test("bounds search result limit and offset pagination", async () => {
    const repo = getMedicineRepository();
    const page1 = await repo.searchMedicines({ limit: 3, offset: 0 });
    const page2 = await repo.searchMedicines({ limit: 3, offset: 3 });

    assert.equal(page1.length, 3, "Expected page 1 to have 3 items");
    assert.equal(page2.length, 3, "Expected page 2 to have 3 items");
    assert.notEqual(page1[0].id, page2[0].id, "Page 1 and Page 2 should not start with same item");
  });

  test("handles empty and no-results search queries cleanly", async () => {
    const repo = getMedicineRepository();
    const emptyResults = await repo.searchMedicines({ query: "xyznonexistentmedicine12345" });
    assert.equal(emptyResults.length, 0, "Expected empty array for non-existent medicine");

    const blankResults = await repo.searchMedicines({ query: "   " });
    assert.ok(blankResults.length > 0, "Blank query should return default catalogue items");
  });

  test("duplicate-safe upsert behavior preserves existing records without duplication", async () => {
    const repo = getMedicineRepository();
    const initialCount = await repo.getTotalMedicineCount();

    // Re-upsert Napa with updated indications
    const { inserted, updated } = await repo.upsertMedicines([
      {
        brandName: "Napa",
        genericName: "Paracetamol",
        strength: "500 mg",
        dosageForm: "Tablet",
        manufacturer: "Beximco Pharmaceuticals Ltd.",
        medicineType: "allopathic",
        source: "medex",
        sourceId: "medex-101",
        status: "active",
        indications: "Updated: Fast relief from fever and pain.",
      },
    ]);

    assert.equal(updated, 1, "Expected exactly 1 record updated");
    assert.equal(inserted, 0, "Expected 0 new records inserted");

    const newCount = await repo.getTotalMedicineCount();
    assert.equal(newCount, initialCount, "Total count should not increase on re-upsert of identical sourceId");

    const updatedMed = await repo.getMedicineBySourceId("medex-101");
    assert.equal(updatedMed?.indications, "Updated: Fast relief from fever and pain.");
  });

  test("retrieves distinct dosage forms in catalogue", async () => {
    const repo = getMedicineRepository();
    const forms = await repo.getDosageForms();

    assert.ok(forms.includes("Tablet"));
    assert.ok(forms.includes("Capsule"));
    assert.ok(forms.includes("Syrup"));
  });

  test("returns accurate pagination metadata via searchMedicinesPaginated", async () => {
    const repo = getMedicineRepository();
    const totalCount = await repo.getTotalMedicineCount();

    // Page 1 with pageSize 4
    const resPage1 = await repo.searchMedicinesPaginated({ limit: 4, offset: 0 });
    assert.equal(resPage1.medicines.length, 4);
    assert.equal(resPage1.totalCount, totalCount);
    assert.equal(resPage1.page, 1);
    assert.equal(resPage1.pageSize, 4);
    assert.equal(resPage1.totalPages, Math.ceil(totalCount / 4));

    // Page 2 with pageSize 4
    const resPage2 = await repo.searchMedicinesPaginated({ limit: 4, offset: 4 });
    assert.equal(resPage2.medicines.length, 4);
    assert.equal(resPage2.page, 2);
    assert.notEqual(resPage1.medicines[0].id, resPage2.medicines[0].id);

    // Search query with pagination
    const searchRes = await repo.searchMedicinesPaginated({ query: "paracetamol", limit: 2, offset: 0 });
    assert.ok(searchRes.totalCount >= 2, "Expected at least 2 paracetamol medicines");
    assert.equal(searchRes.medicines.length, 2);
  });
});
