-- Phase 25.1 Rollback: Bulk SMS Dhaka Gateway Integration & Dynamic Settings
-- Safely drops the sms_gateway_settings table and associated policies

DROP TABLE IF EXISTS public.sms_gateway_settings CASCADE;
