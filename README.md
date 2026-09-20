# Doctor Patient Management System

A long-term, production-grade Patient Management System designed for clinical and medical practice.

## Project Purpose

The Doctor Patient Management System is built to provide healthcare practitioners with a robust, secure, and reliable system for clinical workflows, patient records, and medical administration. The architecture follows a modular monolith approach designed for scalability, data integrity, and strict adherence to modern web standards.

## Current Development Phase

- **Current Phase:** `Phase 04 — Patient Management UI`
- **Status:** Completed & Verified
- **Scope:** Complete Patient Management module with directory listing, debounced multi-field search, gender filtering, pagination, responsive table stacking on mobile, sequential patient onboarding with duplicate detection, patient profile workspaces with clinical tabs, and inline record editing. Operates entirely through abstract data repositories without external backend dependencies.

## Technology Stack

### Foundation (Phase 01)
- **Framework:** Next.js (App Router)
- **Language:** TypeScript (Strict Mode)
- **Styling:** Tailwind CSS
- **Linting & Code Quality:** ESLint with Next.js Core Web Vitals config
- **Module Resolution:** Path aliases via `@/*` pointing to `src/*`

### Planned Stack (Upcoming Phases)
- **Backend & Database:** Supabase & PostgreSQL
- **Object Storage:** Cloudflare R2
- **Containerization & Deployment:** Docker, Linux VPS, Caddy Reverse Proxy (HTTPS / Automated TLS)

## Getting Started (Local Development)

### Prerequisites
- Node.js (v20+ or v24+)
- npm (v10+ or v11+)

### Installation
```bash
npm install
```

### Local Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Validation & Verification Commands
- **Linting:** `npm run lint`
- **TypeScript Checking:** `npm run typecheck`
- **Production Build:** `npm run build`
