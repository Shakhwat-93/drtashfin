import {
  Medicine,
  MedicineSearchParams,
  CreateMedicineDTO,
  UpdateMedicineDTO,
  PaginatedMedicinesResult,
} from "@/types/medicine";

export interface IMedicineRepository {
  /**
   * Fast prefix and fuzzy search over brand name, generic name, strength, and manufacturer.
   */
  searchMedicines(params: MedicineSearchParams): Promise<Medicine[]>;

  /**
   * Paginated search over brand name, generic name, strength, dosage form, and manufacturer.
   * Returns matching items alongside total matching count and pagination metadata.
   */
  searchMedicinesPaginated(
    params: MedicineSearchParams
  ): Promise<PaginatedMedicinesResult>;

  /**
   * Lookup medicine by internal UUID.
   */
  getMedicineById(id: string): Promise<Medicine | null>;

  /**
   * Lookup medicine by source identifier (e.g. MedEx brand_id).
   */
  getMedicineBySourceId(sourceId: string): Promise<Medicine | null>;

  /**
   * Create or register a single medicine entity.
   */
  createMedicine(data: CreateMedicineDTO): Promise<Medicine>;

  /**
   * Update an existing medicine record.
   */
  updateMedicine(id: string, data: UpdateMedicineDTO): Promise<Medicine>;

  /**
   * Batch upsert medicines avoiding duplicate imports based on sourceId.
   */
  upsertMedicines(
    data: CreateMedicineDTO[]
  ): Promise<{ inserted: number; updated: number }>;

  /**
   * Retrieve distinct dosage forms available in the catalogue.
   */
  getDosageForms(): Promise<string[]>;

  /**
   * Retrieve total number of medicines in the catalogue.
   */
  getTotalMedicineCount(): Promise<number>;
}
