-- Persistent, student-only learning platform. Curriculum rows are shared and
-- every learner-created row is protected by auth.uid()-scoped RLS.
CREATE TABLE IF NOT EXISTS public.learning_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  grade_band TEXT NOT NULL DEFAULT 'middle' CHECK (grade_band IN ('middle', 'high')),
  curriculum TEXT NOT NULL DEFAULT 'CBSE',
  subjects TEXT[] NOT NULL DEFAULT '{}', goals TEXT[] NOT NULL DEFAULT '{}', interests TEXT[] NOT NULL DEFAULT '{}',
  preferred_language TEXT NOT NULL DEFAULT 'en', explanation_depth TEXT NOT NULL DEFAULT 'standard'
    CHECK (explanation_depth IN ('concise', 'standard', 'detailed')),
  reminders_enabled BOOLEAN NOT NULL DEFAULT false, weekly_minutes INTEGER NOT NULL DEFAULT 180 CHECK (weekly_minutes BETWEEN 30 AND 1680),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_concepts (
  id TEXT PRIMARY KEY, standard_code TEXT NOT NULL, framework TEXT NOT NULL CHECK (framework IN ('CBSE', 'COMMON_CORE', 'NGSS')),
  subject TEXT NOT NULL, grade_band TEXT NOT NULL CHECK (grade_band IN ('middle', 'high')),
  title TEXT NOT NULL, description TEXT NOT NULL, prerequisites TEXT[] NOT NULL DEFAULT '{}', version INTEGER NOT NULL DEFAULT 1,
  source_url TEXT, license TEXT NOT NULL DEFAULT 'open-standards', reviewed BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_mastery (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, concept_id TEXT NOT NULL REFERENCES public.learning_concepts(id) ON DELETE CASCADE,
  score NUMERIC(4,3) NOT NULL DEFAULT 0.35 CHECK (score BETWEEN 0 AND 1), confidence NUMERIC(4,3) NOT NULL DEFAULT 0.2 CHECK (confidence BETWEEN 0 AND 1),
  evidence_count INTEGER NOT NULL DEFAULT 0, last_practiced_at TIMESTAMPTZ, next_review_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE TABLE IF NOT EXISTS public.learning_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES public.learning_concepts(id) ON DELETE RESTRICT, question JSONB NOT NULL, answer JSONB NOT NULL DEFAULT '{}',
  correct BOOLEAN, score NUMERIC(4,3), misconception TEXT, feedback TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL, starts_on DATE NOT NULL, ends_on DATE NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  generated_from JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_plan_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), plan_id UUID NOT NULL REFERENCES public.learning_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  title TEXT NOT NULL, task_type TEXT NOT NULL CHECK (task_type IN ('learn', 'practice', 'review', 'reflect')), due_at TIMESTAMPTZ NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 15, status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, mime_type TEXT NOT NULL, storage_path TEXT, extracted_text TEXT, source_kind TEXT NOT NULL CHECK (source_kind IN ('upload', 'paste', 'catalog')),
  provenance_url TEXT, license TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.learning_sources(id) ON DELETE CASCADE, user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, title TEXT NOT NULL, summary TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('article', 'video', 'simulation', 'activity', 'ai-study')), url TEXT,
  provenance TEXT NOT NULL, license TEXT, reviewed BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, name TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_board_items (
  board_id UUID NOT NULL REFERENCES public.learning_boards(id) ON DELETE CASCADE, resource_id UUID NOT NULL REFERENCES public.learning_resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (board_id, resource_id)
);
CREATE TABLE IF NOT EXISTS public.learning_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.learning_plan_tasks(id) ON DELETE CASCADE, message TEXT NOT NULL, scheduled_for TIMESTAMPTZ NOT NULL,
  delivered_at TIMESTAMPTZ, dismissed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS learning_mastery_review_idx ON public.learning_mastery(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS learning_tasks_due_idx ON public.learning_plan_tasks(user_id, status, due_at);
CREATE INDEX IF NOT EXISTS learning_attempts_user_concept_idx ON public.learning_attempts(user_id, concept_id, created_at DESC);

ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_board_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_concepts ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY['learning_profiles','learning_mastery','learning_attempts','learning_plans','learning_plan_tasks','learning_sources','learning_boards','learning_board_items','learning_reminders'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Learning rows belong to user" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Learning rows belong to user" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Learners read catalog and own resources" ON public.learning_resources;
CREATE POLICY "Learners read catalog and own resources" ON public.learning_resources FOR SELECT TO authenticated USING (user_id IS NULL OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Learners manage own resources" ON public.learning_resources;
CREATE POLICY "Learners manage own resources" ON public.learning_resources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Authenticated users read curriculum" ON public.learning_concepts;
CREATE POLICY "Authenticated users read curriculum" ON public.learning_concepts FOR SELECT TO authenticated USING (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_profiles, public.learning_mastery, public.learning_attempts, public.learning_plans, public.learning_plan_tasks, public.learning_sources, public.learning_resources, public.learning_boards, public.learning_board_items, public.learning_reminders TO authenticated;
GRANT SELECT ON public.learning_concepts TO authenticated;

INSERT INTO public.learning_concepts (id, standard_code, framework, subject, grade_band, title, description, prerequisites) VALUES
 ('cbse-math-8-linear-equations','CBSE-8-MATH-2','CBSE','Mathematics','middle','Linear equations','Solve and model one-variable linear equations.', '{}'),
 ('cbse-math-10-quadratic','CBSE-10-MATH-4','CBSE','Mathematics','high','Quadratic equations','Factor and solve quadratic equations.', ARRAY['cbse-math-8-linear-equations']),
 ('cbse-physics-10-light','CBSE-10-SCI-10','CBSE','Physics','high','Light and reflection','Explain reflection, refraction, and optical systems.', '{}'),
 ('cbse-bio-10-life-processes','CBSE-10-SCI-6','CBSE','Biology','high','Life processes','Relate nutrition, respiration, transport, and excretion.', '{}'),
 ('ccss-math-8-ee-c7','CCSS.MATH.8.EE.C.7','COMMON_CORE','Mathematics','middle','Solve linear equations','Solve linear equations and interpret solutions.', '{}'),
 ('ccss-math-hsa-rei-b4','CCSS.MATH.HSA.REI.B.4','COMMON_CORE','Mathematics','high','Quadratic equations','Solve quadratic equations by multiple methods.', ARRAY['ccss-math-8-ee-c7']),
 ('ngss-ms-ps1-2','MS-PS1-2','NGSS','Chemistry','middle','Matter and reactions','Analyze properties before and after a chemical reaction.', '{}'),
 ('ngss-hs-ls1-2','HS-LS1-2','NGSS','Biology','high','Cellular energy','Model how cells transform matter and energy.', '{}')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, version = public.learning_concepts.version + 1;
