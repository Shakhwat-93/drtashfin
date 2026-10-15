-- Phase 26: Diagnostic Test Reports & Google Drive Link-Only Management
-- Includes:
-- 1. Dedicated public.diagnostic_reports table for test metadata and Google Drive URLs only.
-- 2. Scoped RLS policies enforcing public.is_authorized_doctor().
-- 3. Automatic updated_at trigger and lookup performance indexes.

CREATE TABLE IF NOT EXISTS public.diagnostic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    test_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (
        category IN (
            'Blood Test',
            'Urine Test',
            'X-ray',
            'USG',
            'ECG',
            'CT Scan',
            'MRI',
            'Pathology',
            'Other'
        )
    ),
    test_date DATE NOT NULL,
    diagnostic_center VARCHAR(255),
    doctor_notes TEXT,
    drive_url TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_patient ON public.diagnostic_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_consultation ON public.diagnostic_reports(consultation_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_test_date ON public.diagnostic_reports(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostic_reports_category ON public.diagnostic_reports(category);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_diagnostic_reports_updated_at ON public.diagnostic_reports;
CREATE TRIGGER set_diagnostic_reports_updated_at
    BEFORE UPDATE ON public.diagnostic_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.diagnostic_reports ENABLE ROW LEVEL SECURITY;

-- 1. Allow authorized doctors access
DROP POLICY IF EXISTS "Allow authorized doctors to manage diagnostic_reports" ON public.diagnostic_reports;
CREATE POLICY "Allow authorized doctors to manage diagnostic_reports"
    ON public.diagnostic_reports
    FOR ALL
    TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- 2. Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access to diagnostic_reports" ON public.diagnostic_reports;
CREATE POLICY "Allow service role full access to diagnostic_reports"
    ON public.diagnostic_reports
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Least-privilege grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnostic_reports TO authenticated;
GRANT ALL ON public.diagnostic_reports TO service_role;
