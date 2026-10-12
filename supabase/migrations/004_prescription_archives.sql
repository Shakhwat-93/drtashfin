-- ==============================================================================
-- Migration: 004_prescription_archives.sql
-- Description: Prescription PDF document integrity, versioning, and Cloudflare R2 archival
-- ==============================================================================

-- 1. Enrich existing clinical_documents table with prescription archive metadata
ALTER TABLE public.clinical_documents
    ADD COLUMN IF NOT EXISTS prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64) NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ADD COLUMN IF NOT EXISTS archived_by VARCHAR(64) NOT NULL DEFAULT 'dr-tashfin';

-- 2. Prevent duplicate archival versions for the same prescription
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinical_documents_rx_version 
    ON public.clinical_documents (prescription_id, version) 
    WHERE prescription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_documents_prescription_id 
    ON public.clinical_documents (prescription_id);

-- 3. Add latest archive pointers to prescriptions table for O(1) status lookups
ALTER TABLE public.prescriptions
    ADD COLUMN IF NOT EXISTS archived_document_id UUID REFERENCES public.clinical_documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS archived_pdf_key VARCHAR(512),
    ADD COLUMN IF NOT EXISTS archived_pdf_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS archived_pdf_size BIGINT,
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS archive_version INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_prescriptions_archived_document_id 
    ON public.prescriptions (archived_document_id);

-- 4. Ensure RLS policies on clinical_documents allow authorized & authenticated access
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinical_documents' AND policyname = 'Allow anon full access on clinical_documents'
    ) THEN
        CREATE POLICY "Allow anon full access on clinical_documents"
            ON public.clinical_documents FOR ALL
            TO anon
            USING (true)
            WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clinical_documents' AND policyname = 'Allow authenticated full access on clinical_documents'
    ) THEN
        CREATE POLICY "Allow authenticated full access on clinical_documents"
            ON public.clinical_documents FOR ALL
            TO authenticated
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

-- 5. Record version 004 in schema migrations
INSERT INTO public._schema_migrations (version, name, applied_at)
VALUES ('004', '004_prescription_archives.sql', NOW())
ON CONFLICT (version) DO UPDATE 
SET applied_at = NOW(), name = '004_prescription_archives.sql';
