import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  MockMedicineRepository,
  MockPrescriptionRepository,
  INITIAL_MOCK_MEDICINES,
  ValidationError,
} from "../src/lib/data";
import {
  ExternalMedicineDatasetAdapter,
  ExternalMedicineProvider,
  HybridMedicineSearchService,
  HybridSearchCache,
  createPrescriptionItemSnapshot,
  saveExternalMedicineToCatalogue,
  sanitizeMedicineSearchQuery,
  MAX_SEARCH_QUERY_LENGTH,
} from "../src/lib/medicine-search";
import { GET as searchMedicinesRoute } from "../src/app/api/medicines/search/route";
import { proxy } from "../src/proxy";

describe("Phase 16: Hybrid Medicine Search Engine (Supabase + External Dataset)", () => {
  let localRepo: MockMedicineRepository;
  let prescriptionRepo: MockPrescriptionRepository;
  let cache: HybridSearchCache;

  beforeEach(() => {
    localRepo = new MockMedicineRepository(INITIAL_MOCK_MEDICINES);
    prescriptionRepo = new MockPrescriptionRepository();
    cache = new HybridSearchCache({ ttlMs: 60_000, maxEntries: 100 });
  });

  it("0. loads the verified 18,931 MedEx + 736 Square Pharma external dataset in memory", () => {
    const adapter = ExternalMedicineDatasetAdapter.getInstance();
    const stats = adapter.getStats();

    assert.equal(stats.loaded, true);
    assert.equal(stats.medexCount, 18931);
    assert.equal(stats.squareCount, 736);
    assert.equal(stats.totalRecords, 19667);
    assert.ok(stats.distinctBrands > 11000);
    assert.ok(stats.distinctGenerics > 1300);
  });

  it("1. Local Supabase result found: returns verified local catalogue items ranked first", async () => {
    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
      externalProvider: new ExternalMedicineProvider(),
    });

    const res = await service.search({
      query: "Napa",
      minLocalResultsBeforeFallback: 2,
    });

    assert.ok(res.results.length >= 2);
    assert.equal(res.externalFallbackTriggered, false);
    assert.equal(res.externalFallbackStatus, "skipped_sufficient_local");
    assert.equal(res.results[0].origin, "local");
    assert.equal(res.results[0].isExternal, false);
    assert.equal(res.results[0].sourceBadge, "Local Catalogue");
    assert.ok(res.results.some((r) => r.brandName === "Napa"));
  });

  it("2. No local match triggers external fallback and returns normalized external dataset records", async () => {
    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
      externalProvider: new ExternalMedicineProvider(),
    });

    // "1stCef" (Cefadroxil Monohydrate 500 mg) exists only in the 18,931-row external MedEx CSV
    const res = await service.search({ query: "1stCef", limit: 10 });

    assert.equal(res.localCount, 0);
    assert.equal(res.externalFallbackTriggered, true);
    assert.equal(res.externalFallbackStatus, "ok");
    assert.ok(res.externalCount >= 1);

    const first = res.results[0];
    assert.equal(first.brandName, "1stCef");
    assert.equal(first.genericName, "Cefadroxil Monohydrate");
    assert.equal(first.strength, "500 mg");
    assert.equal(first.manufacturer, "Medimet Pharmaceuticals Ltd.");
    assert.equal(first.origin, "external");
    assert.equal(first.isExternal, true);
    assert.equal(first.sourceBadge, "External MedEx BD");
    assert.equal(first.price, "৳ 12.00");
    // Must NEVER invent missing dosageForm for MedEx CSV entries
    assert.equal(first.dosageForm, undefined);
  });

  it("3. Local and external results are merged and deduplicated with local ranked first", async () => {
    const customExternal = new ExternalMedicineProvider({
      customFetcher: async () => [
        // Exact duplicate of local "Napa" (Paracetamol 500 mg)
        {
          id: "ext-dup-napa",
          brandName: "Napa",
          genericName: "Paracetamol",
          strength: "500 mg",
          manufacturer: "Beximco Pharmaceuticals Ltd.",
          medicineType: "allopathic",
          source: "medex_dataset",
          sourceId: "medex-dup-1",
          sourceName: "External Dataset",
          sourceBadge: "External MedEx BD",
          status: "active",
          origin: "external",
          isExternal: true,
        },
        // Distinct external brand with Paracetamol
        {
          id: "ext-feva",
          brandName: "Feva",
          genericName: "Paracetamol",
          strength: "500 mg",
          manufacturer: "Incepta Pharmaceuticals Ltd.",
          medicineType: "allopathic",
          source: "medex_dataset",
          sourceId: "medex-feva-1",
          sourceName: "External Dataset",
          sourceBadge: "External MedEx BD",
          status: "active",
          origin: "external",
          isExternal: true,
        },
      ],
    });

    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
      externalProvider: customExternal,
    });

    const res = await service.search({
      query: "Paracetamol",
      forceHybrid: true,
      limit: 15,
    });

    // Local matches must come first
    assert.equal(res.results[0].origin, "local");

    // Duplicate external "Napa 500 mg" must be deduplicated (only the local "Napa" 500 mg remains)
    const napa500Matches = res.results.filter(
      (r) => r.brandName === "Napa" && r.strength === "500 mg"
    );
    assert.equal(napa500Matches.length, 1);
    assert.equal(napa500Matches[0].origin, "local");

    // Unique external "Feva 500 mg" must be included after local matches
    const fevaMatch = res.results.find((r) => r.brandName === "Feva");
    assert.ok(fevaMatch);
    assert.equal(fevaMatch.origin, "external");
  });

  it("4. Similar brands with different strengths remain separate and are never collapsed", async () => {
    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
      externalProvider: new ExternalMedicineProvider(),
    });

    // In MedEx dataset, "3-C" (Cefixime Trihydrate) has 200 mg, 400 mg, and 100 mg/5 ml
    const res = await service.search({ query: "3-C", limit: 15 });

    const threeCItems = res.results.filter((r) => r.brandName === "3-C");
    assert.ok(threeCItems.length >= 3);

    const strengths = threeCItems.map((r) => r.strength);
    assert.ok(strengths.includes("200 mg"));
    assert.ok(strengths.includes("400 mg"));
    assert.ok(strengths.includes("100 mg/5 ml"));
  });

  it("5. External timeout preserves local results and reports timeout status discreetly", async () => {
    const slowExternal = new ExternalMedicineProvider({
      timeoutMs: 35,
      maxRetries: 0,
      customFetcher: async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return [];
      },
    });

    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
      externalProvider: slowExternal,
    });

    const res = await service.search({
      query: "Seclo",
      forceHybrid: true,
    });

    assert.equal(res.externalFallbackTriggered, true);
    assert.equal(res.externalFallbackStatus, "timeout");
    assert.ok(res.fallbackWarning?.includes("timed out"));
    // Local "Seclo 20" must still be returned safely!
    assert.equal(res.localCount, 1);
    assert.equal(res.results[0].brandName, "Seclo 20");
    assert.equal(res.results[0].origin, "local");
  });

  it("6. External provider failure does not crash search and preserves local results", async () => {
    const failingExternal = new ExternalMedicineProvider({
      maxRetries: 0,
      customFetcher: async () => {
        throw new Error("Simulated upstream provider 503 outage");
      },
    });

    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
      externalProvider: failingExternal,
    });

    const res = await service.search({
      query: "Maxpro",
      forceHybrid: true,
    });

    assert.equal(res.externalFallbackStatus, "error");
    assert.ok(res.fallbackWarning?.includes("temporarily unavailable"));
    assert.equal(res.localCount, 1);
    assert.equal(res.results[0].brandName, "Maxpro 20");
  });

  it("7. Empty and malformed queries are handled safely without crashing", async () => {
    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
    });

    const emptyRes = await service.search({ query: "   " });
    assert.equal(emptyRes.results.length, 0);
    assert.equal(emptyRes.externalFallbackTriggered, false);

    const malformed = sanitizeMedicineSearchQuery(
      "Napa%'; DROP TABLE medicines; -- .*[a-z]{1,99}"
    );
    assert.ok(!malformed.includes("%"));
    assert.ok(!malformed.includes(";"));
    assert.ok(!malformed.includes("["));
    assert.ok(!malformed.includes("*"));

    const overlyLong = "A".repeat(400);
    const truncated = sanitizeMedicineSearchQuery(overlyLong);
    assert.equal(truncated.length, MAX_SEARCH_QUERY_LENGTH);

    const malSearch = await service.search({
      query: "%_*?[]{}|<>~`;",
    });
    assert.equal(malSearch.results.length, 0);
  });

  it("8. Unauthorized requests to /api/medicines/search are rejected with 401", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/medicines/search?q=Napa",
      { method: "GET" }
    );

    const proxyRes = await proxy(req);
    assert.equal(proxyRes.status, 401);

    const routeRes = await searchMedicinesRoute(req);
    assert.equal(routeRes.status, 401);
    const body = await routeRes.json();
    assert.ok(body.error);
  });

  it("9. Single-flight coalescing and LRU cache prevent duplicate external requests for concurrent identical queries", async () => {
    let upstreamCallCount = 0;

    const countedProvider = new ExternalMedicineProvider({
      customFetcher: async (q) => {
        upstreamCallCount++;
        await new Promise((r) => setTimeout(r, 40));
        return ExternalMedicineDatasetAdapter.getInstance().search(q, {
          limit: 5,
        });
      },
    });

    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
      externalProvider: countedProvider,
    });

    // Fire 6 concurrent identical requests for "3Bion"
    const concurrentResponses = await Promise.all([
      service.search({ query: "3Bion" }),
      service.search({ query: "3Bion" }),
      service.search({ query: "  3bion  " }),
      service.search({ query: "3BION" }),
      service.search({ query: "3Bion" }),
      service.search({ query: "3Bion" }),
    ]);

    // Upstream external fetcher must have been called EXACTLY ONCE
    assert.equal(upstreamCallCount, 1);
    for (const r of concurrentResponses) {
      assert.ok(r.results.length >= 1);
      assert.equal(r.results[0].brandName, "3Bion");
    }

    // Subsequent sequential query hits the bounded LRU cache
    const cachedFollowUp = await service.search({ query: "3Bion" });
    assert.equal(upstreamCallCount, 1);
    assert.equal(cachedFollowUp.cacheHit, true);
  });

  it("10. Selecting an external medicine creates a safe, immutable prescription snapshot without inventing fields or inferring dose", async () => {
    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
    });

    const searchRes = await service.search({ query: "1stCef" });
    const extMed = searchRes.results[0];
    assert.ok(extMed);
    assert.equal(extMed.isExternal, true);

    const snapshot = createPrescriptionItemSnapshot(extMed, 0);

    // Must NOT set medicineId to non-UUID external ID
    assert.equal(snapshot.medicineId, undefined);
    assert.equal(snapshot.medicineSource, "external");
    assert.equal(snapshot.externalSourceId, extMed.sourceId);
    assert.equal(snapshot.brandName, "1stCef");
    assert.equal(snapshot.genericName, "Cefadroxil Monohydrate");
    assert.equal(snapshot.strength, "500 mg");
    assert.equal(snapshot.manufacturer, "Medimet Pharmaceuticals Ltd.");
    // Must not invent dosageForm if absent in source
    assert.equal(snapshot.dosageForm, undefined);
    // Must never infer clinical dose, frequency, or duration
    assert.equal(snapshot.dose, "");
    assert.equal(snapshot.frequency, "");
    assert.equal(snapshot.duration, "");
  });

  it("11. Existing prescription creation, update, and finalization work with both local and external medicine snapshots", async () => {
    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
    });

    const localSearch = await service.search({ query: "Seclo 20" });
    const extSearch = await service.search({ query: "1stCef" });

    const localItem = createPrescriptionItemSnapshot(localSearch.results[0], 0);
    localItem.frequency = "1+0+1";
    localItem.timingInstructions = "Before meal";
    localItem.duration = "14 days";

    const extItem = createPrescriptionItemSnapshot(extSearch.results[0], 1);
    extItem.dosageForm = "Capsule"; // Explicitly confirmed by clinician
    extItem.frequency = "1+0+1";
    extItem.duration = "7 days";

    const draft = await prescriptionRepo.createPrescription({
      patientId: "patient-uuid-001",
      doctorId: "dr-tashfin",
      advice: "Complete full antibiotic course.",
      items: [localItem, extItem],
    });

    assert.equal(draft.status, "draft");
    assert.equal(draft.items.length, 2);
    assert.equal(draft.items[0].brandName, "Seclo 20");
    assert.equal(draft.items[1].brandName, "1stCef");
    assert.equal(draft.items[1].medicineId, undefined);

    // Finalize prescription
    const finalized = await prescriptionRepo.finalizePrescription(draft.id);
    assert.equal(finalized.status, "finalized");
    assert.ok(finalized.finalizedAt);

    // Verify immutability lock on finalized prescription
    await assert.rejects(
      async () => {
        await prescriptionRepo.updatePrescription(finalized.id, {
          advice: "Attempted modification after finalization",
        });
      },
      (err: Error) => err.message.includes("Cannot modify a finalized prescription")
    );
  });

  it("12. No external results are silently bulk-imported into Supabase during search or prescription selection", async () => {
    const initialCount = await localRepo.getTotalMedicineCount();
    assert.equal(initialCount, INITIAL_MOCK_MEDICINES.length);

    const service = new HybridMedicineSearchService({
      localRepo,
      cache,
    });

    // Execute multiple searches returning dozens of external records
    const r1 = await service.search({ query: "Cefixime", limit: 25 });
    const r2 = await service.search({ query: "1stCef", limit: 15 });
    const r3 = await service.search({ query: "3Bion", limit: 15 });

    assert.ok(r1.externalCount > 0);
    assert.ok(r2.externalCount > 0);
    assert.ok(r3.externalCount > 0);

    // Create prescription snapshot from external result
    const snap = createPrescriptionItemSnapshot(r2.results[0], 0);
    snap.frequency = "1+0+1";
    await prescriptionRepo.createPrescription({
      patientId: "patient-uuid-002",
      items: [snap],
    });

    // Verify local medicine count is 100% unchanged!
    const countAfterSearchAndRx = await localRepo.getTotalMedicineCount();
    assert.equal(countAfterSearchAndRx, initialCount);

    // Verify explicit single-item import works ONLY when explicitly invoked and blocks duplicates
    const explicitlySaved = await saveExternalMedicineToCatalogue(
      r2.results[0],
      localRepo
    );
    assert.equal(explicitlySaved.brandName, "1stCef");
    assert.equal(await localRepo.getTotalMedicineCount(), initialCount + 1);

    await assert.rejects(
      async () => {
        await saveExternalMedicineToCatalogue(r2.results[0], localRepo);
      },
      (err: Error) =>
        err instanceof ValidationError && err.message.includes("already exists")
    );
  });
});
