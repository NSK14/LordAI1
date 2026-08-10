-- Archive and Trash support for conversations.
--
-- Adds two new columns:
--   * archived  - soft-hide from the normal sidebar (recoverable, searchable).
--   * deleted_at - marks a conversation as "in Trash". Non-null means it has
--     been deleted but can still be restored. Auto-cleanup runs periodically
--     (application-side) to hard-delete rows older than the configured TTL.
--
-- Application-level rules:
--   * Normal sidebar lists only rows where archived = false AND deleted_at IS NULL.
--   * The Trash view lists rows where deleted_at IS NOT NULL.
--   * Archive view lists rows where archived = true AND deleted_at IS NULL.
--   * Permanent delete hard-deletes the row (messages cascade via FK).
--   * Restore sets deleted_at = NULL (and archived = false if desired).

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS conversations_user_archived_deleted_idx
  ON public.conversations (user_id, archived, deleted_at, last_message_at DESC);
