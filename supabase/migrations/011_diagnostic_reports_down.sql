-- Phase 26 Down Migration: Reversible Rollback for Diagnostic Reports
-- Drops table, policies, and triggers

DROP TRIGGER IF EXISTS set_diagnostic_reports_updated_at ON public.diagnostic_reports;
DROP POLICY IF EXISTS "Allow service role full access to diagnostic_reports" ON public.diagnostic_reports;
DROP POLICY IF EXISTS "Allow authorized doctors to manage diagnostic_reports" ON public.diagnostic_reports;
DROP TABLE IF EXISTS public.diagnostic_reports CASCADE;
