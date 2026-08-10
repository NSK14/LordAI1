ALTER TABLE public.image_generations
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'generated';
