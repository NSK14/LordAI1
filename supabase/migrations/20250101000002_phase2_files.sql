-- Phase 2: File Management
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL DEFAULT '/',
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  content TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS file_trash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_is_pinned ON files(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_files_updated_at ON files(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id, created_at DESC);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own files"
  ON files FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own file versions"
  ON file_versions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM files
      WHERE files.id = file_versions.file_id
      AND files.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own trash"
  ON file_trash FOR ALL
  USING (auth.uid() = user_id);
