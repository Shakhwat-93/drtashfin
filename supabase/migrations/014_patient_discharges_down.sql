-- Rollback migration for Phase 28: Patient Discharge & Final Clinical Report Management
DROP TABLE IF EXISTS public.patient_discharges CASCADE;
