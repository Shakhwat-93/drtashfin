-- ==============================================================================
-- Migration: 007_complete_patient_profile.sql
-- Description: Phase 22 — Complete Patient Registration & Lifetime Patient Profile
-- Adds identity, family, contact, emergency, and clinical background fields to patients.
-- All columns are NULLABLE to ensure 100% backwards compatibility and zero data loss.
-- ==============================================================================

BEGIN;

-- 1. Patient Identity & Family
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS father_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS guardian_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS guardian_relationship VARCHAR(64);

-- 2. Contact & Emergency Information
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(32),
    ADD COLUMN IF NOT EXISTS permanent_address TEXT,
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(64),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(32);

-- 3. Additional Clinical & Social Information
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS occupation VARCHAR(128),
    ADD COLUMN IF NOT EXISTS allergies TEXT,
    ADD COLUMN IF NOT EXISTS medical_history TEXT,
    ADD COLUMN IF NOT EXISTS current_medications TEXT,
    ADD COLUMN IF NOT EXISTS patient_notes TEXT;

-- 4. B-Tree Indexes for Fast Lookup
CREATE INDEX IF NOT EXISTS idx_patients_secondary_phone ON public.patients (secondary_phone);
CREATE INDEX IF NOT EXISTS idx_patients_father_name ON public.patients (father_name);

-- 5. Record Schema Migration Entry
INSERT INTO public._schema_migrations (version, name)
VALUES ('007', '007_complete_patient_profile.sql')
ON CONFLICT (version) DO UPDATE SET applied_at = now();

NOTIFY pgrst, 'reload schema';

COMMIT;
