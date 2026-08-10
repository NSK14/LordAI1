-- Study Plan Model Enhancements
-- Adds missing fields to learning_plans and learning_plan_tasks

-- learning_plans: add description, daily_minutes, source
ALTER TABLE public.learning_plans
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS daily_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'mixed'));

-- learning_plans: extend status to include 'paused'
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'learning_plans'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE learning_plans DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;
ALTER TABLE public.learning_plans
  ADD CONSTRAINT learning_plans_status_check CHECK (status IN ('active', 'paused', 'completed', 'archived'));

-- learning_plan_tasks: add description, priority, position, notes
ALTER TABLE public.learning_plan_tasks
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- learning_plan_tasks: extend task_type to include quiz, flashcards, custom
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'learning_plan_tasks'::regclass
    AND contype = 'c'
    AND conname LIKE '%task_type%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE learning_plan_tasks DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;
ALTER TABLE public.learning_plan_tasks
  ADD CONSTRAINT learning_plan_tasks_task_type_check CHECK (task_type IN ('learn', 'practice', 'review', 'quiz', 'flashcards', 'custom'));

-- learning_plan_tasks: extend status to include in_progress
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'learning_plan_tasks'::regclass
    AND contype = 'c'
    AND conname LIKE '%status%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE learning_plan_tasks DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;
END $$;
ALTER TABLE public.learning_plan_tasks
  ADD CONSTRAINT learning_plan_tasks_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- Index for task ordering within a plan
CREATE INDEX IF NOT EXISTS learning_plan_tasks_plan_position_idx
  ON public.learning_plan_tasks (plan_id, position);

-- Index for plan status queries
CREATE INDEX IF NOT EXISTS learning_plans_user_status_idx
  ON public.learning_plans (user_id, status);
