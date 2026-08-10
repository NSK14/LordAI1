import type {
  LearningConcept,
  Mastery,
  Question,
  TutorMode,
  LearningSnapshot,
  LearningProfile,
  LearningSession,
  TutorMessage,
  LearningArtifact,
  LearningAttempt,
  LearningPlan,
  LearningPlanTask,
  Flashcard,
  LearningBoard,
  LearningResource,
  LearningSource,
  Exam,
  ExamQuestion,
  RevisionSchedule,
  DailyGoal,
  WeeklyGoal,
  LearningAnalytics,
  LearningHistory,
  AI_GENERATED_NOTICE,
  PlanInput,
  PlanTaskInput,
  PlanWithTasks,
  AIProposedChange,
  PlanOptimizationResult,
} from "@/lib/learning/types";

export type {
  LearningConcept,
  Mastery,
  Question,
  TutorMode,
  LearningSnapshot,
  LearningProfile,
  LearningSession,
  TutorMessage,
  LearningArtifact,
  LearningAttempt,
  LearningPlan,
  LearningPlanTask,
  Flashcard,
  LearningBoard,
  LearningResource,
  LearningSource,
  Exam,
  ExamQuestion,
  RevisionSchedule,
  DailyGoal,
  WeeklyGoal,
  LearningAnalytics,
  LearningHistory,
  AI_GENERATED_NOTICE,
  PlanInput,
  PlanTaskInput,
  PlanWithTasks,
  AIProposedChange,
  PlanOptimizationResult,
};

export type StudyView =
  "dashboard" | "concepts" | "practice" | "tutor" | "flashcards" | "exams" | "planner" | "progress";

export const STUDY_VIEWS: ReadonlyArray<{
  id: StudyView;
  label: string;
  icon: string;
}> = [
  { id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { id: "concepts", label: "Concepts", icon: "BookOpen" },
  { id: "practice", label: "Practice", icon: "Target" },
  { id: "tutor", label: "AI Tutor", icon: "MessageSquare" },
  { id: "flashcards", label: "Flashcards", icon: "Brain" },
  { id: "exams", label: "Test Center", icon: "FileQuestion" },
  { id: "planner", label: "Study Planner", icon: "Calendar" },
  { id: "progress", label: "Progress", icon: "TrendingUp" },
];

export type MasteryLevel = "mastered" | "learning" | "introduced" | "not-started";

export function getMasteryLevel(score: number | undefined): MasteryLevel {
  const s = score ?? 0;
  if (s >= 0.8) return "mastered";
  if (s >= 0.6) return "learning";
  if (s >= 0.35) return "introduced";
  return "not-started";
}

export type SessionResponse =
  | { question: Question; aiGenerated?: boolean }
  | { title: string; tasks: PlanTask[]; aiGenerated?: boolean }
  | { cards: Array<{ front: string; back: string }>; aiGenerated?: boolean }
  | {
      title: string;
      questions: Array<{
        id: string;
        concept_id: string;
        question: Question;
        question_type: string;
        difficulty: number;
        points: number;
        order_index: number;
      }>;
      timeLimitSeconds: number | null;
    }
  | { answer: string; sourcesUsed?: string[] }
  | { content: string; format: string }
  | { schedules: unknown[] }
  | { memories: unknown[] }
  | Record<string, unknown>;

export type PlanTask = {
  conceptId: string;
  taskType: "learn" | "practice" | "review" | "quiz" | "flashcards" | "custom";
  estimatedMinutes: number;
  dueAt: string;
  title?: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  notes?: string;
};

export interface StudyPlatformProps {
  snapshot: LearningSnapshot | undefined;
  userId: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}
