import { SupabaseClient } from "@supabase/supabase-js";
import { IMedicineRepository } from "./medicine-repository.interface";
import {
  Medicine,
  MedicineSearchParams,
  CreateMedicineDTO,
  UpdateMedicineDTO,
  PaginatedMedicinesResult,
} from "@/types/medicine";
import { supabase } from "@/lib/supabase/client";
import { DataError } from "../errors";

function mapMedicineFromRow(row: Record<string, unknown>): Medicine {
  return {
    id: String(row.id),
    brandName: String(row.brand_name),
    genericName: String(row.generic_name),
    strength: row.strength ? String(row.strength) : undefined,
    dosageForm: row.dosage_form ? String(row.dosage_form) : undefined,
    manufacturer: row.manufacturer ? String(row.manufacturer) : undefined,
    medicineType: (row.medicine_type as Medicine["medicineType"]) || "allopathic",
    packageContainer: row.package_container ? String(row.package_container) : undefined,
    packSizeInfo: row.pack_size_info ? String(row.pack_size_info) : undefined,
    source: String(row.source || "medex"),
    sourceId: row.source_id ? String(row.source_id) : undefined,
    sourceUrl: row.source_url ? String(row.source_url) : undefined,
    status: (row.status as Medicine["status"]) || "active",
    searchTerms: String(row.search_terms || ""),
    indications: row.indications ? String(row.indications) : undefined,
    dosageDescription: row.dosage_description ? String(row.dosage_description) : undefined,
    sideEffects: row.side_effects ? String(row.side_effects) : undefined,
    contraindications: row.contraindications ? String(row.contraindications) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function normalizeSearchTerms(dto: Partial<CreateMedicineDTO>): string {
  return [
    dto.brandName || "",
    dto.genericName || "",
    dto.strength || "",
    dto.dosageForm || "",
    dto.manufacturer || "",
  ]
    .join(" ")
    .toLowerCase()
    .trim();
}

export class SupabaseMedicineRepository implements IMedicineRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient = supabase) {
    this.client = client;
  }

  public async searchMedicinesPaginated(
    params: MedicineSearchParams = {}
  ): Promise<PaginatedMedicinesResult> {
    const limit = Math.min(Math.max(params.limit || 20, 1), 100);
    const offset = Math.max(params.offset || 0, 0);

    let query = this.client
      .from("medicines")
      .select("*", { count: "exact" });

    if (params.query && params.query.trim() !== "") {
      const q = params.query.trim().toLowerCase();
      // Uses the trigram GIN index on search_terms
      query = query.ilike("search_terms", `%${q}%`);
    }

    if (params.dosageForm && params.dosageForm.trim() !== "") {
      query = query.ilike("dosage_form", `%${params.dosageForm.trim()}%`);
    }

    if (params.manufacturer && params.manufacturer.trim() !== "") {
      query = query.ilike("manufacturer", `%${params.manufacturer.trim()}%`);
    }

    if (params.medicineType) {
      query = query.eq("medicine_type", params.medicineType);
    }

    query = query
      .order("brand_name", { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      throw new DataError(`Failed to search medicines: ${error.message}`, error.code);
    }

    const totalCount = count ?? 0;
    const page = Math.floor(offset / limit) + 1;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      medicines: (data || []).map(mapMedicineFromRow),
      totalCount,
      page,
      pageSize: limit,
      totalPages: totalPages || 1,
    };
  }

  public async searchMedicines(
    params: MedicineSearchParams = {}
  ): Promise<Medicine[]> {
    const result = await this.searchMedicinesPaginated(params);
    return result.medicines;
  }

  public async getMedicineById(id: string): Promise<Medicine | null> {
    if (!id) return null;

    const { data, error } = await this.client
      .from("medicines")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch medicine by id: ${error.message}`, error.code);
    }

    return data ? mapMedicineFromRow(data) : null;
  }

  public async getMedicineBySourceId(sourceId: string): Promise<Medicine | null> {
    if (!sourceId) return null;

    const { data, error } = await this.client
      .from("medicines")
      .select("*")
      .eq("source_id", sourceId)
      .maybeSingle();

    if (error) {
      throw new DataError(`Failed to fetch medicine by source_id: ${error.message}`, error.code);
    }

    return data ? mapMedicineFromRow(data) : null;
  }

  public async createMedicine(data: CreateMedicineDTO): Promise<Medicine> {
    const row = {
      brand_name: data.brandName.trim(),
      generic_name: data.genericName.trim(),
      strength: data.strength?.trim() || null,
      dosage_form: data.dosageForm?.trim() || null,
      manufacturer: data.manufacturer?.trim() || null,
      medicine_type: data.medicineType || "allopathic",
      package_container: data.packageContainer?.trim() || null,
      pack_size_info: data.packSizeInfo?.trim() || null,
      source: data.source || "medex",
      source_id: data.sourceId?.trim() || null,
      source_url: data.sourceUrl?.trim() || null,
      status: data.status || "active",
      search_terms: normalizeSearchTerms(data),
      indications: data.indications || null,
      dosage_description: data.dosageDescription || null,
      side_effects: data.sideEffects || null,
      contraindications: data.contraindications || null,
    };

    const { data: created, error } = await this.client
      .from("medicines")
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new DataError(`Failed to create medicine: ${error.message}`, error.code);
    }

    return mapMedicineFromRow(created);
  }

  public async updateMedicine(
    id: string,
    data: UpdateMedicineDTO
  ): Promise<Medicine> {
    const updatePayload: Record<string, unknown> = {};

    if (data.brandName !== undefined) updatePayload.brand_name = data.brandName.trim();
    if (data.genericName !== undefined) updatePayload.generic_name = data.genericName.trim();
    if (data.strength !== undefined) updatePayload.strength = data.strength?.trim() || null;
    if (data.dosageForm !== undefined) updatePayload.dosage_form = data.dosageForm?.trim() || null;
    if (data.manufacturer !== undefined) updatePayload.manufacturer = data.manufacturer?.trim() || null;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.packageContainer !== undefined) updatePayload.package_container = data.packageContainer;
    if (data.packSizeInfo !== undefined) updatePayload.pack_size_info = data.packSizeInfo;
    if (data.indications !== undefined) updatePayload.indications = data.indications;
    if (data.dosageDescription !== undefined) updatePayload.dosage_description = data.dosageDescription;

    const { data: updated, error } = await this.client
      .from("medicines")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new DataError(`Failed to update medicine: ${error.message}`, error.code);
    }

    return mapMedicineFromRow(updated);
  }

  public async upsertMedicines(
    items: CreateMedicineDTO[]
  ): Promise<{ inserted: number; updated: number }> {
    if (!items || items.length === 0) {
      return { inserted: 0, updated: 0 };
    }

    const rows = items.map((item) => ({
      brand_name: item.brandName.trim(),
      generic_name: item.genericName.trim(),
      strength: item.strength?.trim() || null,
      dosage_form: item.dosageForm?.trim() || null,
      manufacturer: item.manufacturer?.trim() || null,
      medicine_type: item.medicineType || "allopathic",
      package_container: item.packageContainer?.trim() || null,
      pack_size_info: item.packSizeInfo?.trim() || null,
      source: item.source || "medex",
      source_id: item.sourceId?.trim() || null,
      source_url: item.sourceUrl?.trim() || null,
      status: item.status || "active",
      search_terms: normalizeSearchTerms(item),
      indications: item.indications || null,
      dosage_description: item.dosageDescription || null,
      side_effects: item.sideEffects || null,
      contraindications: item.contraindications || null,
    }));

    // Batch upsert in chunks of 50 to respect payload limits
    const CHUNK_SIZE = 50;
    let totalProcessed = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { data, error } = await this.client
        .from("medicines")
        .upsert(chunk, {
          onConflict: "source_id",
          ignoreDuplicates: false,
        })
        .select("id");

      if (error) {
        throw new DataError(`Failed to upsert medicine chunk: ${error.message}`, error.code);
      }
      totalProcessed += (data?.length || chunk.length);
    }

    return { inserted: totalProcessed, updated: 0 };
  }

  public async getDosageForms(): Promise<string[]> {
    const { data, error } = await this.client
      .from("medicines")
      .select("dosage_form")
      .not("dosage_form", "is", null);

    if (error) {
      throw new DataError(`Failed to fetch dosage forms: ${error.message}`, error.code);
    }

    const set = new Set<string>();
    (data || []).forEach((row) => {
      if (row.dosage_form) set.add(String(row.dosage_form));
    });

    return Array.from(set).sort();
  }

  public async getTotalMedicineCount(): Promise<number> {
    const { count, error } = await this.client
      .from("medicines")
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new DataError(`Failed to count medicines: ${error.message}`, error.code);
    }

    return count ?? 0;
  }
}
