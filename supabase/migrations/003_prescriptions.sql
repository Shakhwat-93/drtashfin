-- ==============================================================================
-- Migration: 003_prescriptions.sql
-- Description: Production-ready Doctor-controlled Prescription Engine
-- Tables: prescriptions, prescription_items
-- ==============================================================================

-- 1. Prescription Code Sequence and Generator Function
CREATE SEQUENCE IF NOT EXISTS public.prescription_code_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.prescription_code_seq TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generate_next_prescription_code()
RETURNS VARCHAR(32) AS $$
DECLARE
    next_seq BIGINT;
BEGIN
    SELECT nextval('public.prescription_code_seq') INTO next_seq;
    RETURN 'RX-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION public.generate_next_prescription_code() TO anon, authenticated, service_role;

-- 2. Prescriptions Table
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_code VARCHAR(32) UNIQUE NOT NULL DEFAULT public.generate_next_prescription_code(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    doctor_id VARCHAR(64) NOT NULL DEFAULT 'dr-tashfin',
    prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    finalized_at TIMESTAMPTZ,
    
    -- Clinical Advice & Instructions
    advice TEXT,
    follow_up_date DATE,
    follow_up_instructions TEXT,
    notes TEXT,
    
    -- Audit Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for fast query & timeline integration
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id ON public.prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id ON public.prescriptions (consultation_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON public.prescriptions (status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_date ON public.prescriptions (prescription_date DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_created_at ON public.prescriptions (created_at DESC);

-- Trigger for auto-updating updated_at on prescriptions
DROP TRIGGER IF EXISTS set_prescriptions_updated_at ON public.prescriptions;
CREATE TRIGGER set_prescriptions_updated_at
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. Prescription Items Table
CREATE TABLE IF NOT EXISTS public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE SET NULL,
    
    -- Stable historical snapshots (preserved even if catalogue record changes or is archived)
    brand_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    strength VARCHAR(100),
    dosage_form VARCHAR(100),
    manufacturer VARCHAR(255),
    
    -- Clinician-entered dosage & instructions
    dose VARCHAR(100), -- e.g. "1 tablet", "5 ml", "1 puff"
    frequency VARCHAR(100) NOT NULL, -- e.g. "1+0+1", "1+1+1", "Once daily", "SOS"
    route VARCHAR(50) NOT NULL DEFAULT 'Oral', -- e.g. "Oral", "Topical", "Inhalation"
    duration VARCHAR(100), -- e.g. "7 days", "14 days", "1 month", "Continue"
    timing_instructions VARCHAR(255), -- e.g. "After meal", "Before meal", "With water"
    special_instructions TEXT, -- e.g. "Do not stop abruptly", "Avoid dairy 1 hr before/after"
    
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for prescription items
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription_id ON public.prescription_items (prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_medicine_id ON public.prescription_items (medicine_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_order ON public.prescription_items (prescription_id, order_index ASC);

-- Trigger for auto-updating updated_at on prescription_items
DROP TRIGGER IF EXISTS set_prescription_items_updated_at ON public.prescription_items;
CREATE TRIGGER set_prescription_items_updated_at
    BEFORE UPDATE ON public.prescription_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS service_role_all_prescriptions ON public.prescriptions;
CREATE POLICY service_role_all_prescriptions ON public.prescriptions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_prescription_items ON public.prescription_items;
CREATE POLICY service_role_all_prescription_items ON public.prescription_items
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated clinician full access
DROP POLICY IF EXISTS auth_all_prescriptions ON public.prescriptions;
CREATE POLICY auth_all_prescriptions ON public.prescriptions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS auth_all_prescription_items ON public.prescription_items;
CREATE POLICY auth_all_prescription_items ON public.prescription_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Anon client read-write policies (consistent with existing Kong gateway design)
DROP POLICY IF EXISTS anon_all_prescriptions ON public.prescriptions;
CREATE POLICY anon_all_prescriptions ON public.prescriptions
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS anon_all_prescription_items ON public.prescription_items;
CREATE POLICY anon_all_prescription_items ON public.prescription_items
    FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Grant permissions to roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO anon, authenticated;
GRANT ALL ON public.prescriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_items TO anon, authenticated;
GRANT ALL ON public.prescription_items TO service_role;

-- 5. Record applied migration
INSERT INTO public._schema_migrations (version, name, applied_at)
VALUES ('003', '003_prescriptions.sql', timezone('utc'::text, now()))
ON CONFLICT (version) DO NOTHING;

-- 6. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
