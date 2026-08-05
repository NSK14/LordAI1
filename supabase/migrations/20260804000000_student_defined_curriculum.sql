-- Student-defined curriculum
-- Supports first-time Study onboarding (class selection), student-created
-- subjects, and student-created concepts that flow through planning, practice,
-- mastery and the AI tutor.
--
-- learning_concepts stays a read-only shared catalog. Student-owned concepts
-- live in learning_user_concepts and reuse the same id namespace shape, so they
-- can be referenced from the existing user-scoped learning tables.

-- 1. Persist the student's class selection and custom subject list on the profile.
ALTER TABLE public.learning_profiles
  ADD COLUMN IF NOT EXISTS class TEXT CHECK (class IS NULL OR (class ~ '^\d{1,2}$' AND class::integer BETWEEN 1 AND 12)),
  ADD COLUMN IF NOT EXISTS custom_subjects JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.learning_profiles.class IS
  'Selected school class (1-12). NULL means onboarding has not completed.';
COMMENT ON COLUMN public.learning_profiles.custom_subjects IS
  'Array of {name, description?} objects for student-created subjects.';

-- 2. Student-owned concepts (custom) with the same shape as the catalog plus
--    provenance flags so the UI/routes can distinguish them.
CREATE TABLE IF NOT EXISTS public.learning_user_concepts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  standard_code TEXT NOT NULL DEFAULT '',
  framework TEXT NOT NULL DEFAULT 'CBSE' CHECK (framework IN ('CBSE', 'COMMON_CORE', 'NGSS')),
  grade_band TEXT NOT NULL CHECK (grade_band IN ('middle', 'high')),
  "class" TEXT CHECK ("class" IS NULL OR ("class" ~ '^\d{1,2}$' AND "class"::integer BETWEEN 1 AND 12)),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  prerequisites TEXT[] NOT NULL DEFAULT '{}',
  chapter TEXT,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  misconception_tags TEXT[] NOT NULL DEFAULT '{}',
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  estimated_study_minutes INTEGER,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS learning_user_concepts_user_subject_title_idx
  ON public.learning_user_concepts (user_id, subject, title);

-- Keep updated_at in sync.
CREATE OR REPLACE FUNCTION public.set_learning_user_concepts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.learning_user_concepts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.learning_user_concepts
  FOR EACH ROW EXECUTE FUNCTION public.set_learning_user_concepts_updated_at();

-- 3. Allow student-defined concept ids to be referenced from the user-scoped
--    learning tables (plan tasks, mastery, attempts, sessions). learning_concepts
--    is read-only, so custom concept ids cannot live there; dropping the FK on
--    these user-owned tables lets custom concepts participate in planning,
--    practice and mastery without creating a second learning-state system.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.table_name, tc.constraint_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints rc
      ON rc.constraint_name = tc.constraint_name
     AND rc.constraint_schema = tc.table_schema
    JOIN information_schema.table_constraints rc_for
      ON rc_for.constraint_name = rc.unique_constraint_name
     AND rc_for.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ANY (ARRAY[
        'learning_mastery',
        'learning_attempts',
        'learning_plan_tasks',
        'learning_sessions'
      ])
      AND kcu.column_name = 'concept_id'
      AND rc_for.table_name = 'learning_concepts'
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.learning_user_concepts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Learning rows belong to user" ON public.learning_user_concepts;
CREATE POLICY "Learning rows belong to user" ON public.learning_user_concepts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_user_concepts TO authenticated;
