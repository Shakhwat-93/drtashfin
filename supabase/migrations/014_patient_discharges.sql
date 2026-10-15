-- Phase 28: Patient Discharge & Final Clinical Report Management
-- 1. Create public.patient_discharges table
-- 2. Trigger for auto-updating updated_at
-- 3. Performance and lookup indexes
-- 4. Scoped RLS policies for public.is_authorized_doctor() and service_role
-- 5. Least-privilege grants

CREATE TABLE IF NOT EXISTS public.patient_discharges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID NULL REFERENCES public.consultations(id) ON DELETE SET NULL,
    discharge_date DATE NOT NULL,
    discharge_time TIME NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized')),
    clinical_reason TEXT NOT NULL,
    final_diagnosis TEXT NOT NULL,
    treatment_summary TEXT NOT NULL,
    condition_at_discharge VARCHAR(64) NOT NULL CHECK (
        condition_at_discharge IN (
            'Recovered',
            'Improved',
            'Stable',
            'Unchanged',
            'Deteriorated',
            'Transferred',
            'Discharged Against Medical Advice',
            'Other'
        )
    ),
    discharge_instructions TEXT NOT NULL,
    medication_instructions TEXT NULL,
    recommended_follow_up_date DATE NULL,
    follow_up_instructions TEXT NULL,
    complications TEXT NULL,
    doctor_id VARCHAR(255) NULL,
    doctor_name VARCHAR(255) NULL,
    drive_url TEXT NULL,
    finalized_at TIMESTAMPTZ NULL,
    finalized_by VARCHAR(255) NULL,
    amendment_notes TEXT NULL,
    amended_at TIMESTAMPTZ NULL,
    amended_by VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_patient_discharges_patient ON public.patient_discharges(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_discharges_consultation ON public.patient_discharges(consultation_id);
CREATE INDEX IF NOT EXISTS idx_patient_discharges_date ON public.patient_discharges(discharge_date DESC);
CREATE INDEX IF NOT EXISTS idx_patient_discharges_status ON public.patient_discharges(status);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_patient_discharges_updated_at ON public.patient_discharges;
CREATE TRIGGER set_patient_discharges_updated_at
    BEFORE UPDATE ON public.patient_discharges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row-Level Security
ALTER TABLE public.patient_discharges ENABLE ROW LEVEL SECURITY;

-- Doctor access policy
DROP POLICY IF EXISTS "Allow authorized doctors to manage patient_discharges" ON public.patient_discharges;
CREATE POLICY "Allow authorized doctors to manage patient_discharges"
    ON public.patient_discharges
    FOR ALL
    TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- Service role access policy
DROP POLICY IF EXISTS "Allow service role full access to patient_discharges" ON public.patient_discharges;
CREATE POLICY "Allow service role full access to patient_discharges"
    ON public.patient_discharges
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Least-privilege grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_discharges TO authenticated;
GRANT ALL ON public.patient_discharges TO service_role;
