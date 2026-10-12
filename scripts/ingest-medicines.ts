import { BANGLADESH_MEDICINE_CATALOGUE } from "../src/lib/data/seeds/bangladesh-medicines";
import { SupabaseMedicineRepository } from "../src/lib/data/repositories/supabase-medicine-repository";
import { createServerAdminClient } from "../src/lib/supabase/server";

async function ingestBangladeshMedicines() {
  console.log("=== INGESTING BANGLADESH MEDICINE CATALOGUE ===");
  console.log("Target Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

  const adminClient = createServerAdminClient();
  const repo = new SupabaseMedicineRepository(adminClient);

  console.log(`Found ${BANGLADESH_MEDICINE_CATALOGUE.length} verified medicine records to ingest.`);

  // 1. Batch upsert
  const { inserted } = await repo.upsertMedicines(BANGLADESH_MEDICINE_CATALOGUE);
  console.log(`✓ Processed ${inserted} records into Supabase medicines table.`);

  // 2. Verify total count
  const total = await repo.getTotalMedicineCount();
  console.log(`✓ Verified total catalogue medicines in Supabase: ${total}`);

  // 3. Test sample searches
  console.log("\n[Verification 1] Testing Brand Search: 'Napa'...");
  const napaResults = await repo.searchMedicines({ query: "Napa" });
  console.log(
    `✓ Found ${napaResults.length} records matching 'Napa':`,
    napaResults.map((m) => `${m.brandName} (${m.strength}) [${m.dosageForm}]`)
  );

  console.log("\n[Verification 2] Testing Generic Search: 'Omeprazole'...");
  const omeprazoleResults = await repo.searchMedicines({ query: "Omeprazole" });
  console.log(
    `✓ Found ${omeprazoleResults.length} records matching 'Omeprazole':`,
    omeprazoleResults.map((m) => `${m.brandName} by ${m.manufacturer}`)
  );

  console.log("\n[Verification 3] Testing Filter by Dosage Form: 'Syrup'...");
  const syrupResults = await repo.searchMedicines({ dosageForm: "Syrup" });
  console.log(
    `✓ Found ${syrupResults.length} syrup products:`,
    syrupResults.map((m) => `${m.brandName} - ${m.genericName}`)
  );

  console.log("\n🎉 MEDICINE CATALOGUE INGESTION & SEARCH VERIFICATION COMPLETE!");
}

ingestBangladeshMedicines()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Ingestion failed:", err);
    process.exit(1);
  });
