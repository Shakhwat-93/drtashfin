-- ==============================================================================
-- Rollback Migration: 016_patient_age_and_workflow_fixes_down.sql
-- ==============================================================================

BEGIN;

-- Only restore NOT NULL if no NULL records exist (defensive guard)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.patients WHERE date_of_birth IS NULL) THEN
        ALTER TABLE public.patients ALTER COLUMN date_of_birth SET NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.diagnostic_reports WHERE drive_url IS NULL) THEN
        ALTER TABLE public.diagnostic_reports ALTER COLUMN drive_url SET NOT NULL;
    END IF;
END $$;

DELETE FROM public._schema_migrations WHERE version = '016';

NOTIFY pgrst, 'reload schema';

COMMIT;
