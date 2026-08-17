import type {
  LearningAttempt,
  LearningSession,
  LearningHistory,
  FlashcardReview,
  Mastery,
  LearningAnalytics,
  DailyGoal,
  Exam,
} from "./types";

export type AchievementId =
  | "first_steps"
  | "streak_3"
  | "streak_7"
  | "streak_30"
  | "mastery_10"
  | "mastery_50"
  | "speed_demon"
  | "perfectionist"
  | "night_owl"
  | "early_bird"
  | "flashcard_master"
  | "exam_ace"
  | "tutor_regular"
  | "comeback_kid"
  | "knowledge_seeker"
  | "subject_expert";

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt: string | null;
  progress: number;
  target: number;
}

export interface LearnerStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalXp: number;
  streak: number;
  longestStreak: number;
  achievements: Achievement[];
  recentXp: Array<{ amount: number; reason: string; timestamp: string }>;
}

const LEVEL_XP_CURVE = (level: number): number => Math.floor(100 * Math.pow(level, 1.5));

const ACHIEVEMENT_DEFS: Record<
  AchievementId,
  { title: string; description: string; icon: string; target: number }
> = {
  first_steps: {
    title: "First Steps",
    description: "Complete your first learning activity",
    icon: "👣",
    target: 1,
  },
  streak_3: {
    title: "On Fire",
    description: "Maintain a 3-day study streak",
    icon: "🔥",
    target: 3,
  },
  streak_7: {
    title: "Week Warrior",
    description: "Maintain a 7-day study streak",
    icon: "⚔️",
    target: 7,
  },
  streak_30: {
    title: "Unstoppable",
    description: "Maintain a 30-day study streak",
    icon: "🏆",
    target: 30,
  },
  mastery_10: { title: "Apprentice", description: "Master 10 concepts", icon: "📚", target: 10 },
  mastery_50: { title: "Scholar", description: "Master 50 concepts", icon: "🎓", target: 50 },
  speed_demon: {
    title: "Speed Demon",
    description: "Complete 10 questions in under 5 minutes",
    icon: "⚡",
    target: 10,
  },
  perfectionist: {
    title: "Perfectionist",
    description: "Get 20 questions correct in a row",
    icon: "💎",
    target: 20,
  },
  night_owl: {
    title: "Night Owl",
    description: "Study after midnight 5 times",
    icon: "🦉",
    target: 5,
  },
  early_bird: {
    title: "Early Bird",
    description: "Study before 6 AM 5 times",
    icon: "🌅",
    target: 5,
  },
  flashcard_master: {
    title: "Flashcard Master",
    description: "Review 100 flashcards",
    icon: "🧠",
    target: 100,
  },
  exam_ace: { title: "Exam Ace", description: "Score 90%+ on an exam", icon: "🏅", target: 1 },
  tutor_regular: {
    title: "Curious Mind",
    description: "Have 50 tutor conversations",
    icon: "💬",
    target: 50,
  },
  comeback_kid: {
    title: "Comeback Kid",
    description: "Recover a forgotten concept to mastery",
    icon: "💪",
    target: 1,
  },
  knowledge_seeker: {
    title: "Knowledge Seeker",
    description: "Study for 24 hours total",
    icon: "🔍",
    target: 24,
  },
  subject_expert: {
    title: "Subject Expert",
    description: "Master all concepts in a subject",
    icon: "⭐",
    target: 1,
  },
};

export function calculateStreak(
  sessions: LearningSession[],
  attempts: LearningAttempt[],
  history: LearningHistory[],
): { current: number; longest: number } {
  const allActivity = [
    ...sessions.map((s) => new Date(s.updated_at ?? s.created_at)),
    ...attempts.map((a) => new Date(a.created_at)),
    ...history.map((h) => new Date(h.created_at)),
  ];

  const uniqueDays = new Set(
    allActivity.filter((d) => !isNaN(d.getTime())).map((d) => d.toDateString()),
  );

  const sortedDays = Array.from(uniqueDays)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (sortedDays.length === 0) return { current: 0, longest: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecent = sortedDays[0];
  mostRecent.setHours(0, 0, 0, 0);

  let current = 0;
  if (mostRecent.getTime() === today.getTime() || mostRecent.getTime() === yesterday.getTime()) {
    current = 1;
    const expected = new Date(mostRecent);
    expected.setDate(expected.getDate() - 1);
    for (let i = 1; i < sortedDays.length; i++) {
      const day = sortedDays[i];
      day.setHours(0, 0, 0, 0);
      if (day.getTime() === expected.getTime()) {
        current++;
        expected.setDate(expected.getDate() - 1);
      } else if (day.getTime() < expected.getTime()) {
        break;
      }
    }
  }

  let longest = current;
  let tempStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const currentDay = sortedDays[i - 1];
    const prevDay = sortedDays[i];
    const diff = (currentDay.getTime() - prevDay.getTime()) / 86_400_000;
    if (diff === 1) {
      tempStreak++;
      longest = Math.max(longest, tempStreak);
    } else if (diff > 1) {
      tempStreak = 1;
    }
  }

  return { current, longest };
}

export function calculateXP(
  attempts: LearningAttempt[],
  sessions: LearningSession[],
  history: LearningHistory[],
  flashcardReviews: FlashcardReview[],
  exams: Exam[],
): { xp: number; recentXp: Array<{ amount: number; reason: string; timestamp: string }> } {
  const xpEvents: Array<{ amount: number; reason: string; timestamp: string }> = [];

  for (const attempt of attempts) {
    if (attempt.correct) {
      xpEvents.push({
        amount: 25,
        reason: `Correct answer on ${attempt.question.prompt.slice(0, 30)}...`,
        timestamp: attempt.created_at,
      });
    } else {
      xpEvents.push({
        amount: 5,
        reason: `Attempted question (learned from mistake)`,
        timestamp: attempt.created_at,
      });
    }
  }

  for (const session of sessions) {
    xpEvents.push({
      amount: 10,
      reason: `Study session: ${session.title}`,
      timestamp: session.updated_at ?? session.created_at,
    });
  }

  for (const h of history) {
    const baseXp =
      {
        tutor: 15,
        practice: 20,
        exam: 30,
        flashcard: 10,
        note: 10,
        voice: 15,
        whiteboard: 20,
        ocr: 5,
        revision: 15,
      }[h.session_type] ?? 10;
    xpEvents.push({
      amount: baseXp,
      reason: `${h.session_type} session: ${h.title}`,
      timestamp: h.created_at,
    });
  }

  for (const review of flashcardReviews) {
    xpEvents.push({
      amount: review.quality >= 4 ? 10 : 5,
      reason: "Flashcard review",
      timestamp: review.reviewed_at,
    });
  }

  for (const exam of exams) {
    if (exam.status === "completed" && exam.score != null) {
      xpEvents.push({
        amount: Math.round(exam.score * 50),
        reason: `Completed exam: ${exam.title}`,
        timestamp: exam.completed_at ?? exam.created_at,
      });
    }
  }

  const totalXp = xpEvents.reduce((sum, e) => sum + e.amount, 0);
  const recentXp = xpEvents
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  return { xp: totalXp, recentXp };
}

export function calculateLevel(totalXp: number): {
  level: number;
  xpInLevel: number;
  xpToNext: number;
} {
  let level = 1;
  let xpRequired = LEVEL_XP_CURVE(level);
  let accumulated = 0;

  while (accumulated + xpRequired <= totalXp && level < 100) {
    accumulated += xpRequired;
    level++;
    xpRequired = LEVEL_XP_CURVE(level);
  }

  return {
    level,
    xpInLevel: totalXp - accumulated,
    xpToNext: xpRequired,
  };
}

export function checkAchievements(
  mastery: Mastery[],
  attempts: LearningAttempt[],
  sessions: LearningSession[],
  history: LearningHistory[],
  flashcardReviews: FlashcardReview[],
  exams: Exam[],
  streak: number,
  unlockedAchievements: Set<string>,
): Achievement[] {
  const achievements: Achievement[] = [];

  function add(id: AchievementId, progress: number, unlocked: boolean): Achievement {
    const def = ACHIEVEMENT_DEFS[id];
    return {
      id,
      title: def.title,
      description: def.description,
      icon: def.icon,
      xpReward: Math.round(def.target * 10),
      unlockedAt: unlocked ? new Date().toISOString() : null,
      progress: Math.min(progress, def.target),
      target: def.target,
    };
  }

  const masteredCount = mastery.filter((m) => m.score >= 0.8).length;
  achievements.push(
    add("first_steps", sessions.length + history.length, sessions.length + history.length >= 1),
  );
  achievements.push(add("mastery_10", masteredCount, masteredCount >= 10));
  achievements.push(add("mastery_50", masteredCount, masteredCount >= 50));
  achievements.push(add("streak_3", streak, streak >= 3));
  achievements.push(add("streak_7", streak, streak >= 7));
  achievements.push(add("streak_30", streak, streak >= 30));

  const tutorMessages = history.filter((h) => h.session_type === "tutor").length;
  achievements.push(add("tutor_regular", tutorMessages, tutorMessages >= 50));

  const totalFlashcards = flashcardReviews.length;
  achievements.push(add("flashcard_master", totalFlashcards, totalFlashcards >= 100));

  const perfectExams = exams.filter(
    (e) => e.status === "completed" && (e.score ?? 0) >= 0.9,
  ).length;
  achievements.push(add("exam_ace", perfectExams, perfectExams >= 1));

  const totalStudyMinutes = history.reduce((sum, h) => sum + (h.duration_seconds ?? 0) / 60, 0);
  achievements.push(
    add("knowledge_seeker", Math.floor(totalStudyMinutes / 60), totalStudyMinutes >= 1440),
  );

  let correctStreak = 0;
  let maxCorrectStreak = 0;
  for (const attempt of attempts) {
    if (attempt.correct) {
      correctStreak++;
      maxCorrectStreak = Math.max(maxCorrectStreak, correctStreak);
    } else {
      correctStreak = 0;
    }
  }
  achievements.push(add("perfectionist", maxCorrectStreak, maxCorrectStreak >= 20));

  for (const achievement of achievements) {
    if (achievement.progress >= achievement.target && !unlockedAchievements.has(achievement.id)) {
      unlockedAchievements.add(achievement.id);
    }
  }

  return achievements;
}

export function getLearnerStats(
  snapshot: {
    attempts: LearningAttempt[];
    sessions: LearningSession[];
    history: LearningHistory[];
    flashcards?: { reviews?: FlashcardReview[] }[];
    exams: Exam[];
    mastery: Mastery[];
    analytics?: LearningAnalytics[];
    daily_goals?: DailyGoal[];
  },
  unlockedAchievements: Set<string> = new Set(),
): LearnerStats {
  const {
    attempts,
    sessions,
    history,
    flashcards = [],
    exams,
    mastery,
    daily_goals = [],
  } = snapshot;

  const allFlashcardReviews = flashcards.flatMap((f) => f.reviews ?? []);
  const { current: streak, longest } = calculateStreak(sessions, attempts, history);
  const { xp, recentXp } = calculateXP(attempts, sessions, history, allFlashcardReviews, exams);
  const { level, xpInLevel, xpToNext } = calculateLevel(xp);
  const achievements = checkAchievements(
    mastery,
    attempts,
    sessions,
    history,
    allFlashcardReviews,
    exams,
    streak,
    unlockedAchievements,
  );

  return {
    level,
    xp: xpInLevel,
    xpToNextLevel: xpToNext,
    totalXp: xp,
    streak,
    longestStreak: longest,
    achievements,
    recentXp,
  };
}
