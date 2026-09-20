# Phase 03: Frontend Data Architecture & Mock Backend

## 1. Executive Summary & Architectural Decision

### 1.1 Why Production Backend is Intentionally Not Connected
The production VPS for the Doctor Patient Management System has not been provisioned yet. Rather than prematurely provisioning cloud databases, coupling client components to third-party SDKs, or creating fragile remote integrations, the application has intentionally decoupled the data layer using the **Repository Pattern** and **Provider Pattern**.

This strategy ensures:
1. The full frontend UX, clinical workflows, responsive forms, and state transitions can be thoroughly tested and refined.
2. The UI code contains zero direct dependencies on Supabase, PostgreSQL, or Cloudflare R2.
3. When the production VPS is acquired, migrating to Supabase requires implementing a single class (`SupabasePatientRepository`) without modifying UI pages, tables, or feature components.

---

## 2. Main Data Architecture

The architecture enforces strict unidirectional dependency inversion:

```
┌─────────────────────────────────────────────────────────────┐
│                 UI Layer (App Router Pages)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────┐
│       Feature / Business Layer (Hooks & Services)          │
│         (usePatients, useDashboardMetrics)                 │
└──────────────────────────────┬─────────────────────────────┘
                               │
┌──────────────────────────────▼─────────────────────────────┐
│             Repository Interfaces (Contracts)               │
│        (IPatientRepository, IClinicalRepository)           │
└──────────────────────────────┬─────────────────────────────┘
                               │
         ┌─────────────────────┴─────────────────────┐
         │                                           │
┌────────▼────────────────────┐            ┌─────────▼─────────────────────┐
│    Mock Data Provider       │            │   Supabase Provider (Future)  │
│   (MockPatientRepository)   │            │   (SupabasePatientRepository) │
│       [ACTIVE NOW]          │            │       [UPCOMING PHASE]        │
└────────┬────────────────────┘            └─────────┬─────────────────────┘
         │                                           │
┌────────▼────────────────────┐            ┌─────────▼─────────────────────┐
│  Browser Storage / Memory   │            │    PostgreSQL on VPS + R2     │
└─────────────────────────────┘            └───────────────────────────────┘
```

---

## 3. Repository & Provider Pattern Implementation

### 3.1 Repository Contract (`IPatientRepository`)
Located in [`src/lib/data/repositories/patient-repository.interface.ts`](file:///C:/projects/doctor%20tashfin/src/lib/data/repositories/patient-repository.interface.ts):
- `getPatients(params?: PatientQueryParams): Promise<PaginatedResult<Patient>>`
- `getPatientById(id: string): Promise<Patient | null>`
- `getPatientByPatientId(patientId: string): Promise<Patient | null>`
- `createPatient(data: CreatePatientDTO): Promise<Patient>`
- `updatePatient(id: string, data: UpdatePatientDTO): Promise<Patient>`
- `deletePatient(id: string): Promise<boolean>`
- `getRecentPatients(limit?: number): Promise<Patient[]>`
- `getTotalPatientCount(): Promise<number>`

### 3.2 Provider Factory (`src/lib/data/index.ts`)
The provider factory exposes dependency-injected getters:
```typescript
export function getPatientRepository(): IPatientRepository {
  // Returns MockPatientRepository today, SupabasePatientRepository tomorrow
  return patientRepositoryInstance ??= new MockPatientRepository();
}
```

---

## 4. Patient Data Model & Separation of Concerns

### 4.1 Strict Entity Isolation
Permanent patient identity is strictly separated from transient or historical medical encounters:
- **`Patient` (`src/types/patient.ts`):** Contains permanent identity attributes: `id` (UUID), `patientId` (formatted as `PT-000001`), `name`, `dateOfBirth`, `age`, `gender`, `weight`, `phone`, `email`, `address`, `bloodGroup`, `createdAt`, `updatedAt`.
- **Medical Records (`src/types/clinical.ts`):** `Visit`, `Investigation`, `Prescription`, `FollowUp`, `Operation`, `Document`.
- **Integrity Rule:** Clinical encounters never overwrite prior visits. Each encounter represents an immutable or auditable event tied by `patientId`.

### 4.2 Patient ID Generation
- Format: `PT-000001`, `PT-000002`, `PT-000003`.
- Sequential, padded with 6 digits, and validated for uniqueness before storage.

---

## 5. Security Warning & Development-Only Persistence

> [!CAUTION]
> **DEVELOPER SECURITY NOTICE:**
> Mock persistence (`MockStorage`) uses browser `localStorage` (with safe in-memory fallback for SSR and automated testing). This storage adapter is strictly for development and local testing.
> 
> Real Personal Health Information (PHI) must never be stored in browser `localStorage`. Real clinical records will be stored in PostgreSQL with database-level Row Level Security (RLS) when the production VPS is deployed.

---

## 6. Testing Strategy & Verification

### 6.1 Test Suite (`tests/patient-repository.test.ts`)
Run via `npm test`:
- Repository seed data initialization.
- Sequential `PT-XXXXXX` patient ID formatting and parsing.
- Patient creation with Zod validation.
- Rejection of invalid data (e.g. invalid date of birth, short names).
- Case-insensitive search across name, patient ID, and contact phone.
- Gender filtering.
- Pagination calculations (`page`, `pageSize`, `totalPages`, `total`).
- Patient record updates and timestamp refresh.
- Custom domain error handling (`PatientNotFoundError`).
- Patient deletion and count reduction.
