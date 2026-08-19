-- Phase 2: Knowledge 2.0 entities and relations
CREATE TABLE IF NOT EXISTS knowledge_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'concept',
  name TEXT NOT NULL,
  description TEXT,
  embedding VECTOR(1536),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES knowledge_entities(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL,
  confidence FLOAT NOT NULL DEFAULT 1.0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  entity_ids UUID[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_user_id ON knowledge_entities(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_type ON knowledge_entities(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_embedding ON knowledge_entities USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_user_id ON knowledge_relations(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_source ON knowledge_relations(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relations_target ON knowledge_relations(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_clusters_user_id ON knowledge_clusters(user_id);

ALTER TABLE knowledge_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own knowledge entities"
  ON knowledge_entities FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own knowledge relations"
  ON knowledge_relations FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own knowledge clusters"
  ON knowledge_clusters FOR ALL
  USING (auth.uid() = user_id);
