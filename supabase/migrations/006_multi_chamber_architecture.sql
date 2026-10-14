-- ==============================================================================
-- Migration: 006_multi_chamber_architecture.sql
-- Description: Phase 21 — Multi-Chamber Architecture & Chamber-Wise Patient Management
--              - Creates public.chambers table with idempotent seeding (Dhaka, Rangpur, Narayanganj)
--              - Adds chamber-specific concurrency-safe sequences and ID generators
--              - Scopes patients, consultations, prescriptions, and clinical documents to chambers
--              - Preserves existing legacy records with NULL chamber_id (unassigned/recoverable)
--              - Grants least-privilege permissions and PostgREST schema cache reload
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Chambers Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chambers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    patient_id_prefix VARCHAR(16) UNIQUE NOT NULL,
    address TEXT,
    phone VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chambers_code ON public.chambers (code);
CREATE INDEX IF NOT EXISTS idx_chambers_is_active ON public.chambers (is_active);

-- Auto-update updated_at trigger for chambers
DROP TRIGGER IF EXISTS set_chambers_updated_at ON public.chambers;
CREATE TRIGGER set_chambers_updated_at
    BEFORE UPDATE ON public.chambers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on chambers
ALTER TABLE public.chambers ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated authorized doctors can read active chambers
DROP POLICY IF EXISTS "Authorized doctors can view chambers" ON public.chambers;
CREATE POLICY "Authorized doctors can view chambers"
    ON public.chambers
    FOR SELECT
    TO authenticated
    USING (public.is_authorized_doctor());

-- Grants for chambers
GRANT SELECT ON public.chambers TO authenticated;
GRANT ALL ON public.chambers TO service_role;

-- ------------------------------------------------------------------------------
-- 2. Idempotent Chamber Seeding (Dhaka, Rangpur, Narayanganj)
-- ------------------------------------------------------------------------------
-- Stable, deterministic UUIDs ensure portability across environments and drills
INSERT INTO public.chambers (id, code, name, patient_id_prefix, address, phone, is_active)
VALUES
    (
        'd1a4a001-0000-4000-8000-000000000001'::uuid,
        'dhaka',
        'Dhaka Chamber',
        'DH',
        'Green Life Medical Centre, Green Road, Dhanmondi, Dhaka',
        '+8801711000001',
        true
    ),
    (
        'd1a4a002-0000-4000-8000-000000000002'::uuid,
        'rangpur',
        'Rangpur Chamber',
        'RNG',
        'Central Hospital & Diagnostic, Medical Road, Rangpur',
        '+8801711000002',
        true
    ),
    (
        'd1a4a003-0000-4000-8000-000000000003'::uuid,
        'narayanganj',
        'Narayanganj Chamber',
        'N',
        'Popular Diagnostic Centre, B.B. Road, Chashara, Narayanganj',
        '+8801711000003',
        true
    )
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    patient_id_prefix = EXCLUDED.patient_id_prefix,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 3. Chamber-Specific Concurrency-Safe Sequences & Generator Function
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.patient_id_seq_dh START 1;
CREATE SEQUENCE IF NOT EXISTS public.patient_id_seq_rng START 1;
CREATE SEQUENCE IF NOT EXISTS public.patient_id_seq_n START 1;

GRANT USAGE, SELECT ON SEQUENCE public.patient_id_seq_dh TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.patient_id_seq_rng TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.patient_id_seq_n TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generate_chamber_patient_id(p_chamber_id UUID)
RETURNS VARCHAR(32)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefix VARCHAR(16);
    v_next_val BIGINT;
BEGIN
    -- Look up chamber prefix
    SELECT patient_id_prefix INTO v_prefix
    FROM public.chambers
    WHERE id = p_chamber_id;

    IF v_prefix IS NULL THEN
        -- Fallback to legacy sequence if chamber is not found or null
        SELECT nextval('public.patient_id_seq') INTO v_next_val;
        RETURN 'PT-' || LPAD(v_next_val::TEXT, 6, '0');
    END IF;

    -- Concurrency-safe atomic increment per chamber
    IF v_prefix = 'DH' THEN
        SELECT nextval('public.patient_id_seq_dh') INTO v_next_val;
    ELSIF v_prefix = 'RNG' THEN
        SELECT nextval('public.patient_id_seq_rng') INTO v_next_val;
    ELSIF v_prefix = 'N' THEN
        SELECT nextval('public.patient_id_seq_n') INTO v_next_val;
    ELSE
        SELECT nextval('public.patient_id_seq') INTO v_next_val;
    END IF;

    RETURN v_prefix || '-' || LPAD(v_next_val::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_chamber_patient_id(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_chamber_patient_id(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. Scope Clinical Entities to Chambers
-- ------------------------------------------------------------------------------

-- 4a. Patients Table
ALTER TABLE public.patients
    ADD COLUMN IF NOT EXISTS chamber_id UUID REFERENCES public.chambers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_chamber_id ON public.patients (chamber_id);

-- Drop legacy DEFAULT generate_next_patient_id() so chamber trigger controls prefix
ALTER TABLE public.patients ALTER COLUMN patient_id DROP DEFAULT;

-- Trigger: Automatically assign chamber-specific patient_id and compute age on INSERT
CREATE OR REPLACE FUNCTION public.fn_assign_patient_id_and_chamber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Auto-calculate age if missing
    IF NEW.age IS NULL AND NEW.date_of_birth IS NOT NULL THEN
        NEW.age := DATE_PART('year', AGE(CURRENT_DATE, NEW.date_of_birth))::INTEGER;
    END IF;

    -- Assign chamber-specific patient_id if not provided or if legacy default was supplied
    IF NEW.chamber_id IS NOT NULL AND (NEW.patient_id IS NULL OR NEW.patient_id = '' OR NEW.patient_id LIKE 'PT-%') THEN
        NEW.patient_id := public.generate_chamber_patient_id(NEW.chamber_id);
    ELSIF NEW.patient_id IS NULL OR NEW.patient_id = '' THEN
        NEW.patient_id := public.generate_next_patient_id();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_patient_id_and_chamber ON public.patients;
CREATE TRIGGER trg_assign_patient_id_and_chamber
    BEFORE INSERT ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_assign_patient_id_and_chamber();

-- 4b. Consultations Table
ALTER TABLE public.consultations
    ADD COLUMN IF NOT EXISTS chamber_id UUID REFERENCES public.chambers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_consultations_chamber_id ON public.consultations (chamber_id);

-- Trigger: Automatically inherit patient's chamber_id on consultation INSERT if not provided
CREATE OR REPLACE FUNCTION public.fn_sync_consultation_chamber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.chamber_id IS NULL AND NEW.patient_id IS NOT NULL THEN
        SELECT chamber_id INTO NEW.chamber_id FROM public.patients WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_consultation_chamber ON public.consultations;
CREATE TRIGGER trg_sync_consultation_chamber
    BEFORE INSERT ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_consultation_chamber();

-- 4c. Prescriptions Table
ALTER TABLE public.prescriptions
    ADD COLUMN IF NOT EXISTS chamber_id UUID REFERENCES public.chambers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_prescriptions_chamber_id ON public.prescriptions (chamber_id);

-- Trigger: Automatically inherit patient's chamber_id on prescription INSERT if not provided
CREATE OR REPLACE FUNCTION public.fn_sync_prescription_chamber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.chamber_id IS NULL AND NEW.patient_id IS NOT NULL THEN
        SELECT chamber_id INTO NEW.chamber_id FROM public.patients WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_prescription_chamber ON public.prescriptions;
CREATE TRIGGER trg_sync_prescription_chamber
    BEFORE INSERT ON public.prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_prescription_chamber();

-- 4d. Clinical Documents Table
ALTER TABLE public.clinical_documents
    ADD COLUMN IF NOT EXISTS chamber_id UUID REFERENCES public.chambers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_documents_chamber_id ON public.clinical_documents (chamber_id);

-- Trigger: Automatically inherit patient's chamber_id on document INSERT if not provided
CREATE OR REPLACE FUNCTION public.fn_sync_clinical_document_chamber()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.chamber_id IS NULL AND NEW.patient_id IS NOT NULL THEN
        SELECT chamber_id INTO NEW.chamber_id FROM public.patients WHERE id = NEW.patient_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_clinical_document_chamber ON public.clinical_documents;
CREATE TRIGGER trg_sync_clinical_document_chamber
    BEFORE INSERT ON public.clinical_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_clinical_document_chamber();

-- ------------------------------------------------------------------------------
-- 5. Record Migration & Reload PostgREST Schema Cache
-- ------------------------------------------------------------------------------
INSERT INTO public._schema_migrations (version, name, applied_at)
VALUES ('006', '006_multi_chamber_architecture.sql', timezone('utc'::text, now()))
ON CONFLICT (version) DO UPDATE
SET applied_at = timezone('utc'::text, now()),
    name = '006_multi_chamber_architecture.sql';

NOTIFY pgrst, 'reload schema';

COMMIT;
