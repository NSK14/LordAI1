-- Add idempotency key to learning_messages to prevent duplicate inserts
ALTER TABLE public.learning_messages ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS learning_messages_idempotency_key_idx ON public.learning_messages(idempotency_key);
