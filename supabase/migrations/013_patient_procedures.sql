-- Phase 27: Patient Operation & Procedure History Management
-- 1. Create public.patient_procedures table for operations and medical procedures
-- 2. Trigger for auto-updating updated_at
-- 3. High-performance lookup indexes for patient, consultation, date, and category
-- 4. Scoped RLS policies for public.is_authorized_doctor() and service_role
-- 5. Least-privilege grants

CREATE TABLE IF NOT EXISTS public.patient_procedures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID NULL REFERENCES public.consultations(id) ON DELETE SET NULL,
    procedure_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (
        category IN (
            'Surgery',
            'Minor Procedure',
            'Diagnostic Procedure',
            'Therapeutic Procedure',
            'Other'
        )
    ),
    procedure_date DATE NOT NULL,
    hospital_facility VARCHAR(255) NULL,
    performing_doctor VARCHAR(255) NULL,
    clinical_indication TEXT NULL,
    doctor_notes TEXT NULL,
    outcome TEXT NULL,
    complications TEXT NULL,
    recovery_notes TEXT NULL,
    drive_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_patient_procedures_patient ON public.patient_procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_procedures_consultation ON public.patient_procedures(consultation_id);
CREATE INDEX IF NOT EXISTS idx_patient_procedures_date ON public.patient_procedures(procedure_date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_procedures_category ON public.patient_procedures(category);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_patient_procedures_updated_at ON public.patient_procedures;
CREATE TRIGGER set_patient_procedures_updated_at
    BEFORE UPDATE ON public.patient_procedures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row-Level Security
ALTER TABLE public.patient_procedures ENABLE ROW LEVEL SECURITY;

-- Doctor access policy
DROP POLICY IF EXISTS "Allow authorized doctors to manage patient_procedures" ON public.patient_procedures;
CREATE POLICY "Allow authorized doctors to manage patient_procedures"
    ON public.patient_procedures
    FOR ALL
    TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- Service role access policy
DROP POLICY IF EXISTS "Allow service role full access to patient_procedures" ON public.patient_procedures;
CREATE POLICY "Allow service role full access to patient_procedures"
    ON public.patient_procedures
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Least-privilege grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_procedures TO authenticated;
GRANT ALL ON public.patient_procedures TO service_role;
