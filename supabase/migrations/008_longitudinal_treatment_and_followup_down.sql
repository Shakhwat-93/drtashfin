-- ==============================================================================
-- Rollback Migration: 008_longitudinal_treatment_and_followup_down.sql
-- Description: Reverts Migration 008 safely without touching core patient or prescription data
-- ==============================================================================

BEGIN;

-- 1. Drop public.follow_ups table and triggers
DROP TABLE IF EXISTS public.follow_ups CASCADE;
DROP FUNCTION IF EXISTS public.fn_sync_follow_up_chamber();

-- 2. Drop longitudinal columns and constraints from public.consultations
ALTER TABLE public.consultations
    DROP CONSTRAINT IF EXISTS consultations_status_check,
    DROP CONSTRAINT IF EXISTS consultations_outcome_check,
    DROP COLUMN IF EXISTS consultation_time,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS clinical_notes,
    DROP COLUMN IF EXISTS treatment_instructions,
    DROP COLUMN IF EXISTS lifestyle_instructions,
    DROP COLUMN IF EXISTS treatment_start_date,
    DROP COLUMN IF EXISTS treatment_review_date,
    DROP COLUMN IF EXISTS follow_up_reason,
    DROP COLUMN IF EXISTS clinical_outcome,
    DROP COLUMN IF EXISTS progress_notes,
    DROP COLUMN IF EXISTS is_follow_up,
    DROP COLUMN IF EXISTS originating_consultation_id;

DROP INDEX IF EXISTS public.idx_consultations_status;
DROP INDEX IF EXISTS public.idx_consultations_originating_id;

-- 3. Remove migration record
DELETE FROM public._schema_migrations WHERE version = '008';

NOTIFY pgrst, 'reload schema';

COMMIT;
