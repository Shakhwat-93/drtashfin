/**
 * Domain entity and DTO definitions for Bangladesh Medicine Catalogue.
 * Provenance: MedEx Bangladesh pharmaceutical reference dataset.
 */

export type MedicineType = "allopathic" | "herbal";
export type MedicineStatus = "active" | "archived" | "pending_verification";

export interface Medicine {
  id: string; // Unique UUID
  brandName: string; // e.g., "Napa Extra", "Seclo 20"
  genericName: string; // e.g., "Paracetamol + Caffeine", "Omeprazole"
  strength?: string; // e.g., "500 mg + 65 mg", "20 mg"
  dosageForm?: string; // e.g., "Tablet", "Capsule", "Syrup"
  manufacturer?: string; // e.g., "Beximco Pharmaceuticals Ltd."
  medicineType: MedicineType;
  packageContainer?: string;
  packSizeInfo?: string;
  source: string; // Default: 'medex'
  sourceId?: string; // MedEx brand_id for idempotent synchronization
  sourceUrl?: string;
  status: MedicineStatus;
  searchTerms: string; // Pre-normalized lowercase search string
  indications?: string; // Sourced clinical reference monograph
  dosageDescription?: string;
  sideEffects?: string;
  contraindications?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineSearchParams {
  query?: string;
  dosageForm?: string;
  manufacturer?: string;
  medicineType?: MedicineType;
  limit?: number; // Default: 20
  offset?: number; // Default: 0
}

export type CreateMedicineDTO = Omit<
  Medicine,
  "id" | "searchTerms" | "createdAt" | "updatedAt"
> & {
  id?: string;
  searchTerms?: string;
};

export type UpdateMedicineDTO = Partial<
  Omit<Medicine, "id" | "createdAt" | "updatedAt">
>;

export interface PaginatedMedicinesResult {
  medicines: Medicine[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type MedicineSearchOrigin = "local" | "external";

export interface UnifiedMedicineSearchResult {
  id: string; // UUID for local; stable external slug (e.g. "ext-medex-123") for external
  brandName: string;
  genericName: string;
  strength?: string;
  dosageForm?: string; // Undefined if not in external source (never invented!)
  manufacturer?: string;
  medicineType: MedicineType;
  packageContainer?: string;
  packSizeInfo?: string;
  price?: string; // e.g. "12.00" (BDT) from MedEx dataset
  source: string; // 'local_catalogue' | 'medex_dataset' | 'square_dataset' | 'external_api'
  sourceId?: string; // Stable upstream identifier (e.g. "medex-row-42")
  sourceName: string; // e.g. "Local Supabase Catalogue" or "External MedEx Dataset"
  sourceUrl?: string;
  status: MedicineStatus;
  origin: MedicineSearchOrigin; // 'local' | 'external'
  sourceBadge: string; // "Local Catalogue" | "External Dataset (MedEx BD)"
  isExternal: boolean;
  searchTerms?: string;
  dataFreshness?: string;
  relevanceScore?: number;
  indications?: string;
  dosageDescription?: string;
  sideEffects?: string;
  contraindications?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HybridSearchResponse {
  results: UnifiedMedicineSearchResult[];
  totalResults: number;
  localCount: number;
  externalCount: number;
  query: string;
  cacheHit?: boolean;
  externalFallbackTriggered: boolean;
  externalFallbackStatus?:
    | "disabled"
    | "ok"
    | "timeout"
    | "error"
    | "skipped_sufficient_local";
  fallbackWarning?: string;
  durationMs: number;
}
