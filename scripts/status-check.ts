import { supabase } from "../src/lib/supabase/client";

async function check() {
  const [meds, rx, migrations] = await Promise.all([
    supabase.from("medicines").select("*", { count: "exact", head: true }),
    supabase.from("prescriptions").select("*", { count: "exact", head: true }),
    supabase.from("_schema_migrations").select("*"),
  ]);

  console.log("=== LIVE DATABASE VERIFICATION ===");
  console.log("Medicines count in Supabase:", meds.count);
  console.log("Prescriptions count in Supabase:", rx.count);
  console.log(
    "Applied migrations in Supabase:",
    migrations.data?.map((m) => `${m.version}: ${m.name} (${m.applied_at})`)
  );
}

check()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
