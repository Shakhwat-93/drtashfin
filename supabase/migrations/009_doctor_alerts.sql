-- Phase 24: Doctor In-App Dismissed Alerts
-- Table tracks doctor alert dismissals by alert_id without modifying underlying clinical follow-ups.

CREATE TABLE IF NOT EXISTS public.doctor_dismissed_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(255) NOT NULL UNIQUE,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    dismissed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index on alert_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_doctor_dismissed_alerts_alert_id ON public.doctor_dismissed_alerts (alert_id);

-- Enable RLS
ALTER TABLE public.doctor_dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (doctors) full access to view and record dismissed alerts
DROP POLICY IF EXISTS "Allow authenticated full access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;
CREATE POLICY "Allow authenticated full access to doctor_dismissed_alerts"
    ON public.doctor_dismissed_alerts
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;
CREATE POLICY "Allow service role full access to doctor_dismissed_alerts"
    ON public.doctor_dismissed_alerts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
