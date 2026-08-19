-- Phase 2: AI Canvas Artifacts
-- Run this migration to add canvas support

CREATE TABLE IF NOT EXISTS canvas_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Untitled',
  type TEXT NOT NULL DEFAULT 'markdown',
  content TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  parent_version_id UUID,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_shared BOOLEAN NOT NULL DEFAULT FALSE,
  share_token TEXT,
  language TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canvas_artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES canvas_artifacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_artifacts_user_id ON canvas_artifacts(user_id);
CREATE INDEX IF NOT EXISTS idx_canvas_artifacts_project_id ON canvas_artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_canvas_artifacts_type ON canvas_artifacts(type);
CREATE INDEX IF NOT EXISTS idx_canvas_artifacts_updated_at ON canvas_artifacts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_versions_artifact_id ON canvas_artifact_versions(artifact_id, created_at DESC);

ALTER TABLE canvas_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_artifact_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own artifacts"
  ON canvas_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own artifacts"
  ON canvas_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artifacts"
  ON canvas_artifacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own artifacts"
  ON canvas_artifacts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own artifact versions"
  ON canvas_artifact_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM canvas_artifacts
      WHERE canvas_artifacts.id = canvas_artifact_versions.artifact_id
      AND canvas_artifacts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own artifact versions"
  ON canvas_artifact_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canvas_artifacts
      WHERE canvas_artifacts.id = canvas_artifact_versions.artifact_id
      AND canvas_artifacts.user_id = auth.uid()
    )
  );
