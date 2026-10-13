import {
  Medicine,
  UnifiedMedicineSearchResult,
} from "@/types/medicine";
import { CreatePrescriptionItemDTO } from "@/types/prescription";
import { isValidUUID } from "@/lib/security/api-security";
import { IMedicineRepository } from "@/lib/data";
import { ValidationError } from "@/lib/data/errors";

/**
 * Creates a safe, immutable prescription item snapshot from a local or external medicine.
 *
 * Clinical Safety Guardrails:
 * 1. NEVER persists external medicines automatically into public.medicines.
 * 2. Only assigns medicineId if the medicine has a valid UUID from the local database.
 * 3. NEVER infers patient-specific dose, frequency, or duration from the medicine name.
 * 4. Preserves external sourceId and provenance metadata for clinical audit trails.
 */
export function createPrescriptionItemSnapshot(
  medicine: UnifiedMedicineSearchResult | Medicine,
  orderIndex: number = 0
): CreatePrescriptionItemDTO {
  const brandName = medicine.brandName?.trim() || "";
  const genericName = medicine.genericName?.trim() || "";

  if (!brandName) {
    throw new ValidationError("Cannot create prescription item snapshot: brandName is missing.");
  }
  if (!genericName) {
    throw new ValidationError("Cannot create prescription item snapshot: genericName is missing.");
  }

  const isExternal =
    Boolean((medicine as UnifiedMedicineSearchResult).isExternal) ||
    (medicine as UnifiedMedicineSearchResult).origin === "external" ||
    !isValidUUID(medicine.id);

  // Determine route default safely from dosageForm
  const formLower = (medicine.dosageForm || "").toLowerCase();
  let defaultRoute = "Oral";
  if (formLower.includes("drop")) defaultRoute = "Eye Drop";
  else if (formLower.includes("cream") || formLower.includes("ointment"))
    defaultRoute = "Topical";
  else if (formLower.includes("inhaler") || formLower.includes("spray"))
    defaultRoute = "Inhalation";
  else if (formLower.includes("injection") || formLower.includes("infusion"))
    defaultRoute = "IV";

  return {
    // Only local catalogue UUIDs populate medicineId for DB relational integrity
    medicineId: !isExternal && isValidUUID(medicine.id) ? medicine.id : undefined,
    brandName,
    genericName,
    strength: medicine.strength?.trim() || undefined,
    dosageForm: medicine.dosageForm?.trim() || undefined,
    manufacturer: medicine.manufacturer?.trim() || undefined,

    // Clinician must explicitly confirm regimen (never auto-inferred!)
    dose: "",
    frequency: "",
    route: defaultRoute,
    duration: "",
    timingInstructions: "After meal",
    specialInstructions: "",
    orderIndex,

    // Provenance metadata
    medicineSource: isExternal ? "external" : "local",
    externalSourceId: medicine.sourceId,
  };
}

/**
 * Validates a prescription item snapshot before saving to database.
 */
export function validatePrescriptionItemSnapshot(
  item: CreatePrescriptionItemDTO
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!item.brandName || !item.brandName.trim()) {
    errors.push("Brand name is required.");
  }
  if (!item.genericName || !item.genericName.trim()) {
    errors.push("Generic name is required.");
  }
  if (!item.frequency || !item.frequency.trim()) {
    errors.push(
      `Prescribed medication "${item.brandName || "Item"}" requires clinician-confirmed frequency (e.g. 1+0+1).`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Controlled, explicit doctor operation to import a single verified external
 * medicine into the local catalogue.
 * Strictly prevents silent automatic bulk imports.
 */
export async function saveExternalMedicineToCatalogue(
  externalMed: UnifiedMedicineSearchResult,
  repo: IMedicineRepository
): Promise<Medicine> {
  const brand = externalMed.brandName.trim();
  const generic = externalMed.genericName.trim();
  const strength = externalMed.strength?.trim() || undefined;

  // Check for duplicate in local repository
  const existingMatches = await repo.searchMedicines({
    query: brand,
    limit: 10,
  });

  const duplicate = existingMatches.find(
    (m) =>
      m.brandName.toLowerCase() === brand.toLowerCase() &&
      m.genericName.toLowerCase() === generic.toLowerCase() &&
      (m.strength || "").toLowerCase() === (strength || "").toLowerCase()
  );

  if (duplicate) {
    throw new ValidationError(
      `Medicine "${brand} (${strength || ""})" already exists in the local catalogue (ID: ${duplicate.id}). Cannot create duplicate.`
    );
  }

  return repo.createMedicine({
    brandName: brand,
    genericName: generic,
    strength,
    dosageForm: externalMed.dosageForm?.trim() || "Tablet",
    manufacturer: externalMed.manufacturer?.trim() || "Local Clinician Entry",
    medicineType: externalMed.medicineType || "allopathic",
    source: "imported_external",
    sourceId: externalMed.sourceId,
    sourceUrl: externalMed.sourceUrl,
    status: "active",
    indications: externalMed.indications,
    dosageDescription: externalMed.dosageDescription,
  });
}
