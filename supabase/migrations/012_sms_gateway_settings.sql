-- Phase 25.1: Bulk SMS Dhaka Gateway Integration & Dynamic Settings
-- 1. Create public.sms_gateway_settings table for dynamic credential and provider management
-- 2. Enable Row-Level Security scoped to authorized clinicians via public.is_authorized_doctor() and service_role
-- 3. Seed default initial configuration row

CREATE TABLE IF NOT EXISTS public.sms_gateway_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    provider_name VARCHAR(64) NOT NULL DEFAULT 'bulksmsdhaka',
    api_key_encrypted TEXT NULL,
    api_key_iv TEXT NULL,
    api_key_tag TEXT NULL,
    caller_id VARCHAR(64) NOT NULL DEFAULT '1234',
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    last_tested_at TIMESTAMPTZ NULL,
    last_test_status TEXT NULL,
    last_test_error TEXT NULL,
    last_balance TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_gateway_settings_provider ON public.sms_gateway_settings(provider_name);

-- Enable Row-Level Security
ALTER TABLE public.sms_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Doctor access: only authenticated accounts passing public.is_authorized_doctor()
DROP POLICY IF EXISTS "sms_gateway_settings_doctor_policy" ON public.sms_gateway_settings;
CREATE POLICY "sms_gateway_settings_doctor_policy"
    ON public.sms_gateway_settings
    FOR ALL
    TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- Service role bypass for background processing and server-side utilities
DROP POLICY IF EXISTS "sms_gateway_settings_service_role_policy" ON public.sms_gateway_settings;
CREATE POLICY "sms_gateway_settings_service_role_policy"
    ON public.sms_gateway_settings
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Seed default initial row if not already present
INSERT INTO public.sms_gateway_settings (
    id,
    provider_name,
    caller_id,
    is_enabled
) VALUES (
    'default',
    'bulksmsdhaka',
    '1234',
    false
) ON CONFLICT (id) DO NOTHING;
