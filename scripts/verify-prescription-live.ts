import { createServerAdminClient } from "../src/lib/supabase/server";
import { SupabasePrescriptionRepository } from "../src/lib/data/repositories/supabase-prescription-repository";
import { SupabasePatientRepository } from "../src/lib/data/repositories/supabase-patient-repository";
import { DataError } from "../src/lib/data/errors";

async function verifyLivePrescription() {
  console.log("=== LIVE SUPABASE PRESCRIPTION ENGINE VERIFICATION ===");

  const adminClient = createServerAdminClient();
  const patientRepo = new SupabasePatientRepository();
  const prescriptionRepo = new SupabasePrescriptionRepository(adminClient);

  // 1. Create synthetic patient for testing
  console.log("\n[1] Creating synthetic patient...");
  const patient = await patientRepo.createPatient({
    name: "SYNTHETIC-RX-TEST Patient",
    dateOfBirth: "1988-08-08",
    gender: "female",
    phone: "+8801899999999",
    bloodGroup: "B+",
    weight: 62,
    address: "Dhaka, Bangladesh",
  });
  console.log(`✓ Synthetic patient created: ${patient.name} (${patient.id}, ${patient.patientId})`);

  let testRxId = "";

  try {
    // 2. Create draft prescription with 2 medicine items
    console.log("\n[2] Creating draft prescription in live database...");
    const draftRx = await prescriptionRepo.createPrescription({
      patientId: patient.id,
      prescriptionDate: new Date().toISOString().split("T")[0],
      status: "draft",
      advice: "Take medication after meals. Avoid oily food.",
      followUpDate: "2026-10-26",
      followUpInstructions: "Follow up in 2 weeks for blood pressure review.",
      notes: "Initial hypertension management regimen",
      items: [
        {
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
          specialInstructions: "Take with plenty of water",
          orderIndex: 0,
        },
        {
          brandName: "Camlosart 5/50",
          genericName: "Amlodipine + Losartan Potassium",
          strength: "5 mg + 50 mg",
          dosageForm: "Tablet",
          manufacturer: "Square Pharmaceuticals PLC",
          dose: "1 tablet",
          frequency: "0+0+1",
          route: "Oral",
          duration: "30 days",
          timingInstructions: "At bedtime",
          specialInstructions: "Do not miss doses",
          orderIndex: 1,
        },
      ],
    });

    testRxId = draftRx.id;
    console.log(`✓ Draft prescription created: ${draftRx.prescriptionCode} (UUID: ${testRxId})`);
    console.log(`  Status: ${draftRx.status}, Items: ${draftRx.items.length}`);

    // 3. Retrieve prescription by ID and by patientId
    console.log("\n[3] Retrieving prescription from live database...");
    const fetchedById = await prescriptionRepo.getPrescriptionById(testRxId);
    if (!fetchedById || fetchedById.items.length !== 2) {
      throw new Error("Failed to retrieve prescription with items by ID");
    }
    console.log(`✓ Successfully retrieved by ID with ${fetchedById.items.length} items`);

    const patientPrescriptions = await prescriptionRepo.getPrescriptionsByPatientId(patient.id);
    if (patientPrescriptions.length === 0 || patientPrescriptions[0].id !== testRxId) {
      throw new Error("Failed to retrieve prescription by patientId");
    }
    console.log(`✓ Successfully retrieved via getPrescriptionsByPatientId()`);

    // 4. Update the draft prescription
    console.log("\n[4] Updating draft prescription...");
    const updated = await prescriptionRepo.updatePrescription(testRxId, {
      advice: "Updated clinical advice: Low sodium diet.",
      items: [
        {
          brandName: "Napa Extra",
          genericName: "Paracetamol + Caffeine",
          strength: "500 mg + 65 mg",
          dosageForm: "Tablet",
          dose: "1 tablet",
          frequency: "1+0+1",
          route: "Oral",
          duration: "3 days",
          timingInstructions: "After meal",
          orderIndex: 0,
        },
      ],
    });
    console.log(`✓ Updated successfully. New items count: ${updated.items.length}, advice: "${updated.advice}"`);

    // 5. Finalize the prescription
    console.log("\n[5] Finalizing prescription...");
    const finalized = await prescriptionRepo.finalizePrescription(testRxId);
    if (finalized.status !== "finalized" || !finalized.finalizedAt) {
      throw new Error("Finalization failed to set status and finalizedAt timestamp");
    }
    console.log(`✓ Finalized successfully at: ${finalized.finalizedAt}`);

    // 6. Verify that modification of finalized prescription is strictly locked
    console.log("\n[6] Verifying finalized record immutability lock...");
    let lockEnforced = false;
    try {
      await prescriptionRepo.updatePrescription(testRxId, {
        advice: "Illegal post-finalization edit attempt",
      });
    } catch (err: unknown) {
      if (err instanceof DataError && err.message.includes("Cannot modify a finalized prescription")) {
        lockEnforced = true;
        console.log(`✓ Medico-legal immutability lock verified: edit correctly rejected.`);
      } else {
        throw err;
      }
    }

    if (!lockEnforced) {
      throw new Error("Finalized prescription lock was NOT enforced!");
    }

    // 7. Verify that deletion of finalized prescription is strictly locked
    console.log("\n[7] Verifying finalized record deletion lock...");
    let deleteLockEnforced = false;
    try {
      await prescriptionRepo.deleteDraftPrescription(testRxId);
    } catch (err: unknown) {
      if (err instanceof DataError && err.message.includes("Cannot delete a finalized prescription")) {
        deleteLockEnforced = true;
        console.log(`✓ Finalized record deletion lock verified: deletion correctly rejected.`);
      } else {
        throw err;
      }
    }

    if (!deleteLockEnforced) {
      throw new Error("Finalized prescription deletion lock was NOT enforced!");
    }

    console.log("\n🎉 ALL LIVE DATABASE PERSISTENCE AND IMMUTABILITY CHECKS PASSED!");
  } finally {
    // Clean up test data safely
    console.log("\n[Cleanup] Cleaning up synthetic test records...");
    if (testRxId) {
      await adminClient.from("prescription_items").delete().eq("prescription_id", testRxId);
      await adminClient.from("prescriptions").delete().eq("id", testRxId);
    }
    await adminClient.from("patients").delete().eq("id", patient.id);
    console.log("✓ Synthetic verification records cleaned up cleanly.");
  }
}

verifyLivePrescription()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Live verification failed:", err);
    process.exit(1);
  });
