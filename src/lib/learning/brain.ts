import type {
  LearningConcept,
  Mastery,
  LearningSnapshot,
  LearningProfile,
  LearningPlanTask,
  LearningSession,
  LearningAttempt,
  LearningMemory,
  DailyGoal,
  LearningHistory,
  Flashcard,
  RevisionSchedule,
  Exam,
} from "./types";

export type IntentType =
  | "learn"
  | "practice"
  | "revise"
  | "quiz"
  | "flashcard"
  | "tutor"
  | "homework"
  | "assignment"
  | "exam_prep"
  | "general";

export interface DetectedTopic {
  subject: string | null;
  conceptId: string | null;
  conceptTitle: string | null;
  chapter: string | null;
  keywords: string[];
  intent: IntentType;
  confidence: number;
  difficulty: number;
  examRelated: boolean;
  deadlineHint: string | null;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  conceptIds: string[];
  tasks: MissionTask[];
  estimatedMinutes: number;
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface MissionTask {
  type: "learn" | "practice" | "review" | "quiz" | "flashcards" | "tutor";
  conceptId: string | null;
  conceptTitle: string;
  estimatedMinutes: number;
  reason: string;
}

export interface SmartRecommendation {
  id: string;
  type:
    "forgotten" | "weak_topic" | "unfinished" | "upcoming" | "prerequisite" | "habit" | "deadline";
  conceptId: string | null;
  conceptTitle: string | null;
  message: string;
  action: {
    type: string;
    payload: Record<string, unknown>;
  };
  urgency: number;
}

export interface LearningBrainInput {
  snapshot: LearningSnapshot;
  availableMinutes?: number;
  energyLevel?: "low" | "medium" | "high";
  explicitIntent?: string;
  forceIntent?: IntentType;
}

function getConceptById(
  concepts: LearningConcept[],
  conceptId: string,
): LearningConcept | undefined {
  return concepts.find((c) => c.id === conceptId);
}

function getMasteryById(mastery: Mastery[], conceptId: string): Mastery | undefined {
  return mastery.find((m) => m.concept_id === conceptId);
}

function daysSince(dateString: string | null | undefined): number {
  if (!dateString) return 999;
  const diff = Date.now() - new Date(dateString).getTime();
  return Math.floor(diff / 86_400_000);
}

function isToday(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  return new Date(dateString).toDateString() === new Date().toDateString();
}

function isThisWeek(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  weekStart.setHours(0, 0, 0, 0);
  return d >= weekStart;
}

function subjectOf(concept: LearningConcept): string {
  return concept.subject.toLowerCase();
}

export function detectTopic(message: string): DetectedTopic {
  const lower = message.toLowerCase();
  const subjects = [
    "physics",
    "chemistry",
    "biology",
    "math",
    "mathematics",
    "english",
    "history",
    "geography",
    "economics",
    "computer",
    "science",
    "social",
    "hindi",
    "sanskrit",
    "art",
    "music",
  ];
  const detectedSubject = subjects.find((s) => lower.includes(s)) ?? null;

  const intents: { intent: IntentType; patterns: RegExp[] }[] = [
    {
      intent: "tutor",
      patterns: [
        /explain|teach|understand|learn about|what is|how does|why does|can you explain|help me understand/,
      ],
    },
    {
      intent: "practice",
      patterns: [/practice|solve|do questions|exercise|problem/],
    },
    {
      intent: "quiz",
      patterns: [/quiz|test me|check my knowledge|exam|assessment|mock test/],
    },
    {
      intent: "flashcard",
      patterns: [/flashcard|memorize|remember|revision|revise|recall/],
    },
    {
      intent: "revise",
      patterns: [/revise|review|revision|go over|refresh|recap/],
    },
    {
      intent: "homework",
      patterns: [/homework|assignment|hw|school work|classwork/],
    },
    {
      intent: "exam_prep",
      patterns: [/exam|test|jee|neet|cet|board|competitive|entrance|final/],
    },
  ];

  let detectedIntent: IntentType = "general";
  let intentConfidence = 0;

  for (const { intent, patterns } of intents) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        detectedIntent = intent;
        intentConfidence = 0.9;
        break;
      }
    }
    if (intentConfidence > 0) break;
  }

  const examRelated = /\b(exam|test|jee|neet|board|final|mock|competitive|entrance)\b/.test(lower);
  const deadlineMatch = message.match(/\b(\d{1,2})\s+(days|weeks|hours)\b/);
  const deadlineHint = deadlineMatch ? deadlineMatch[0] : null;

  return {
    subject: detectedSubject,
    conceptId: null,
    conceptTitle: null,
    chapter: null,
    keywords: lower
      .split(/\s+/)
      .filter(
        (w) => w.length > 3 && !["about", "with", "that", "this", "have", "from"].includes(w),
      ),
    intent: detectedIntent,
    confidence: intentConfidence,
    difficulty:
      lower.includes("hard") || lower.includes("advanced") ? 5 : lower.includes("easy") ? 1 : 3,
    examRelated,
    deadlineHint,
  };
}

export function generateDailyMissions(input: LearningBrainInput): DailyMission[] {
  const { snapshot, availableMinutes = 120, energyLevel = "medium" } = input;
  const {
    concepts = [],
    mastery = [],
    tasks = [],
    sessions = [],
    attempts = [],
    revision_schedule = [],
    exams = [],
    flashcards = [],
    daily_goals = [],
  } = snapshot;

  const masteryMap = new Map(mastery.map((m) => [m.concept_id, m]));
  const todayGoal = daily_goals.find((g) => isToday(g.date));
  const completedToday = todayGoal?.completed_concepts ?? 0;
  const targetToday = todayGoal?.target_concepts ?? 3;

  const missions: DailyMission[] = [];
  const conceptCount = Math.min(3, Math.max(1, Math.floor(availableMinutes / 25)));

  const forgottenConcepts = concepts.filter((c) => {
    const m = masteryMap.get(c.id);
    if (!m) return false;
    const daysSinceReview = daysSince(m.last_practiced_at ?? m.updated_at);
    return daysSinceReview >= 7 && m.score < 0.8;
  });

  const weakConcepts = concepts
    .map((c) => ({ concept: c, mastery: masteryMap.get(c.id) }))
    .filter(({ mastery: m }) => m && m.score >= 0.3 && m.score < 0.6)
    .sort((a, b) => (a.mastery?.score ?? 0) - (b.mastery?.score ?? 0));

  const nextConcepts = concepts
    .filter((c) => {
      const m = masteryMap.get(c.id);
      return !m || m.score < 0.55;
    })
    .sort((a, b) => {
      const aPrereqsMet = a.prerequisites.every((p) => (masteryMap.get(p)?.score ?? 0) >= 0.55);
      const bPrereqsMet = b.prerequisites.every((p) => (masteryMap.get(p)?.score ?? 0) >= 0.55);
      if (aPrereqsMet && !bPrereqsMet) return -1;
      if (!aPrereqsMet && bPrereqsMet) return 1;
      return 0;
    });

  const dueFlashcards = flashcards.filter((f) => {
    const review = revision_schedule.find(
      (r) => r.concept_id === (f.concept_id ?? null) || r.concept_id === f.id,
    );
    return review ? new Date(review.next_review_at) <= new Date() : false;
  }).length;

  if (forgottenConcepts.length > 0 && missions.length < conceptCount) {
    const concept = forgottenConcepts[0];
    const m = masteryMap.get(concept.id);
    missions.push({
      id: `mission-forgot-${concept.id}`,
      title: `Recover: ${concept.title}`,
      description: `You haven't practiced ${concept.title} in over a week. Your mastery has dropped. Let's bring it back.`,
      conceptIds: [concept.id],
      tasks: [
        {
          type: "review",
          conceptId: concept.id,
          conceptTitle: concept.title,
          estimatedMinutes: 15,
          reason: `Last practiced ${daysSince(m?.last_practiced_at ?? m?.updated_at)} days ago`,
        },
        {
          type: "practice",
          conceptId: concept.id,
          conceptTitle: concept.title,
          estimatedMinutes: 20,
          reason: "Reinforce understanding after forgetting",
        },
      ],
      estimatedMinutes: 35,
      priority: "high",
      reason: `Mastery dropped to ${m ? Math.round(m.score * 100) : 0}% due to lack of practice`,
    });
  }

  if (weakConcepts.length > 0 && missions.length < conceptCount) {
    const { concept, mastery: m } = weakConcepts[0];
    missions.push({
      id: `mission-weak-${concept.id}`,
      title: `Strengthen: ${concept.title}`,
      description: `Your understanding of ${concept.title} is below target. Let's build it up with focused practice.`,
      conceptIds: [concept.id],
      tasks: [
        {
          type: "tutor",
          conceptId: concept.id,
          conceptTitle: concept.title,
          estimatedMinutes: 20,
          reason: `Mastery at ${m ? Math.round(m.score * 100) : 0}% - needs reinforcement`,
        },
        {
          type: "practice",
          conceptId: concept.id,
          conceptTitle: concept.title,
          estimatedMinutes: 15,
          reason: "Apply the concept with targeted questions",
        },
      ],
      estimatedMinutes: 35,
      priority: "high",
      reason: `Mastery at ${m ? Math.round(m.score * 100) : 0}% needs improvement`,
    });
  }

  if (dueFlashcards > 0 && missions.length < conceptCount) {
    missions.push({
      id: "mission-flashcards",
      title: "Flashcard Review",
      description: `You have ${dueFlashcards} flashcards due for review. Keep your memory fresh.`,
      conceptIds: [],
      tasks: [
        {
          type: "flashcards",
          conceptId: null,
          conceptTitle: "Due Reviews",
          estimatedMinutes: Math.min(15, dueFlashcards * 2),
          reason: `${dueFlashcards} cards due for spaced repetition`,
        },
      ],
      estimatedMinutes: Math.min(15, dueFlashcards * 2),
      priority: "medium",
      reason: "Spaced repetition due",
    });
  }

  if (nextConcepts.length > 0 && missions.length < conceptCount) {
    const concept = nextConcepts.find((c) => !masteryMap.has(c.id)) ?? nextConcepts[0];
    const m = masteryMap.get(concept.id);
    missions.push({
      id: `mission-new-${concept.id}`,
      title: `New: ${concept.title}`,
      description: `Ready to learn something new? Start with ${concept.title}.`,
      conceptIds: [concept.id],
      tasks: [
        {
          type: "learn",
          conceptId: concept.id,
          conceptTitle: concept.title,
          estimatedMinutes: 25,
          reason: "Prerequisites met, ready for new material",
        },
      ],
      estimatedMinutes: 25,
      priority: "medium",
      reason: m ? `Mastery at ${Math.round(m.score * 100)}%` : "Not yet started",
    });
  }

  if (exams.length > 0 && missions.length < conceptCount) {
    const upcomingExam = exams.find((e) => e.status === "draft" || e.status === "in_progress");
    if (upcomingExam) {
      missions.push({
        id: "mission-exam",
        title: `Exam Prep: ${upcomingExam.title}`,
        description: `Your exam "${upcomingExam.title}" is coming up. Practice makes perfect.`,
        conceptIds: upcomingExam.concept_ids.slice(0, 3),
        tasks: [
          {
            type: "quiz",
            conceptId: null,
            conceptTitle: upcomingExam.title,
            estimatedMinutes: 20,
            reason: "Upcoming exam preparation",
          },
        ],
        estimatedMinutes: 20,
        priority: "high",
        reason: "Exam is approaching",
      });
    }
  }

  if (tasks.length > 0 && missions.length < conceptCount) {
    const pendingTasks = tasks.filter((t) => t.status === "pending").slice(0, 2);
    for (const task of pendingTasks) {
      if (missions.length >= conceptCount) break;
      missions.push({
        id: `mission-task-${task.id}`,
        title: task.title,
        description: task.description ?? `Continue with your planned task.`,
        conceptIds: task.concept_id ? [task.concept_id] : [],
        tasks: [
          {
            type: task.task_type as MissionTask["type"],
            conceptId: task.concept_id ?? null,
            conceptTitle: task.title,
            estimatedMinutes: task.estimated_minutes,
            reason: "From your study plan",
          },
        ],
        estimatedMinutes: task.estimated_minutes,
        priority: task.priority === "high" ? "high" : "medium",
        reason: "Scheduled in your plan",
      });
    }
  }

  if (missions.length === 0) {
    const defaultConcept = concepts[0];
    if (defaultConcept) {
      missions.push({
        id: `mission-default-${defaultConcept.id}`,
        title: `Continue Learning: ${defaultConcept.title}`,
        description: "Keep your streak alive with some focused study time.",
        conceptIds: [defaultConcept.id],
        tasks: [
          {
            type: "learn",
            conceptId: defaultConcept.id,
            conceptTitle: defaultConcept.title,
            estimatedMinutes: 20,
            reason: "No specific missions generated - continuing curriculum",
          },
        ],
        estimatedMinutes: 20,
        priority: "medium",
        reason: "Default continuation",
      });
    }
  }

  const totalMinutes = missions.reduce((sum, m) => sum + m.estimatedMinutes, 0);
  if (totalMinutes > availableMinutes && missions.length > 1) {
    missions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    let runningTotal = 0;
    const trimmed: DailyMission[] = [];
    for (const mission of missions) {
      if (runningTotal + mission.estimatedMinutes > availableMinutes && trimmed.length > 0) break;
      trimmed.push(mission);
      runningTotal += mission.estimatedMinutes;
    }
    return trimmed.length > 0 ? trimmed : missions.slice(0, 1);
  }

  return missions;
}

export function generateRecommendations(input: LearningBrainInput): SmartRecommendation[] {
  const { snapshot } = input;
  const {
    concepts = [],
    mastery = [],
    sessions = [],
    attempts = [],
    revision_schedule = [],
    memory = [],
  } = snapshot;

  const masteryMap = new Map(mastery.map((m) => [m.concept_id, m]));
  const recommendations: SmartRecommendation[] = [];

  const forgotten = concepts.filter((c) => {
    const m = masteryMap.get(c.id);
    if (!m) return false;
    return daysSince(m.last_practiced_at ?? m.updated_at) >= 14 && m.score >= 0.5;
  });

  for (const concept of forgotten.slice(0, 3)) {
    const m = masteryMap.get(concept.id);
    const days = daysSince(m?.last_practiced_at ?? m?.updated_at);
    recommendations.push({
      id: `rec-forgot-${concept.id}`,
      type: "forgotten",
      conceptId: concept.id,
      conceptTitle: concept.title,
      message: `You forgot ${concept.title}. It's been ${days} days since you last reviewed it.`,
      action: { type: "start_tutor", payload: { conceptId: concept.id } },
      urgency: days > 21 ? 10 : 8,
    });
  }

  const weakTopics = concepts
    .map((c) => ({ concept: c, mastery: masteryMap.get(c.id) }))
    .filter(({ mastery: m }) => m && m.score >= 0.3 && m.score < 0.6);

  for (const { concept, mastery: m } of weakTopics.slice(0, 3)) {
    if (!m) continue;
    const misconception = m.misconceptions?.[0];
    recommendations.push({
      id: `rec-weak-${concept.id}`,
      type: "weak_topic",
      conceptId: concept.id,
      conceptTitle: concept.title,
      message: misconception
        ? `You're struggling with ${concept.title}. Common issue: ${misconception}`
        : `Your understanding of ${concept.title} is weak. Let's strengthen it.`,
      action: { type: "start_practice", payload: { conceptId: concept.id } },
      urgency: 7,
    });
  }

  const unfinishedPlans = memory
    .filter((m) => m.memory_type === "goal" && m.importance > 0.7)
    .slice(0, 2);

  for (const mem of unfinishedPlans) {
    recommendations.push({
      id: `rec-goal-${mem.id}`,
      type: "habit",
      conceptId: null,
      conceptTitle: null,
      message: `Goal reminder: ${mem.summary ?? "Keep pushing toward your learning goals"}`,
      action: { type: "open_dashboard", payload: {} },
      urgency: 5,
    });
  }

  const prerequisites = concepts.filter((c) => {
    if (masteryMap.has(c.id) && masteryMap.get(c.id)!.score >= 0.55) return false;
    const unmetPrereqs = c.prerequisites.filter((p) => (masteryMap.get(p)?.score ?? 0) < 0.55);
    return unmetPrereqs.length === 0;
  });

  for (const concept of prerequisites.slice(0, 2)) {
    if (!masteryMap.has(concept.id)) {
      recommendations.push({
        id: `rec-prereq-${concept.id}`,
        type: "prerequisite",
        conceptId: concept.id,
        conceptTitle: concept.title,
        message: `You've unlocked ${concept.title}! All prerequisites are mastered.`,
        action: { type: "start_learning", payload: { conceptId: concept.id } },
        urgency: 6,
      });
    }
  }

  const sorted = recommendations.sort((a, b) => b.urgency - a.urgency);
  return sorted.slice(0, 5);
}

export function getStudyContext(input: LearningBrainInput) {
  const { snapshot } = input;
  const { profile, mastery = [], sessions = [], attempts = [] } = snapshot;

  const masteryValues = mastery.map((m) => m.score);
  const avgMastery =
    masteryValues.length > 0 ? masteryValues.reduce((a, b) => a + b, 0) / masteryValues.length : 0;

  const totalStudyTimeSeconds = attempts.reduce(
    (sum, a) => sum + ((a as unknown as { time_spent_seconds?: number }).time_spent_seconds ?? 0),
    0,
  );

  const recentSessions = sessions
    .filter((s) => isThisWeek(s.updated_at ?? s.created_at))
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? b.created_at).getTime() -
        new Date(a.updated_at ?? a.created_at).getTime(),
    );

  const preferredPace = profile?.preferred_pace ?? "moderate";
  const learningStyle = profile?.learning_style ?? "mixed";
  const explanationDepth = profile?.explanation_depth ?? "standard";
  const subjects = profile?.subjects ?? [];

  const subjectMastery = new Map<string, number[]>();
  for (const m of mastery) {
    const concept = snapshot.concepts?.find((c) => c.id === m.concept_id);
    const subj = concept?.subject ?? "unknown";
    if (!subjectMastery.has(subj)) subjectMastery.set(subj, []);
    subjectMastery.get(subj)!.push(m.score);
  }

  const subjectAverages = new Map<string, number>();
  for (const [subject, scores] of subjectMastery) {
    subjectAverages.set(subject, scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  return {
    avgMastery,
    totalStudyTimeSeconds,
    recentSessionCount: recentSessions.length,
    lastSessionAt: recentSessions[0]?.updated_at ?? recentSessions[0]?.created_at ?? null,
    preferredPace,
    learningStyle,
    explanationDepth,
    subjects,
    subjectAverages: Object.fromEntries(subjectAverages),
    masteryDistribution: {
      mastered: mastery.filter((m) => m.score >= 0.8).length,
      learning: mastery.filter((m) => m.score >= 0.6 && m.score < 0.8).length,
      introduced: mastery.filter((m) => m.score >= 0.35 && m.score < 0.6).length,
      notStarted: mastery.filter((m) => m.score < 0.35).length,
    },
    isNewUser: mastery.length === 0 && sessions.length === 0,
  };
}
