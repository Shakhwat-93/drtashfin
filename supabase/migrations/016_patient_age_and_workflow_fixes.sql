-- ==============================================================================
-- Migration: 016_patient_age_and_workflow_fixes.sql
-- Description:
--   1. Allow patient registration with Age only (DROP NOT NULL on date_of_birth).
--   2. Allow diagnostic reports with notes/findings before/without Google Drive URL (DROP NOT NULL on drive_url).
--   3. All existing data is strictly preserved; 100% backward compatible.
-- ==============================================================================

BEGIN;

-- 1. Patients table: allow date_of_birth to be NULL when age only is provided
ALTER TABLE public.patients 
    ALTER COLUMN date_of_birth DROP NOT NULL;

-- 2. Diagnostic reports table: allow drive_url to be optional for initial clinical report entry
ALTER TABLE public.diagnostic_reports 
    ALTER COLUMN drive_url DROP NOT NULL;

-- 3. Audit trail
INSERT INTO public._schema_migrations (version, name)
VALUES ('016', '016_patient_age_and_workflow_fixes.sql')
ON CONFLICT (version) DO UPDATE SET applied_at = now();

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;
