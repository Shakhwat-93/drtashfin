-- ==============================================================================
-- Migration: 005_doctor_auth_and_rls_hardening.sql
-- Description: Phase 13 — Single-Doctor Authorization Registry, Strict RLS
--              Remediation, Least-Privilege Table Grants & Medico-Legal Triggers
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. Authorized Doctors Registry Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.authorized_doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    doctor_code VARCHAR(64) UNIQUE NOT NULL DEFAULT 'dr-tashfin',
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT 'Dr. Tashfin Ahmed',
    specialty VARCHAR(255) NOT NULL DEFAULT 'Cardiology & Medicine',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_authorized_doctors_user_id ON public.authorized_doctors (user_id);
CREATE INDEX IF NOT EXISTS idx_authorized_doctors_email ON public.authorized_doctors (email);

DROP TRIGGER IF EXISTS set_authorized_doctors_updated_at ON public.authorized_doctors;
CREATE TRIGGER set_authorized_doctors_updated_at
    BEFORE UPDATE ON public.authorized_doctors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.authorized_doctors ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Authoritative Single-Doctor Verification Function
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_authorized_doctor()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Backend service_role always has administrative authority
    IF current_setting('role', true) = 'service_role' THEN
        RETURN true;
    END IF;

    -- Must be an authenticated session with a non-null UID registered in authorized_doctors
    IF auth.role() = 'authenticated' AND auth.uid() IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1
            FROM public.authorized_doctors d
            WHERE d.user_id = auth.uid()
              AND d.is_active = true
        );
    END IF;

    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.is_authorized_doctor() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_authorized_doctor() TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Remediate Table & Sequence Grants (Least-Privilege Model)
-- ------------------------------------------------------------------------------

-- 3a. Revoke all permissive privileges from PUBLIC and anon on protected tables
REVOKE ALL ON public._schema_migrations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.authorized_doctors FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.patients FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.consultations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.prescriptions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.prescription_items FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.clinical_documents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.medicines FROM PUBLIC, anon, authenticated;

-- 3b. Revoke sequence and ID generator execution from anon
REVOKE ALL ON SEQUENCE public.patient_id_seq FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_next_patient_id() FROM PUBLIC, anon;
REVOKE ALL ON SEQUENCE public.prescription_code_seq FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.generate_next_prescription_code() FROM PUBLIC, anon;

GRANT USAGE, SELECT ON SEQUENCE public.patient_id_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_next_patient_id() TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.prescription_code_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_next_prescription_code() TO authenticated, service_role;

-- 3c. Grant strictly scoped privileges to roles (no TRUNCATE, TRIGGER, or REFERENCES for clients)
GRANT SELECT ON public.authorized_doctors TO authenticated;
GRANT ALL ON public.authorized_doctors TO service_role;

GRANT SELECT ON public._schema_migrations TO authenticated;
GRANT ALL ON public._schema_migrations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO authenticated;
GRANT ALL ON public.consultations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescriptions TO authenticated;
GRANT ALL ON public.prescriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prescription_items TO authenticated;
GRANT ALL ON public.prescription_items TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.clinical_documents TO authenticated;
GRANT ALL ON public.clinical_documents TO service_role;

-- Public medicine catalogue: SELECT only for anon, SELECT/INSERT/UPDATE for authenticated doctor
GRANT SELECT ON public.medicines TO anon, authenticated;
GRANT INSERT, UPDATE ON public.medicines TO authenticated;
GRANT ALL ON public.medicines TO service_role;

-- ------------------------------------------------------------------------------
-- 4. Remediate Row-Level Security (RLS) Policies
-- ------------------------------------------------------------------------------

-- 4a. _schema_migrations
ALTER TABLE public._schema_migrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_all_schema_migrations ON public._schema_migrations;
CREATE POLICY service_role_all_schema_migrations ON public._schema_migrations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS doctor_read_schema_migrations ON public._schema_migrations;
CREATE POLICY doctor_read_schema_migrations ON public._schema_migrations
    FOR SELECT TO authenticated USING (public.is_authorized_doctor());

-- 4b. authorized_doctors
DROP POLICY IF EXISTS service_role_all_authorized_doctors ON public.authorized_doctors;
CREATE POLICY service_role_all_authorized_doctors ON public.authorized_doctors
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS doctor_read_own_profile ON public.authorized_doctors;
CREATE POLICY doctor_read_own_profile ON public.authorized_doctors
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() AND is_active = true);

-- 4c. patients (Remove anon access; enforce is_authorized_doctor())
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read-write on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow authenticated full access on patients" ON public.patients;
DROP POLICY IF EXISTS "Allow service_role full access on patients" ON public.patients;
DROP POLICY IF EXISTS doctor_all_patients ON public.patients;
DROP POLICY IF EXISTS service_role_all_patients ON public.patients;

CREATE POLICY service_role_all_patients ON public.patients
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY doctor_all_patients ON public.patients
    FOR ALL TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- 4d. consultations (Remove anon access; enforce is_authorized_doctor())
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon read-write on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow authenticated full access on consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow service_role full access on consultations" ON public.consultations;
DROP POLICY IF EXISTS doctor_all_consultations ON public.consultations;
DROP POLICY IF EXISTS service_role_all_consultations ON public.consultations;

CREATE POLICY service_role_all_consultations ON public.consultations
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY doctor_all_consultations ON public.consultations
    FOR ALL TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- 4e. medicines (Safe public read of active catalogue; writes restricted to authorized doctor)
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS medicines_read_policy ON public.medicines;
DROP POLICY IF EXISTS service_role_all_medicines ON public.medicines;
DROP POLICY IF EXISTS doctor_write_medicines ON public.medicines;
DROP POLICY IF EXISTS doctor_update_medicines ON public.medicines;

CREATE POLICY service_role_all_medicines ON public.medicines
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY medicines_read_policy ON public.medicines
    FOR SELECT TO anon, authenticated
    USING (status = 'active' OR public.is_authorized_doctor());

CREATE POLICY doctor_write_medicines ON public.medicines
    FOR INSERT TO authenticated
    WITH CHECK (public.is_authorized_doctor());

CREATE POLICY doctor_update_medicines ON public.medicines
    FOR UPDATE TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- 4f. prescriptions (Remove anon access; enforce is_authorized_doctor() & draft-only delete)
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS auth_all_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS service_role_all_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS doctor_select_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS doctor_insert_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS doctor_update_prescriptions ON public.prescriptions;
DROP POLICY IF EXISTS doctor_delete_draft_prescriptions ON public.prescriptions;

CREATE POLICY service_role_all_prescriptions ON public.prescriptions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY doctor_select_prescriptions ON public.prescriptions
    FOR SELECT TO authenticated
    USING (public.is_authorized_doctor());

CREATE POLICY doctor_insert_prescriptions ON public.prescriptions
    FOR INSERT TO authenticated
    WITH CHECK (public.is_authorized_doctor());

CREATE POLICY doctor_update_prescriptions ON public.prescriptions
    FOR UPDATE TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

CREATE POLICY doctor_delete_draft_prescriptions ON public.prescriptions
    FOR DELETE TO authenticated
    USING (public.is_authorized_doctor() AND status = 'draft');

-- 4g. prescription_items (Remove anon access; enforce is_authorized_doctor())
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_all_prescription_items ON public.prescription_items;
DROP POLICY IF EXISTS auth_all_prescription_items ON public.prescription_items;
DROP POLICY IF EXISTS service_role_all_prescription_items ON public.prescription_items;
DROP POLICY IF EXISTS doctor_all_prescription_items ON public.prescription_items;

CREATE POLICY service_role_all_prescription_items ON public.prescription_items
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY doctor_all_prescription_items ON public.prescription_items
    FOR ALL TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- 4h. clinical_documents (Remove anon access; enforce is_authorized_doctor())
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon full access on clinical_documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Allow anon read-write on clinical_documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Allow authenticated full access on clinical_documents" ON public.clinical_documents;
DROP POLICY IF EXISTS "Allow service_role full access on clinical_documents" ON public.clinical_documents;
DROP POLICY IF EXISTS doctor_select_clinical_documents ON public.clinical_documents;
DROP POLICY IF EXISTS doctor_insert_clinical_documents ON public.clinical_documents;
DROP POLICY IF EXISTS service_role_all_clinical_documents ON public.clinical_documents;

CREATE POLICY service_role_all_clinical_documents ON public.clinical_documents
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY doctor_select_clinical_documents ON public.clinical_documents
    FOR SELECT TO authenticated
    USING (public.is_authorized_doctor());

CREATE POLICY doctor_insert_clinical_documents ON public.clinical_documents
    FOR INSERT TO authenticated
    WITH CHECK (public.is_authorized_doctor());

-- ------------------------------------------------------------------------------
-- 5. Database-Level Medico-Legal & Ownership Integrity Triggers
-- ------------------------------------------------------------------------------

-- 5a. Prescription Ownership & Finalization Immutability Trigger
CREATE OR REPLACE FUNCTION public.fn_enforce_prescription_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_consult_patient_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'finalized' THEN
            RAISE EXCEPTION 'Cannot delete a finalized prescription (%). Finalized clinical records are immutable.', OLD.id
                USING ERRCODE = '42501';
        END IF;
        RETURN OLD;
    END IF;

    -- Validate consultation belongs to the same patient (prevent cross-patient association)
    IF NEW.consultation_id IS NOT NULL THEN
        SELECT patient_id INTO v_consult_patient_id
        FROM public.consultations
        WHERE id = NEW.consultation_id;

        IF v_consult_patient_id IS NOT NULL AND v_consult_patient_id <> NEW.patient_id THEN
            RAISE EXCEPTION 'Consultation (%) does not belong to patient (%). Cross-patient prescription association is prohibited.',
                NEW.consultation_id, NEW.patient_id
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF TG_OP = 'UPDATE' AND OLD.status = 'finalized' THEN
        -- Once finalized, clinical content fields cannot be mutated; only archive pointers may be updated
        IF NEW.patient_id IS DISTINCT FROM OLD.patient_id
           OR NEW.consultation_id IS DISTINCT FROM OLD.consultation_id
           OR NEW.prescription_code IS DISTINCT FROM OLD.prescription_code
           OR NEW.status IS DISTINCT FROM OLD.status
           OR NEW.prescription_date IS DISTINCT FROM OLD.prescription_date
           OR NEW.advice IS DISTINCT FROM OLD.advice
           OR NEW.follow_up_date IS DISTINCT FROM OLD.follow_up_date
           OR NEW.follow_up_instructions IS DISTINCT FROM OLD.follow_up_instructions
           OR NEW.notes IS DISTINCT FROM OLD.notes
        THEN
            RAISE EXCEPTION 'Cannot modify clinical content of a finalized prescription (%). Clinical records are locked for audit integrity.', OLD.id
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_prescription_integrity ON public.prescriptions;
CREATE TRIGGER trg_enforce_prescription_integrity
    BEFORE INSERT OR UPDATE OR DELETE ON public.prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_enforce_prescription_integrity();

-- 5b. Prescription Items Immutability Trigger when Parent Prescription is Finalized
CREATE OR REPLACE FUNCTION public.fn_protect_finalized_prescription_items()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_rx_status VARCHAR(32);
    v_rx_id UUID;
BEGIN
    v_rx_id := COALESCE(NEW.prescription_id, OLD.prescription_id);

    SELECT status INTO v_rx_status
    FROM public.prescriptions
    WHERE id = v_rx_id;

    IF v_rx_status = 'finalized' THEN
        RAISE EXCEPTION 'Cannot insert, update, or delete items of a finalized prescription (%).', v_rx_id
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_finalized_prescription_items ON public.prescription_items;
CREATE TRIGGER trg_protect_finalized_prescription_items
    BEFORE INSERT OR UPDATE OR DELETE ON public.prescription_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_protect_finalized_prescription_items();

-- 5c. Archived Clinical Documents Immutability Trigger
CREATE OR REPLACE FUNCTION public.fn_protect_archived_clinical_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.category = 'prescription' AND OLD.content_hash IS NOT NULL AND OLD.content_hash <> '' THEN
            RAISE EXCEPTION 'Cannot delete archived prescription document (%). Archived clinical documents are protected.', OLD.id
                USING ERRCODE = '42501';
        END IF;
        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.category = 'prescription' AND OLD.content_hash IS NOT NULL AND OLD.content_hash <> '' THEN
            IF NEW.r2_key IS DISTINCT FROM OLD.r2_key
               OR NEW.content_hash IS DISTINCT FROM OLD.content_hash
               OR NEW.version IS DISTINCT FROM OLD.version
               OR NEW.prescription_id IS DISTINCT FROM OLD.prescription_id
               OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
            THEN
                RAISE EXCEPTION 'Cannot alter cryptographic hash, storage key, or ownership of archived clinical document (%).', OLD.id
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_archived_clinical_documents ON public.clinical_documents;
CREATE TRIGGER trg_protect_archived_clinical_documents
    BEFORE UPDATE OR DELETE ON public.clinical_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_protect_archived_clinical_documents();

-- ------------------------------------------------------------------------------
-- 6. Record Migration & Reload PostgREST Schema Cache
-- ------------------------------------------------------------------------------
INSERT INTO public._schema_migrations (version, name, applied_at)
VALUES ('005', '005_doctor_auth_and_rls_hardening.sql', timezone('utc'::text, now()))
ON CONFLICT (version) DO UPDATE
SET applied_at = timezone('utc'::text, now()),
    name = '005_doctor_auth_and_rls_hardening.sql';

NOTIFY pgrst, 'reload schema';

COMMIT;
