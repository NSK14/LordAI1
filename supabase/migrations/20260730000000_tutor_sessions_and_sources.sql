-- Durable, learner-private state for the adaptive tutor and sourced study work.
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS misconception_tags TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Tutor session',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.learning_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL, source_ids UUID[] NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES public.learning_concepts(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('practice', 'reflection', 'teacher-source')),
  score NUMERIC(4,3), note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('flashcards', 'notes', 'diagram', 'test', 'revision')),
  title TEXT NOT NULL, content JSONB NOT NULL DEFAULT '{}', ai_generated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.learning_source_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), source_id UUID NOT NULL REFERENCES public.learning_sources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source_id, chunk_index)
);
CREATE TABLE IF NOT EXISTS public.learning_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('lti', 'google_drive', 'google_classroom', 'microsoft')),
  status TEXT NOT NULL DEFAULT 'not_connected' CHECK (status IN ('not_connected', 'connected', 'error', 'disconnected')),
  display_name TEXT, metadata JSONB NOT NULL DEFAULT '{}', connected_at TIMESTAMPTZ, last_synced_at TIMESTAMPTZ,
  UNIQUE(user_id, provider)
);
CREATE INDEX IF NOT EXISTS learning_messages_session_idx ON public.learning_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS learning_source_chunks_source_idx ON public.learning_source_chunks(source_id, chunk_index);

ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_source_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_integrations ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY['learning_sessions','learning_messages','learning_evidence','learning_artifacts','learning_source_chunks','learning_integrations'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Learning rows belong to user" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Learning rows belong to user" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
  END LOOP;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_sessions, public.learning_messages, public.learning_evidence, public.learning_artifacts, public.learning_source_chunks, public.learning_integrations TO authenticated;
