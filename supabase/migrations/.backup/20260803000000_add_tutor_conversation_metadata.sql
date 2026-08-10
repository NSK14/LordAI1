-- Add subject and topic columns to learning_sessions for tutor conversation metadata
ALTER TABLE public.learning_sessions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.learning_sessions ADD COLUMN IF NOT EXISTS topic TEXT;

-- Index for faster user-scoped session listing
CREATE INDEX IF NOT EXISTS learning_sessions_user_updated_idx ON public.learning_sessions(user_id, updated_at DESC);
