-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for Doctor Patient Management System
-- Tables: patients, consultations, clinical_documents, _schema_migrations
-- ==============================================================================

-- 1. Enable UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Schema Migrations Audit Table
CREATE TABLE IF NOT EXISTS public._schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Patient ID Sequence and Generator Function
CREATE SEQUENCE IF NOT EXISTS public.patient_id_seq START 1;
GRANT USAGE, SELECT ON SEQUENCE public.patient_id_seq TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.generate_next_patient_id()
RETURNS VARCHAR(32) AS $$
DECLARE
    next_seq BIGINT;
BEGIN
    SELECT nextval('public.patient_id_seq') INTO next_seq;
    RETURN 'PT-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;
GRANT EXECUTE ON FUNCTION public.generate_next_patient_id() TO anon, authenticated, service_role;

-- 4. Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Patients Table
CREATE TABLE IF NOT EXISTS public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id VARCHAR(32) UNIQUE NOT NULL DEFAULT public.generate_next_patient_id(),
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(16) NOT NULL CHECK (gender IN ('male', 'female', 'other')),
    weight NUMERIC(5, 2),
    phone VARCHAR(32),
    email VARCHAR(255),
    address TEXT,
    blood_group VARCHAR(8) CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast patient lookup
CREATE INDEX IF NOT EXISTS idx_patients_patient_id ON public.patients (patient_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON public.patients (name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON public.patients (phone);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON public.patients (created_at DESC);

-- Trigger for auto-updating updated_at on patients
DROP TRIGGER IF EXISTS set_patients_updated_at ON public.patients;
CREATE TRIGGER set_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Consultations Table
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    patient_code VARCHAR(32),
    consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Clinical History
    chief_complaint TEXT,
    birth_history TEXT,
    family_history TEXT,
    consanguinity VARCHAR(8) CHECK (consanguinity IN ('yes', 'no')),
    drug_history TEXT,
    others TEXT,
    
    -- Examination
    clinical_examination TEXT,
    
    -- Investigations
    investigation_advised TEXT,
    current_investigation TEXT,
    
    -- Diagnoses
    provisional_diagnosis TEXT,
    differential_diagnosis TEXT,
    
    -- Plan & Management
    plan TEXT,
    advice TEXT,
    next_follow_up DATE,
    
    -- Audit Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for consultation querying
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON public.consultations (patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_code ON public.consultations (patient_code);
CREATE INDEX IF NOT EXISTS idx_consultations_date ON public.consultations (consultation_date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_created_at ON public.consultations (created_at DESC);

-- Trigger for auto-updating updated_at on consultations
DROP TRIGGER IF EXISTS set_consultations_updated_at ON public.consultations;
CREATE TRIGGER set_consultations_updated_at
    BEFORE UPDATE ON public.consultations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Clinical Documents Table (Cloudflare R2 File References)
CREATE TABLE IF NOT EXISTS public.clinical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (category IN ('lab-report', 'prescription', 'discharge-summary', 'consent', 'imaging')),
    r2_key VARCHAR(512) NOT NULL,
    file_url TEXT,
    file_size_bytes BIGINT,
    mime_type VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_documents_patient_id ON public.clinical_documents (patient_id);

-- 7. Row Level Security (RLS) Configuration
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

-- Service Role Policies (Full Unrestricted Access for Backend/API)
CREATE POLICY "Allow service_role full access on patients"
    ON public.patients FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on consultations"
    ON public.consultations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow service_role full access on clinical_documents"
    ON public.clinical_documents FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated Staff Policies (Authorized Doctor/Staff Session)
CREATE POLICY "Allow authenticated full access on patients"
    ON public.patients FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on consultations"
    ON public.consultations FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated full access on clinical_documents"
    ON public.clinical_documents FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Anon Client Policies (Authorized Application Client via Kong)
CREATE POLICY "Allow anon read-write on patients"
    ON public.patients FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon read-write on consultations"
    ON public.consultations FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow anon read-write on clinical_documents"
    ON public.clinical_documents FOR ALL
    TO anon
    USING (true)
    WITH CHECK (true);

-- Record applied migration
INSERT INTO public._schema_migrations (version, name)
VALUES ('001', 'initial_schema')
ON CONFLICT (version) DO NOTHING;
