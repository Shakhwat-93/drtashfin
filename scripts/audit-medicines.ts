import { supabase } from "../src/lib/supabase/client";

async function auditMedicines() {
  console.log("=== SUPABASE MEDICINE DATABASE AUDIT ===");

  // 1. Total record count
  const { count: total, error: countErr } = await supabase
    .from("medicines")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.error("Count error:", countErr);
    return;
  }

  // 2. Query all records (paged if needed, currently small)
  const { data: allMeds, error: fetchErr } = await supabase
    .from("medicines")
    .select("id, brand_name, generic_name, strength, dosage_form, manufacturer, source_id, status");

  if (fetchErr || !allMeds) {
    console.error("Fetch error:", fetchErr);
    return;
  }

  const distinctBrands = new Set(allMeds.map((m) => m.brand_name.toLowerCase().trim()));
  const distinctGenerics = new Set(allMeds.map((m) => m.generic_name.toLowerCase().trim()));
  const distinctManufacturers = new Set(
    allMeds.map((m) => m.manufacturer?.toLowerCase().trim()).filter(Boolean)
  );

  const missingStrength = allMeds.filter((m) => !m.strength || m.strength.trim() === "").length;
  const missingDosageForm = allMeds.filter((m) => !m.dosage_form || m.dosage_form.trim() === "").length;
  const missingManufacturer = allMeds.filter((m) => !m.manufacturer || m.manufacturer.trim() === "").length;
  const missingSourceId = allMeds.filter((m) => !m.source_id || m.source_id.trim() === "").length;

  console.log({
    totalRecords: total,
    fetchedRecords: allMeds.length,
    distinctBrands: distinctBrands.size,
    distinctGenerics: distinctGenerics.size,
    distinctManufacturers: distinctManufacturers.size,
    missingStrength,
    missingDosageForm,
    missingManufacturer,
    missingSourceId,
  });

  // 3. Check for any duplicate source_ids or identical (brand, generic, strength, dosage_form)
  const sourceIdCounts = new Map<string, number>();
  for (const m of allMeds) {
    if (m.source_id) {
      sourceIdCounts.set(m.source_id, (sourceIdCounts.get(m.source_id) || 0) + 1);
    }
  }
  const duplicateSourceIds = Array.from(sourceIdCounts.entries()).filter(([_, count]) => count > 1);

  console.log({
    duplicateSourceIdsCount: duplicateSourceIds.length,
    duplicateSourceIds,
  });

  // 4. Sample 5 records
  console.log("\nSample 5 records in database:");
  console.table(
    allMeds.slice(0, 5).map((m) => ({
      brand: m.brand_name,
      generic: m.generic_name,
      strength: m.strength,
      form: m.dosage_form,
      manufacturer: m.manufacturer,
      sourceId: m.source_id,
    }))
  );
}

auditMedicines()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Audit failed:", err);
    process.exit(1);
  });
