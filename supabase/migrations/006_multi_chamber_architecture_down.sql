-- ==============================================================================
-- Rollback Migration: 006_multi_chamber_architecture_down.sql
-- Description: Reverts Migration 006 safely without touching historical data
-- ==============================================================================

BEGIN;

-- Drop Triggers
DROP TRIGGER IF EXISTS trg_sync_clinical_document_chamber ON public.clinical_documents;
DROP FUNCTION IF EXISTS public.fn_sync_clinical_document_chamber();

DROP TRIGGER IF EXISTS trg_sync_prescription_chamber ON public.prescriptions;
DROP FUNCTION IF EXISTS public.fn_sync_prescription_chamber();

DROP TRIGGER IF EXISTS trg_sync_consultation_chamber ON public.consultations;
DROP FUNCTION IF EXISTS public.fn_sync_consultation_chamber();

DROP TRIGGER IF EXISTS trg_assign_patient_id_and_chamber ON public.patients;
DROP FUNCTION IF EXISTS public.fn_assign_patient_id_and_chamber();

DROP FUNCTION IF EXISTS public.generate_chamber_patient_id(UUID);

-- Drop Chamber Columns
ALTER TABLE public.clinical_documents DROP COLUMN IF EXISTS chamber_id;
ALTER TABLE public.prescriptions DROP COLUMN IF EXISTS chamber_id;
ALTER TABLE public.consultations DROP COLUMN IF EXISTS chamber_id;
ALTER TABLE public.patients DROP COLUMN IF EXISTS chamber_id;
ALTER TABLE public.patients ALTER COLUMN patient_id SET DEFAULT generate_next_patient_id();

-- Drop Sequences
DROP SEQUENCE IF EXISTS public.patient_id_seq_dh;
DROP SEQUENCE IF EXISTS public.patient_id_seq_rng;
DROP SEQUENCE IF EXISTS public.patient_id_seq_n;

-- Drop Chambers Table
DROP TABLE IF EXISTS public.chambers CASCADE;

-- Revert Migration Entry
DELETE FROM public._schema_migrations WHERE version = '006';

NOTIFY pgrst, 'reload schema';

COMMIT;
