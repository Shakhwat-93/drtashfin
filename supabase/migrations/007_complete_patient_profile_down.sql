-- ==============================================================================
-- Rollback Migration: 007_complete_patient_profile_down.sql
-- Description: Reverts Migration 007 safely without touching core patient data
-- ==============================================================================

BEGIN;

DROP INDEX IF EXISTS public.idx_patients_father_name;
DROP INDEX IF EXISTS public.idx_patients_secondary_phone;

ALTER TABLE public.patients
    DROP COLUMN IF EXISTS father_name,
    DROP COLUMN IF EXISTS mother_name,
    DROP COLUMN IF EXISTS guardian_name,
    DROP COLUMN IF EXISTS guardian_relationship,
    DROP COLUMN IF EXISTS secondary_phone,
    DROP COLUMN IF EXISTS permanent_address,
    DROP COLUMN IF EXISTS emergency_contact_name,
    DROP COLUMN IF EXISTS emergency_contact_relationship,
    DROP COLUMN IF EXISTS emergency_contact_phone,
    DROP COLUMN IF EXISTS occupation,
    DROP COLUMN IF EXISTS allergies,
    DROP COLUMN IF EXISTS medical_history,
    DROP COLUMN IF EXISTS current_medications,
    DROP COLUMN IF EXISTS patient_notes;

DELETE FROM public._schema_migrations WHERE version = '007';

NOTIFY pgrst, 'reload schema';

COMMIT;
