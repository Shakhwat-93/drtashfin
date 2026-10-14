-- Phase 25: Secure SMS Follow-up Reminder System & RLS Hardening
-- Includes:
-- 1. Remediation of doctor_dismissed_alerts RLS policy (scoped to public.is_authorized_doctor()).
-- 2. Patient explicit SMS consent columns on public.patients.
-- 3. Dedicated public.sms_reminders table with status tracking, audit logging, and scoped RLS policies.

-- ============================================================================
-- 1. Tighten doctor_dismissed_alerts RLS policy
-- ============================================================================
DROP POLICY IF EXISTS "Allow authenticated full access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;
DROP POLICY IF EXISTS "Allow authorized doctors access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;

CREATE POLICY "Allow authorized doctors access to doctor_dismissed_alerts"
    ON public.doctor_dismissed_alerts
    FOR ALL
    TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- ============================================================================
-- 2. Patient Explicit SMS Consent Columns
-- ============================================================================
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS sms_consent_status text NOT NULL DEFAULT 'unknown'
        CHECK (sms_consent_status IN ('opted_in', 'opted_out', 'unknown')),
    ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz,
    ADD COLUMN IF NOT EXISTS sms_consent_source text;

-- ============================================================================
-- 3. Dedicated SMS Reminders Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sms_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follow_up_id UUID NOT NULL REFERENCES public.follow_ups(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    recipient_phone_masked TEXT NOT NULL,
    recipient_phone_hash TEXT NOT NULL,
    message_content TEXT NOT NULL,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24h_before', '3h_before')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'failed', 'skipped', 'cancelled')),
    idempotency_key TEXT UNIQUE NOT NULL,
    provider_message_id TEXT,
    delivery_status TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    failure_reason TEXT,
    provider_response JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_sms_reminders_follow_up ON public.sms_reminders(follow_up_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_patient ON public.sms_reminders(patient_id);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_status_scheduled ON public.sms_reminders(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_sms_reminders_phone_hash ON public.sms_reminders(recipient_phone_hash);

-- Enable RLS
ALTER TABLE public.sms_reminders ENABLE ROW LEVEL SECURITY;

-- Allow authorized doctors access
DROP POLICY IF EXISTS "Allow authorized doctors to manage sms_reminders" ON public.sms_reminders;
CREATE POLICY "Allow authorized doctors to manage sms_reminders"
    ON public.sms_reminders
    FOR ALL
    TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access to sms_reminders" ON public.sms_reminders;
CREATE POLICY "Allow service role full access to sms_reminders"
    ON public.sms_reminders
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
