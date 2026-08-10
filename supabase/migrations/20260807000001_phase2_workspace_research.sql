-- Phase 2: Intelligence, Research & Workspace
-- Adds projects, research, artifacts, documents, images, and assistant memory.

-- ============================================================
-- PROJECTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS projects_user_pinned_idx ON public.projects(user_id, is_pinned DESC, last_accessed_at DESC);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects"
  ON public.projects FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PROJECT FILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  content TEXT,
  language TEXT DEFAULT 'plaintext',
  size_bytes INTEGER DEFAULT 0,
  is_directory BOOLEAN NOT NULL DEFAULT false,
  parent_id UUID REFERENCES public.project_files(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON public.project_files(project_id);
CREATE INDEX IF NOT EXISTS project_files_user_id_idx ON public.project_files(user_id);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project files"
  ON public.project_files FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- PROJECT DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size_bytes INTEGER DEFAULT 0,
  storage_path TEXT,
  content_text TEXT,
  page_count INTEGER,
  word_count INTEGER DEFAULT 0,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_documents_project_id_idx ON public.project_documents(project_id);
CREATE INDEX IF NOT EXISTS project_documents_user_id_idx ON public.project_documents(user_id);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project documents"
  ON public.project_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RESEARCH SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  depth TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'searching',
  report TEXT,
  summary TEXT,
  confidence_level TEXT,
  conflicting_info JSONB,
  search_provider TEXT DEFAULT 'tavily',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS research_sessions_user_id_idx ON public.research_sessions(user_id);
CREATE INDEX IF NOT EXISTS research_sessions_project_id_idx ON public.research_sessions(project_id);

ALTER TABLE public.research_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own research sessions"
  ON public.research_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- RESEARCH SOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_session_id UUID NOT NULL REFERENCES public.research_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  domain TEXT,
  favicon_url TEXT,
  snippet TEXT,
  content_text TEXT,
  published_at TIMESTAMPTZ,
  is_used BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS research_sources_session_id_idx ON public.research_sources(research_session_id);
CREATE INDEX IF NOT EXISTS research_sources_user_id_idx ON public.research_sources(user_id);

ALTER TABLE public.research_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own research sources"
  ON public.research_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ARTIFACTS (Code Artifacts)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  language TEXT DEFAULT 'typescript',
  framework TEXT,
  files JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS artifacts_user_id_idx ON public.artifacts(user_id);
CREATE INDEX IF NOT EXISTS artifacts_project_id_idx ON public.artifacts(project_id);
CREATE INDEX IF NOT EXISTS artifacts_conversation_id_idx ON public.artifacts(conversation_id);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own artifacts"
  ON public.artifacts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- DOCUMENT CHUNKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.project_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  page_number INTEGER,
  section TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS document_chunks_user_id_idx ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON public.document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own document chunks"
  ON public.document_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SAVED RESPONSES / BOOKMARKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_responses_user_id_idx ON public.saved_responses(user_id);
CREATE INDEX IF NOT EXISTS saved_responses_project_id_idx ON public.saved_responses(project_id);

ALTER TABLE public.saved_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved responses"
  ON public.saved_responses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ASSISTANT MEMORY (Long-term user preferences and context)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assistant_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'preference',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  source TEXT DEFAULT 'inferred',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, key)
);

CREATE INDEX IF NOT EXISTS assistant_memory_user_id_idx ON public.assistant_memory(user_id);

ALTER TABLE public.assistant_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assistant memory"
  ON public.assistant_memory FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- ASSISTANT PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assistant_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_mode TEXT DEFAULT 'balanced',
  smart_routing_enabled BOOLEAN NOT NULL DEFAULT true,
  show_timeline BOOLEAN NOT NULL DEFAULT true,
  show_suggestions BOOLEAN NOT NULL DEFAULT true,
  auto_save_projects BOOLEAN NOT NULL DEFAULT true,
  research_default_depth TEXT DEFAULT 'standard',
  code_theme TEXT DEFAULT 'vs-dark',
  voice_enabled BOOLEAN NOT NULL DEFAULT false,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assistant_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.assistant_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- IMAGE GENERATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.image_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  model TEXT,
  storage_path TEXT,
  url TEXT,
  width INTEGER,
  height INTEGER,
  style TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS image_generations_user_id_idx ON public.image_generations(user_id);
CREATE INDEX IF NOT EXISTS image_generations_project_id_idx ON public.image_generations(project_id);

ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own image generations"
  ON public.image_generations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_files_updated_at ON public.project_files;
CREATE TRIGGER update_project_files_updated_at BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_documents_updated_at ON public.project_documents;
CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON public.project_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_artifacts_updated_at ON public.artifacts;
CREATE TRIGGER update_artifacts_updated_at BEFORE UPDATE ON public.artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_assistant_preferences_updated_at ON public.assistant_preferences;
CREATE TRIGGER update_assistant_preferences_updated_at BEFORE UPDATE ON public.assistant_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
