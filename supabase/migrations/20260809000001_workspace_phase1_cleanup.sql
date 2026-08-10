-- Workspace Phase 1 additions:
--   * trash_retention_days on user_settings
--   * helper to hard-delete old trashed conversations

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS trash_retention_days INTEGER NOT NULL DEFAULT 30;

CREATE OR REPLACE FUNCTION public.cleanup_old_trash()
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.conversations
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '1 day' * (SELECT trash_retention_days FROM public.user_settings LIMIT 1);
END;
$$;
