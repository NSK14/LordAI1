-- ============================================================================
-- LORD AI Phase 1 — AI Brain & Workspace Foundation
-- ============================================================================
-- Adds project-scoped memory, unified knowledge base, project notes/tasks,
-- search infrastructure, and the activity timeline.
--
-- All additions are backward-compatible:
--   * New columns are nullable with safe defaults.
--   * New tables cascade-delete with the owning user/project.
--   * RLS policies mirror the existing per-user model.
-- ============================================================================

-- ============================================================
-- 1. PROJECTS become the primary organizational unit
-- ============================================================

-- Conversations belong to a project (nullable for backward compatibility).
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS conversations_project_id_idx ON public.conversations(project_id);

-- Messages inherit project context through their conversation.
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS messages_project_id_idx ON public.messages(project_id);

-- ============================================================
-- 2. ENHANCED MEMORY ENGINE
-- ============================================================

ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS importance DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS merged_from UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_user_generated BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS memories_project_id_idx ON public.memories(project_id);
CREATE INDEX IF NOT EXISTS memories_user_project_idx ON public.memories(user_id, project_id, archived, created_at DESC);
CREATE INDEX IF NOT EXISTS memories_user_importance_idx ON public.memories(user_id, importance DESC, created_at DESC);

-- ============================================================
-- 3. PROJECT NOTES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content TEXT NOT NULL DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_notes_project_id_idx ON public.project_notes(project_id);
CREATE INDEX IF NOT EXISTS project_notes_user_id_idx ON public.project_notes(user_id);

ALTER TABLE public.project_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project notes"
  ON public.project_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. PROJECT TASKS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_tasks_project_id_idx ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS project_tasks_user_id_idx ON public.project_tasks(user_id);
CREATE INDEX IF NOT EXISTS project_tasks_status_idx ON public.project_tasks(status);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project tasks"
  ON public.project_tasks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. KNOWLEDGE SOURCES (unified knowledge base)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  storage_path TEXT,
  content_text TEXT,
  mime_type TEXT,
  file_size_bytes INTEGER DEFAULT 0,
  page_count INTEGER,
  word_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  processing_status TEXT NOT NULL DEFAULT 'pending',
  processing_error TEXT,
  metadata JSONB DEFAULT '{}',
  chunk_count INTEGER DEFAULT 0,
  is_indexed BOOLEAN NOT NULL DEFAULT false,
  last_indexed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_sources_project_id_idx ON public.knowledge_sources(project_id);
CREATE INDEX IF NOT EXISTS knowledge_sources_user_id_idx ON public.knowledge_sources(user_id);
CREATE INDEX IF NOT EXISTS knowledge_sources_processing_status_idx ON public.knowledge_sources(processing_status);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge sources"
  ON public.knowledge_sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. KNOWLEDGE CHUNKS (enhanced document_chunks)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_source_id UUID NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  heading TEXT,
  section TEXT,
  page_number INTEGER,
  token_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  embedding vector(1536),
  embedding_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_source_id_idx ON public.knowledge_chunks(knowledge_source_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_project_id_idx ON public.knowledge_chunks(project_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_user_id_idx ON public.knowledge_chunks(user_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own knowledge chunks"
  ON public.knowledge_chunks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. PROJECT MEMBERS (future team collaboration)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project memberships"
  ON public.project_members FOR ALL
  USING (auth.uid() = user_id OR auth.uid() = invited_by)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. PROJECT ACTIVITY (timeline)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.project_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS project_activity_project_id_idx ON public.project_activity(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS project_activity_user_id_idx ON public.project_activity(user_id);

ALTER TABLE public.project_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project activity"
  ON public.project_activity FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. SEARCH INDEX (global semantic search)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_vector vector(1536),
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS search_index_user_id_idx ON public.search_index(user_id);
CREATE INDEX IF NOT EXISTS search_index_project_id_idx ON public.search_index(project_id);
CREATE INDEX IF NOT EXISTS search_index_entity_type_idx ON public.search_index(entity_type);
CREATE INDEX IF NOT EXISTS search_index_embedding_idx ON public.search_index USING ivfflat (content_vector vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own search index"
  ON public.search_index FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 10. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update timestamp triggers for new tables
DROP TRIGGER IF EXISTS update_project_notes_updated_at ON public.project_notes;
CREATE TRIGGER update_project_notes_updated_at BEFORE UPDATE ON public.project_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON public.project_tasks;
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_sources_updated_at ON public.knowledge_sources;
CREATE TRIGGER update_knowledge_sources_updated_at BEFORE UPDATE ON public.knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_search_index_updated_at ON public.search_index;
CREATE TRIGGER update_search_index_updated_at BEFORE UPDATE ON public.search_index
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Unified semantic search across all indexed content
CREATE OR REPLACE FUNCTION public.match_search_index(
  p_user_id UUID,
  p_embedding JSONB,
  p_limit INT DEFAULT 20,
  p_entity_types TEXT[] DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  entity_type TEXT,
  entity_id UUID,
  project_id UUID,
  title TEXT,
  content TEXT,
  tags TEXT[],
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'search_index' AND column_name = 'content_vector'
  ) THEN
    RETURN QUERY
    SELECT
      si.id,
      si.entity_type,
      si.entity_id,
      si.project_id,
      si.title,
      si.content,
      si.tags,
      1 - (si.content_vector <=> (p_embedding #>> '{}')::vector) AS similarity,
      si.metadata
    FROM public.search_index si
    WHERE si.user_id = p_user_id
      AND si.content_vector IS NOT NULL
      AND (p_entity_types IS NULL OR si.entity_type = ANY(p_entity_types))
      AND (p_project_id IS NULL OR si.project_id = p_project_id)
    ORDER BY si.content_vector <=> (p_embedding #>> '{}')::vector
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT
      si.id,
      si.entity_type,
      si.entity_id,
      si.project_id,
      si.title,
      si.content,
      si.tags,
      0.0::FLOAT AS similarity,
      si.metadata
    FROM public.search_index si
    WHERE si.user_id = p_user_id
      AND (p_entity_types IS NULL OR si.entity_type = ANY(p_entity_types))
      AND (p_project_id IS NULL OR si.project_id = p_project_id)
    ORDER BY si.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;

-- ============================================================
-- 11. REALTIME
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_notes;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'knowledge_sources'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_sources;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'knowledge_chunks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.knowledge_chunks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'project_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_activity;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'search_index'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.search_index;
  END IF;
END $$;

-- ============================================================
-- 12. MEMORY HELPERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_memories_by_project(
  p_user_id UUID,
  p_project_id UUID,
  p_embedding JSONB,
  p_limit INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  category TEXT,
  pinned BOOLEAN,
  confidence DOUBLE PRECISION,
  importance DOUBLE PRECISION,
  similarity FLOAT
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'memories' AND column_name = 'embedding_vec'
  ) THEN
    RETURN QUERY
    SELECT
      m.id,
      m.content,
      m.category,
      m.pinned,
      m.confidence,
      m.importance,
      1 - (m.embedding_vec <=> (p_embedding #>> '{}')::vector) AS similarity
    FROM public.memories m
    WHERE m.user_id = p_user_id
      AND m.project_id = p_project_id
      AND m.archived = false
      AND m.embedding_vec IS NOT NULL
    ORDER BY m.embedding_vec <=> (p_embedding #>> '{}')::vector
    LIMIT p_limit;
  ELSE
    RETURN QUERY
    SELECT
      m.id,
      m.content,
      m.category,
      m.pinned,
      m.confidence,
      m.importance,
      0.0::FLOAT AS similarity
    FROM public.memories m
    WHERE m.user_id = p_user_id
      AND m.project_id = p_project_id
      AND m.archived = false
    ORDER BY m.importance DESC, m.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;
