-- Phase 24: Rollback Doctor In-App Dismissed Alerts
DROP POLICY IF EXISTS "Allow service role full access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;
DROP POLICY IF EXISTS "Allow authenticated full access to doctor_dismissed_alerts" ON public.doctor_dismissed_alerts;
DROP INDEX IF EXISTS idx_doctor_dismissed_alerts_alert_id;
DROP TABLE IF EXISTS public.doctor_dismissed_alerts;
