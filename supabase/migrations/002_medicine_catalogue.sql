-- ==============================================================================
-- Migration: 002_medicine_catalogue.sql
-- Description: Bangladesh Medicine Catalogue schema with full-text/trigram search
-- Provenance: MedEx Bangladesh pharmaceutical reference dataset
-- ==============================================================================

-- 1. Enable pg_trgm extension for fast partial/substring autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Create medicines table
CREATE TABLE IF NOT EXISTS public.medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255) NOT NULL,
    strength VARCHAR(100),
    dosage_form VARCHAR(100),
    manufacturer VARCHAR(255),
    medicine_type VARCHAR(32) NOT NULL DEFAULT 'allopathic' CHECK (medicine_type IN ('allopathic', 'herbal')),
    package_container VARCHAR(255),
    pack_size_info VARCHAR(255),
    source VARCHAR(32) NOT NULL DEFAULT 'medex',
    source_id VARCHAR(64) UNIQUE, -- Stable MedEx brand ID to prevent duplicate imports
    source_url TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending_verification')),
    search_terms TEXT NOT NULL, -- Normalized searchable text: brand + generic + strength + manufacturer
    indications TEXT,
    dosage_description TEXT,
    side_effects TEXT,
    contraindications TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Indexes for fast search
-- Trigram index on search_terms for lightning-fast sub-5ms ILIKE queries
CREATE INDEX IF NOT EXISTS idx_medicines_search_trgm 
ON public.medicines USING gin (search_terms gin_trgm_ops);

-- B-Tree indexes on core query fields
CREATE INDEX IF NOT EXISTS idx_medicines_brand_name 
ON public.medicines (brand_name);

CREATE INDEX IF NOT EXISTS idx_medicines_generic_name 
ON public.medicines (generic_name);

CREATE INDEX IF NOT EXISTS idx_medicines_manufacturer 
ON public.medicines (manufacturer);

CREATE INDEX IF NOT EXISTS idx_medicines_dosage_form 
ON public.medicines (dosage_form);

CREATE INDEX IF NOT EXISTS idx_medicines_source_id 
ON public.medicines (source_id);

-- 4. Automatically update search_terms and updated_at on change
CREATE OR REPLACE FUNCTION public.fn_medicines_before_save()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    -- Automatically generate normalized search_terms if empty or updated
    NEW.search_terms = lower(
        trim(
            concat_ws(' ', 
                COALESCE(NEW.brand_name, ''), 
                COALESCE(NEW.generic_name, ''), 
                COALESCE(NEW.strength, ''), 
                COALESCE(NEW.dosage_form, ''), 
                COALESCE(NEW.manufacturer, '')
            )
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medicines_before_save ON public.medicines;
CREATE TRIGGER trg_medicines_before_save
BEFORE INSERT OR UPDATE ON public.medicines
FOR EACH ROW EXECUTE FUNCTION public.fn_medicines_before_save();

-- 5. Row Level Security (RLS)
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS service_role_all_medicines ON public.medicines;
CREATE POLICY service_role_all_medicines ON public.medicines
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Public read access for authenticated and anonymous doctor clients
DROP POLICY IF EXISTS medicines_read_policy ON public.medicines;
CREATE POLICY medicines_read_policy ON public.medicines
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- 6. Grant permissions
GRANT SELECT ON public.medicines TO anon, authenticated;
GRANT ALL ON public.medicines TO service_role;

-- 7. Record migration in _schema_migrations
INSERT INTO public._schema_migrations (version, name, applied_at)
VALUES ('002', '002_medicine_catalogue.sql', timezone('utc'::text, now()))
ON CONFLICT (version) DO NOTHING;

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
