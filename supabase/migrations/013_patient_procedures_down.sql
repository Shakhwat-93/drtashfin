-- Phase 27 Rollback: Patient Operation & Procedure History Management
-- Safely drops patient_procedures table and associated triggers/policies

DROP TABLE IF EXISTS public.patient_procedures CASCADE;
