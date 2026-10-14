-- Phase 25 Down Migration: Reversible Rollback for SMS Reminders & RLS Hardening

-- 1. Drop sms_reminders table and policies
DROP POLICY IF EXISTS "Allow service role full access to sms_reminders" ON public.sms_reminders;
DROP POLICY IF EXISTS "Allow authorized doctors to manage sms_reminders" ON public.sms_reminders;
DROP TABLE IF EXISTS public.sms_reminders CASCADE;

-- 2. Drop patient SMS consent columns
ALTER TABLE public.patients
    DROP COLUMN IF EXISTS sms_consent_source,
    DROP COLUMN IF EXISTS sms_consent_at,
    DROP COLUMN IF EXISTS sms_consent_status;

-- 3. Restore previous doctor_dismissed_alerts policy (Phase 24 state)
DROP POLICY IF EXISTS "Allow authorized doctors access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;
DROP POLICY IF EXISTS "Allow authenticated full access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;

CREATE POLICY "Allow authenticated full access to doctor_dismissed_alerts"
    ON public.doctor_dismissed_alerts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
