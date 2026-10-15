-- Phase 29: Doctor Lifetime Achievements & Evidence Management Rollback
-- Drops public.doctor_achievements table and associated indexes/policies/triggers

DROP TABLE IF EXISTS public.doctor_achievements CASCADE;
