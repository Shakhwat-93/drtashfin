-- Phase 29: Doctor Lifetime Achievements & Evidence Management
-- 1. Create public.doctor_achievements table for professional achievements and evidence records
-- 2. Trigger for auto-updating updated_at
-- 3. Lookup and sorting indexes for category, dates, display order, and published status
-- 4. Scoped RLS policies for public.is_authorized_doctor() and service_role
-- 5. Least-privilege grants

CREATE TABLE IF NOT EXISTS public.doctor_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL CHECK (
        category IN (
            'Academic Qualifications',
            'Professional Certifications',
            'Awards & Honors',
            'Medical Training & Workshops',
            'Conferences & Seminars',
            'Research & Publications',
            'Professional Memberships',
            'Career Milestones',
            'Other Achievements'
        )
    ),
    institution VARCHAR(255) NULL,
    achievement_date DATE NULL,
    expiration_date DATE NULL,
    description TEXT NULL,
    evidence_title VARCHAR(255) NULL,
    drive_url TEXT NULL,
    publication_url TEXT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    doctor_id VARCHAR(255) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_achievement_dates CHECK (
        expiration_date IS NULL OR achievement_date IS NULL OR expiration_date >= achievement_date
    )
);

-- Performance and lookup indexes
CREATE INDEX IF NOT EXISTS idx_doctor_achievements_category ON public.doctor_achievements(category);
CREATE INDEX IF NOT EXISTS idx_doctor_achievements_date ON public.doctor_achievements(achievement_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_doctor_achievements_order ON public.doctor_achievements(display_order ASC, achievement_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_doctor_achievements_published ON public.doctor_achievements(is_published);

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS set_doctor_achievements_updated_at ON public.doctor_achievements;
CREATE TRIGGER set_doctor_achievements_updated_at
    BEFORE UPDATE ON public.doctor_achievements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row-Level Security
ALTER TABLE public.doctor_achievements ENABLE ROW LEVEL SECURITY;

-- Doctor access policy: Authorized clinicians have full access to manage achievements
DROP POLICY IF EXISTS "Allow authorized doctors to manage doctor_achievements" ON public.doctor_achievements;
CREATE POLICY "Allow authorized doctors to manage doctor_achievements"
    ON public.doctor_achievements
    FOR ALL
    TO authenticated
    USING (public.is_authorized_doctor())
    WITH CHECK (public.is_authorized_doctor());

-- Service role access policy: Full access for server-side maintenance and migrations
DROP POLICY IF EXISTS "Allow service role full access to doctor_achievements" ON public.doctor_achievements;
CREATE POLICY "Allow service role full access to doctor_achievements"
    ON public.doctor_achievements
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Least-privilege grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_achievements TO authenticated;
GRANT ALL ON public.doctor_achievements TO service_role;
