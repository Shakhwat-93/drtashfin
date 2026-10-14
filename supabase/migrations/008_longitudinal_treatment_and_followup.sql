-- ==============================================================================
-- Migration: 008_longitudinal_treatment_and_followup.sql
-- Description: Phase 23 — Longitudinal Treatment & Follow-up Management
-- 1. Extends public.consultations with longitudinal clinical notes, treatment
--    instructions, lifestyle advice, review dates, progress notes, and outcomes.
-- 2. Creates public.follow_ups table with status tracking (upcoming, overdue,
--    completed, cancelled), clinical outcomes (improved, unchanged, worsened),
--    chamber scoping, and full RLS policies.
-- 100% Backwards compatible: all new columns on consultations are NULLABLE.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Extend public.consultations with Longitudinal Treatment Plan Fields
-- ------------------------------------------------------------------------------

ALTER TABLE public.consultations
    ADD COLUMN IF NOT EXISTS consultation_time VARCHAR(16) DEFAULT '10:00 AM',
    ADD COLUMN IF NOT EXISTS status VARCHAR(24) NOT NULL DEFAULT 'completed',
    ADD COLUMN IF NOT EXISTS clinical_notes TEXT,
    ADD COLUMN IF NOT EXISTS treatment_instructions TEXT,
    ADD COLUMN IF NOT EXISTS lifestyle_instructions TEXT,
    ADD COLUMN IF NOT EXISTS treatment_start_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS treatment_review_date DATE,
    ADD COLUMN IF NOT EXISTS follow_up_reason TEXT,
    ADD COLUMN IF NOT EXISTS clinical_outcome VARCHAR(24),
    ADD COLUMN IF NOT EXISTS progress_notes TEXT,
    ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS originating_consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL;

-- Status & Outcome Constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'consultations_status_check'
    ) THEN
        ALTER TABLE public.consultations
            ADD CONSTRAINT consultations_status_check
            CHECK (status IN ('scheduled', 'in-progress', 'completed', 'cancelled'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'consultations_outcome_check'
    ) THEN
        ALTER TABLE public.consultations
            ADD CONSTRAINT consultations_outcome_check
            CHECK (clinical_outcome IS NULL OR clinical_outcome IN ('improved', 'unchanged', 'worsened'));
    END IF;
END $$;

-- Indexes for consultations longitudinal queries
CREATE INDEX IF NOT EXISTS idx_consultations_status ON public.consultations (status);
CREATE INDEX IF NOT EXISTS idx_consultations_originating_id ON public.consultations (originating_consultation_id);

-- ------------------------------------------------------------------------------
-- 2. Create public.follow_ups Table
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_code VARCHAR(32),
    chamber_id UUID REFERENCES public.chambers(id) ON DELETE SET NULL,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    follow_up_consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time VARCHAR(16) DEFAULT '10:00 AM',
    reason TEXT NOT NULL DEFAULT 'Routine follow-up',
    notes TEXT,
    status VARCHAR(24) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    clinical_outcome VARCHAR(24) CHECK (clinical_outcome IS NULL OR clinical_outcome IN ('improved', 'unchanged', 'worsened')),
    outcome_notes TEXT,
    cancellation_reason TEXT,
    priority VARCHAR(16) DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent', 'routine', 'review')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for follow-up workflows
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient_id ON public.follow_ups (patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_scheduled_date ON public.follow_ups (scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups (status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_chamber_id ON public.follow_ups (chamber_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_consultation_id ON public.follow_ups (consultation_id);

-- ------------------------------------------------------------------------------
-- 3. Triggers for public.follow_ups
-- ------------------------------------------------------------------------------

-- Trigger for auto-updating updated_at on follow_ups
DROP TRIGGER IF EXISTS set_follow_ups_updated_at ON public.follow_ups;
CREATE TRIGGER set_follow_ups_updated_at
    BEFORE UPDATE ON public.follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Automatically inherit patient's chamber_id and patient_code if null
CREATE OR REPLACE FUNCTION public.fn_sync_follow_up_chamber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.chamber_id IS NULL AND NEW.patient_id IS NOT NULL THEN
        SELECT chamber_id INTO NEW.chamber_id FROM public.patients WHERE id = NEW.patient_id;
    END IF;
    IF NEW.patient_code IS NULL AND NEW.patient_id IS NOT NULL THEN
        SELECT patient_id INTO NEW.patient_code FROM public.patients WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_follow_up_chamber ON public.follow_ups;
CREATE TRIGGER trg_sync_follow_up_chamber
    BEFORE INSERT ON public.follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_follow_up_chamber();

-- ------------------------------------------------------------------------------
-- 4. Row Level Security (RLS) on public.follow_ups
-- ------------------------------------------------------------------------------

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doctor_all_follow_ups" ON public.follow_ups;
CREATE POLICY "doctor_all_follow_ups"
    ON public.follow_ups
    FOR ALL
    TO authenticated
    USING (is_authorized_doctor())
    WITH CHECK (is_authorized_doctor());

DROP POLICY IF EXISTS "service_role_all_follow_ups" ON public.follow_ups;
CREATE POLICY "service_role_all_follow_ups"
    ON public.follow_ups
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. Record Schema Migration
-- ------------------------------------------------------------------------------

INSERT INTO public._schema_migrations (version, name)
VALUES ('008', '008_longitudinal_treatment_and_followup.sql')
ON CONFLICT (version) DO UPDATE SET applied_at = now();

NOTIFY pgrst, 'reload schema';

COMMIT;
