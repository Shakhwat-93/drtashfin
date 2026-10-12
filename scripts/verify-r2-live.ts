import crypto from "crypto";
import { supabase } from "../src/lib/supabase/client";
import { PrescriptionArchiveService } from "../src/lib/services/prescription-archive-service";
import { deleteFromR2 } from "../src/lib/storage/r2-client";

async function runLiveVerification() {
  console.log("=== STEP 1: Setting up synthetic patient & prescription ===");

  // 1. Create synthetic patient
  const { data: patient, error: pErr } = await supabase
    .from("patients")
    .insert({
      name: "Synthetic Verification Patient",
      date_of_birth: "1988-05-10",
      age: 38,
      gender: "female",
      phone: "+8801999999999",
      blood_group: "O+",
      weight: 60,
    })
    .select()
    .single();

  if (pErr || !patient) {
    throw new Error(`Failed to create synthetic patient: ${pErr?.message}`);
  }
  console.log(`Created synthetic patient: ${patient.id} (${patient.patient_id})`);

  // 2. Create synthetic finalized prescription with items
  const { data: prescription, error: rxErr } = await supabase
    .from("prescriptions")
    .insert({
      patient_id: patient.id,
      status: "finalized",
      finalized_at: new Date().toISOString(),
      advice: "Drink plenty of water and rest.",
      follow_up_date: "2026-10-25",
    })
    .select()
    .single();

  if (rxErr || !prescription) {
    throw new Error(`Failed to create synthetic prescription: ${rxErr?.message}`);
  }
  console.log(
    `Created synthetic prescription: ${prescription.id} (${prescription.prescription_code})`
  );

  // Insert item
  const { error: itemErr } = await supabase.from("prescription_items").insert({
    prescription_id: prescription.id,
    brand_name: "Napa Extra",
    generic_name: "Paracetamol + Caffeine",
    dose: "1 tablet",
    frequency: "1+0+1",
    route: "Oral",
    duration: "5 days",
    timing_instructions: "After meal",
  });
  if (itemErr) {
    throw new Error(`Failed to create item: ${itemErr.message}`);
  }

  try {
    console.log("=== STEP 2: Archiving prescription to Cloudflare R2 ===");
    const archiveResult = await PrescriptionArchiveService.archivePrescription(
      prescription.id
    );

    console.log("Archive Result:", {
      documentId: archiveResult.document.id,
      version: archiveResult.version,
      contentHash: archiveResult.contentHash,
      r2Key: archiveResult.document.r2Key,
      fileSize: archiveResult.document.fileSizeBytes,
      isExisting: archiveResult.isExisting,
    });

    if (archiveResult.version !== 1) {
      throw new Error(`Expected version 1, got ${archiveResult.version}`);
    }
    if (!archiveResult.contentHash || archiveResult.contentHash.length !== 64) {
      throw new Error(`Invalid SHA-256 hash length: ${archiveResult.contentHash}`);
    }

    console.log("=== STEP 3: Cryptographic Integrity Verification ===");
    const verification = await PrescriptionArchiveService.verifyPrescriptionArchive(
      prescription.id
    );

    console.log("Verification Result:", {
      status: verification.status,
      matches: verification.matches,
      expectedHash: verification.expectedHash,
      actualHash: verification.actualHash,
      fileSize: verification.fileSizeBytes,
    });

    if (!verification.matches || verification.status !== "verified") {
      throw new Error(`Integrity verification failed! Status: ${verification.status}`);
    }

    console.log("=== STEP 4: Idempotency Verification ===");
    const retryArchive = await PrescriptionArchiveService.archivePrescription(
      prescription.id
    );
    console.log("Retry Archive (Idempotency):", {
      isExisting: retryArchive.isExisting,
      version: retryArchive.version,
      hash: retryArchive.contentHash,
    });

    if (!retryArchive.isExisting) {
      throw new Error("Expected idempotent archive to flag isExisting=true");
    }

    console.log("=== STEP 5: PDF Buffer Download & Local Hash Match ===");
    const pdfResult = await PrescriptionArchiveService.getPdfBuffer(prescription.id);
    const localHash = crypto
      .createHash("sha256")
      .update(pdfResult.buffer)
      .digest("hex");

    console.log("PDF Stream Check:", {
      bufferLength: pdfResult.buffer.length,
      filename: pdfResult.filename,
      isArchived: pdfResult.isArchived,
      localHash,
    });

    if (localHash.toLowerCase() !== archiveResult.contentHash.toLowerCase()) {
      throw new Error("Downloaded PDF hash does not match stored content hash!");
    }

    console.log("✅ ALL LIVE R2 & INTEGRITY CHECKS PASSED PERFECTLY!");
  } finally {
    console.log("=== STEP 6: Cleaning up synthetic records ===");
    // Clean up R2
    const docKey = `prescriptions/${patient.patient_id}/${prescription.id}/v1_${prescription.prescription_code}.pdf`;
    try {
      await deleteFromR2(docKey);
      console.log(`Deleted R2 object: ${docKey}`);
    } catch (e) {
      console.warn("Failed to delete R2 object:", e);
    }

    // Clean up Supabase
    await supabase.from("clinical_documents").delete().eq("prescription_id", prescription.id);
    await supabase.from("prescription_items").delete().eq("prescription_id", prescription.id);
    await supabase.from("prescriptions").delete().eq("id", prescription.id);
    await supabase.from("patients").delete().eq("id", patient.id);
    console.log("Deleted synthetic database records.");
  }
}

runLiveVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Live verification failed:", err);
    process.exit(1);
  });
