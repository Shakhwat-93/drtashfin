# Architectural Design Document

## 1. Project Purpose

The **Doctor Patient Management System** is a dedicated clinical web application tailored for a doctor's private or clinical practice. It is designed to deliver a dependable, secure, and intuitive workflow for patient recordkeeping, clinical encounters, appointments, prescriptions, and administrative operations. The system prioritizes data integrity, operational reliability, auditability, and responsiveness.

---

## 2. Planned Architecture Overview

The system is architected as a **Modular Monolith** built on top of the Next.js App Router framework. This model provides the development velocity, unified type safety, and cohesive deployment of a single codebase while maintaining strict boundaries between logical domains.

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                       │
│        (Server Components, Client Components, Actions)      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
┌──────────────▼──────────────┐ ┌──────────────▼──────────────┐
│       Core Services         │ │       Feature Modules       │
│  (Auth, Database, Storage)  │ │  (Patients, Appts, Records) │
└──────────────┬──────────────┘ └──────────────┬──────────────┘
               │                               │
┌──────────────▼───────────────────────────────▼──────────────┐
│                     Data & Storage Layer                    │
│      PostgreSQL (via Supabase)  |  Cloudflare R2 Storage     │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Tenets
1. **Separation of Concerns:** Shared primitives live in `components/ui` and `lib/`; business logic lives encapsulated inside specific domain directories in `features/`.
2. **Type Safety End-to-End:** Shared TypeScript types and Zod schemas validate data across forms, API boundaries, and database models.
3. **No Premature Complexity:** Avoid distributed microservices overhead; maintain high modularity within a single deployable unit.
4. **Performance & Compliance:** Server-first rendering where applicable to minimize client bundles, with zero mock or leaked patient data.

---

## 3. Planned Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | Server-side rendering, streaming, server actions, and route handlers. |
| **Language** | TypeScript (Strict) | Robust compile-time type checking and contract enforcement. |
| **Styling** | Tailwind CSS v4 | Utility-first, zero-runtime styling with predictable design tokens. |
| **Database & Auth** | Supabase & PostgreSQL | Relational integrity, Row Level Security (RLS), and secure authentication. |
| **Blob / File Storage** | Cloudflare R2 | S3-compatible, zero-egress fee storage for clinical attachments & reports. |
| **Deployment / Infra** | Docker, Linux VPS, Caddy | Reproducible containers, self-hosted data governance, automated HTTPS. |

---

## 4. Modular Monolith Approach

The project organizes code by technical layer and feature domain:

```
src/
├── app/                  # Next.js App Router (pages, layouts, route handlers)
├── components/
│   ├── ui/               # Headless/styled atom UI components (buttons, dialogs, inputs)
│   ├── layout/           # Global shell components (sidebar, navigation, header)
│   └── shared/           # Reusable composite components
├── features/             # Domain modules (encapsulated business logic, hooks, components)
├── lib/                  # Infrastructure clients, utility functions, shared wrappers
├── hooks/                # Cross-domain React hooks
├── schemas/              # Runtime validation schemas (e.g., Zod)
├── types/                # Core TypeScript interfaces and type declarations
└── config/               # Application-level constants, navigation configs, site settings
```

### Feature Module Rules
- Modules within `features/` are self-contained.
- Cross-feature imports should occur only via well-defined interfaces.
- Feature components must not directly manipulate external domain stores without standard service boundaries.

---

## 5. Data Layer Architecture (Repository & Provider Pattern)

The data tier follows a strict **Repository / Provider Pattern** to decouple the UI and business layers from the underlying storage mechanism:

```
UI Layer -> Feature Hooks -> Repository Interface -> Data Provider (Mock NOW / Supabase LATER)
```

- **Repository Contract (`IPatientRepository`, `IClinicalRepository`, `IConsultationRepository`):** Declares domain query and mutation operations without exposing storage implementation details.
- **Provider Factory (`src/lib/data/index.ts`):** Exposes dependency-injected getters (`getPatientRepository()`, `getClinicalRepository()`, `getConsultationRepository()`).
- **Active Providers:** `MockPatientRepository`, `MockClinicalRepository`, `MockConsultationRepository` (utilize development-only storage with in-memory fallback for SSR and testing).
- **Future Provider:** `Supabase*Repository` (will connect directly to self-hosted PostgreSQL via Supabase when VPS infrastructure is provisioned).
- **Zero UI Rewrites:** Migrating from mock data to Supabase in a future phase will require swapping the repository implementations in the factory without altering any UI components, forms, or custom hooks.

---

## 6. Future Supabase Usage

*(To be implemented in subsequent phases when VPS infrastructure is provisioned)*

- **Relational Data Management:** Core entities (patients, appointments, clinical notes, prescriptions, audit trails) will reside in PostgreSQL.
- **Row Level Security (RLS):** Policies will enforce strict tenant and role-based access controls at the database level.
- **Authentication:** Doctor and staff session management leveraging Supabase Auth with secure HTTP-only cookies.
- **Realtime / Subscriptions:** Optional live updates for appointment queues or doctor status updates.

---

## 6. Future Cloudflare R2 Usage

*(To be implemented in subsequent phases)*

- **Medical Document Storage:** Lab reports, diagnostic imagery, and scanned patient records.
- **S3 Compatibility:** Standard AWS S3 SDK integration pointing to Cloudflare R2 endpoints.
- **Direct & Presigned Uploads:** Upload files directly from client/server with presigned URLs to prevent server memory bloat.
- **Cost & Security:** Zero egress fees with private, authenticated bucket access policies.

---

## 7. Development vs. Production Environment Separation

To ensure stability, security, and isolation:

1. **Local Development:**
   - Runs on local machine using `npm run dev`.
   - Uses local environment variables (`.env.local`).
   - Connects to isolated development database instances.

2. **Production Environment:**
   - Packaged as an optimized Docker image.
   - Hosted on a Linux VPS behind a Caddy reverse proxy providing automated TLS certificates.
   - Enforces production secrets injected securely via deployment orchestration (e.g., Docker Compose / Secret manager).
   - Production builds run with minification, standalone Next.js server output, and strict HTTP security headers.
