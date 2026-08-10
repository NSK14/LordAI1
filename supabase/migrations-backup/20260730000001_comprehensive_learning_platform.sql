-- Comprehensive Learning Platform Migration
-- Adds all tables for 15 AI-powered adaptive learning features

-- 1. FLASHCARDS with Spaced Repetition
CREATE TABLE IF NOT EXISTS public.learning_flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL CHECK (source_type IN ('ai-generated', 'user-created', 'imported')),
  ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_flashcard_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES public.learning_flashcards(id) ON DELETE CASCADE,
  quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 5),
  ease_factor NUMERIC(4,3) NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  response_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS flashcard_reviews_due_idx ON public.learning_flashcard_reviews(user_id, next_review_at);
CREATE INDEX IF NOT EXISTS flashcards_concept_idx ON public.learning_flashcards(concept_id);

-- 2. STUDY NOTES with AI enhancements
CREATE TABLE IF NOT EXISTS public.learning_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  content_text TEXT,
  ai_summary TEXT,
  ai_key_points TEXT[],
  ai_cheat_sheet TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_concept_idx ON public.learning_notes(concept_id);
CREATE INDEX IF NOT EXISTS notes_session_idx ON public.learning_notes(session_id);

-- 3. EXAM MODE - Mock exams, timed quizzes, chapter tests
CREATE TABLE IF NOT EXISTS public.learning_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('mock', 'chapter', 'full_syllabus', 'custom', 'timed_quiz')),
  concept_ids TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'abandoned')),
  time_limit_seconds INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score NUMERIC(5,2),
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learning_exam_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.learning_exams(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  question JSONB NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'numerical', 'short_answer', 'diagram', 'essay')),
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  points INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.learning_exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.learning_exams(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.learning_exam_questions(id) ON DELETE CASCADE,
  user_answer JSONB NOT NULL DEFAULT '{}',
  ai_evaluation JSONB,
  is_correct BOOLEAN,
  score NUMERIC(5,2),
  feedback TEXT,
  time_spent_seconds INTEGER,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exams_user_idx ON public.learning_exams(user_id, status);
CREATE INDEX IF NOT EXISTS exam_questions_exam_idx ON public.learning_exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS exam_answers_exam_idx ON public.learning_exam_answers(exam_id);

-- 4. REVISION MODE - Forgetting curve scheduling
CREATE TABLE IF NOT EXISTS public.learning_revision_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES public.learning_concepts(id) ON DELETE CASCADE,
  mastery_score NUMERIC(4,3) NOT NULL,
  confidence NUMERIC(4,3) NOT NULL,
  retention_estimate NUMERIC(4,3) NOT NULL,
  next_review_at TIMESTAMPTZ NOT NULL,
  review_interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor NUMERIC(4,3) NOT NULL DEFAULT 2.5,
  consecutive_successes INTEGER NOT NULL DEFAULT 0,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS revision_schedule_due_idx ON public.learning_revision_schedule(user_id, next_review_at);

-- 5. LEARNING MEMORY - Long-term personalization
CREATE TABLE IF NOT EXISTS public.learning_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('conversation', 'mistake', 'strength', 'preference', 'goal', 'misconception')),
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
  content JSONB NOT NULL,
  summary TEXT,
  importance NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  confidence NUMERIC(3,2) NOT NULL DEFAULT 1.0,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memory_user_type_idx ON public.learning_memory(user_id, memory_type);
CREATE INDEX IF NOT EXISTS memory_concept_idx ON public.learning_memory(concept_id);

-- 6. VOICE TUTOR - Audio sessions
CREATE TABLE IF NOT EXISTS public.learning_voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('stt', 'tts', 'conversational')),
  language TEXT NOT NULL DEFAULT 'en',
  duration_seconds INTEGER,
  transcript TEXT,
  ai_response TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS voice_sessions_user_idx ON public.learning_voice_sessions(user_id, started_at DESC);

-- 7. OCR - Document processing
CREATE TABLE IF NOT EXISTS public.learning_ocr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.learning_sources(id) ON DELETE SET NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_text TEXT,
  structured_data JSONB,
  error_message TEXT,
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ocr_jobs_user_idx ON public.learning_ocr_jobs(user_id, created_at DESC);

-- 8. WHITEBOARD - Interactive drawing with AI annotations
CREATE TABLE IF NOT EXISTS public.learning_whiteboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  canvas_data JSONB NOT NULL DEFAULT '{}',
  ai_annotations JSONB NOT NULL DEFAULT '[]',
  thumbnail_url TEXT,
  is_collaborative BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whiteboards_user_idx ON public.learning_whiteboards(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS whiteboards_concept_idx ON public.learning_whiteboards(concept_id);

-- 9. RESOURCES - Extended with YouTube, PDFs, etc.
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS youtube_video_id TEXT;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5);
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.learning_resources ADD COLUMN IF NOT EXISTS citations JSONB;

-- 10. STUDY PLANNER - Enhanced with daily/weekly goals
CREATE TABLE IF NOT EXISTS public.learning_daily_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  target_minutes INTEGER NOT NULL DEFAULT 30,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  target_concepts INTEGER NOT NULL DEFAULT 1,
  completed_concepts INTEGER NOT NULL DEFAULT 0,
  streak_day INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS public.learning_weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  target_minutes INTEGER NOT NULL DEFAULT 180,
  actual_minutes INTEGER NOT NULL DEFAULT 0,
  target_concepts INTEGER NOT NULL DEFAULT 5,
  completed_concepts INTEGER NOT NULL DEFAULT 0,
  target_exams INTEGER NOT NULL DEFAULT 0,
  completed_exams INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS daily_goals_user_date_idx ON public.learning_daily_goals(user_id, date DESC);
CREATE INDEX IF NOT EXISTS weekly_goals_user_week_idx ON public.learning_weekly_goals(user_id, week_start DESC);

-- 11. ANALYTICS - Learning analytics and insights
CREATE TABLE IF NOT EXISTS public.learning_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  study_time_seconds INTEGER NOT NULL DEFAULT 0,
  concepts_studied INTEGER NOT NULL DEFAULT 0,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  tutor_messages INTEGER NOT NULL DEFAULT 0,
  flashcards_reviewed INTEGER NOT NULL DEFAULT 0,
  notes_created INTEGER NOT NULL DEFAULT 0,
  exams_completed INTEGER NOT NULL DEFAULT 0,
  voice_minutes INTEGER NOT NULL DEFAULT 0,
  whiteboard_sessions INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS analytics_user_date_idx ON public.learning_analytics(user_id, date DESC);

-- 12. LEARNING HISTORY - Detailed session history
CREATE TABLE IF NOT EXISTS public.learning_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('tutor', 'practice', 'exam', 'flashcard', 'note', 'voice', 'whiteboard', 'ocr', 'revision')),
  concept_id TEXT REFERENCES public.learning_concepts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  duration_seconds INTEGER,
  outcome_score NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS history_user_type_idx ON public.learning_history(user_id, session_type, created_at DESC);
CREATE INDEX IF NOT EXISTS history_concept_idx ON public.learning_history(concept_id);

-- 13. MASTERY - Enhanced with retention, streak, confidence
ALTER TABLE public.learning_mastery ADD COLUMN IF NOT EXISTS streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.learning_mastery ADD COLUMN IF NOT EXISTS estimated_retention NUMERIC(4,3) NOT NULL DEFAULT 0.5;
ALTER TABLE public.learning_mastery ADD COLUMN IF NOT EXISTS total_study_time_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.learning_mastery ADD COLUMN IF NOT EXISTS last_session_type TEXT;
ALTER TABLE public.learning_mastery ADD COLUMN IF NOT EXISTS misconceptions TEXT[] NOT NULL DEFAULT '{}';

-- 14. CONCEPTS - Enhanced with more metadata
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS chapter TEXT;
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS misconception_tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS difficulty INTEGER NOT NULL DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5);
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS estimated_study_minutes INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.learning_concepts ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] NOT NULL DEFAULT '{}';

-- 15. PROFILES - Enhanced with more preferences
ALTER TABLE public.learning_profiles ADD COLUMN IF NOT EXISTS learning_style TEXT CHECK (learning_style IN ('visual', 'auditory', 'reading', 'kinesthetic', 'mixed'));
ALTER TABLE public.learning_profiles ADD COLUMN IF NOT EXISTS preferred_pace TEXT CHECK (preferred_pace IN ('slow', 'moderate', 'fast'));
ALTER TABLE public.learning_profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.learning_profiles ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC';

-- RLS Policies for new tables
ALTER TABLE public.learning_flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_flashcard_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_revision_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_daily_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_weekly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_history ENABLE ROW LEVEL SECURITY;

DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'learning_flashcards','learning_flashcard_reviews','learning_notes',
    'learning_exams',
    'learning_revision_schedule','learning_memory','learning_voice_sessions',
    'learning_ocr_jobs','learning_whiteboards','learning_daily_goals',
    'learning_weekly_goals','learning_analytics','learning_history'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Learning rows belong to user" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Learning rows belong to user" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', tbl);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Learning rows belong to user" ON public.learning_exam_questions;
CREATE POLICY "Learning rows belong to user" ON public.learning_exam_questions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_exams WHERE learning_exams.id = learning_exam_questions.exam_id AND learning_exams.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.learning_exams WHERE learning_exams.id = learning_exam_questions.exam_id AND learning_exams.user_id = auth.uid()));

DROP POLICY IF EXISTS "Learning rows belong to user" ON public.learning_exam_answers;
CREATE POLICY "Learning rows belong to user" ON public.learning_exam_answers
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_exams WHERE learning_exams.id = learning_exam_answers.exam_id AND learning_exams.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.learning_exams WHERE learning_exams.id = learning_exam_answers.exam_id AND learning_exams.user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.learning_flashcards, public.learning_flashcard_reviews, public.learning_notes,
  public.learning_exams, public.learning_exam_questions, public.learning_exam_answers,
  public.learning_revision_schedule, public.learning_memory, public.learning_voice_sessions,
  public.learning_ocr_jobs, public.learning_whiteboards, public.learning_daily_goals,
  public.learning_weekly_goals, public.learning_analytics, public.learning_history
TO authenticated;

-- Updated timestamps trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ DECLARE tbl TEXT; BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'learning_profiles','learning_flashcards','learning_notes','learning_exams',
    'learning_revision_schedule','learning_memory','learning_voice_sessions',
    'learning_ocr_jobs','learning_whiteboards','learning_daily_goals',
    'learning_weekly_goals','learning_analytics'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', tbl, tbl);
  END LOOP;
END $$;