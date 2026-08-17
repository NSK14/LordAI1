import type {
  LearningConcept,
  Mastery,
  LearningHistory,
  LearningSession,
  LearningAttempt,
} from "./types";
import type { ConceptNode } from "./concept-graph";
import { updateGraph } from "./concept-graph";

export interface JourneyEvent {
  id: string;
  date: string;
  type:
    "learned" | "practiced" | "mastered" | "exam" | "tutor" | "flashcard" | "milestone" | "streak";
  conceptId: string | null;
  conceptTitle: string | null;
  subject: string | null;
  description: string;
  xpEarned: number;
  metadata: Record<string, unknown>;
}

export interface JourneyMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  xpReward: number;
  type:
    | "concept_mastered"
    | "streak"
    | "level_up"
    | "exam_completed"
    | "subject_completed"
    | "milestone";
}

export interface LearningJourney {
  events: JourneyEvent[];
  milestones: JourneyMilestone[];
  subjectProgress: Array<{
    subject: string;
    totalConcepts: number;
    mastered: number;
    learning: number;
    notStarted: number;
    percentComplete: number;
  }>;
  totalXp: number;
  currentLevel: number;
  daysActive: number;
  studyStreak: number;
}

export function buildLearningJourney(
  concepts: LearningConcept[],
  mastery: Mastery[],
  history: LearningHistory[],
  sessions: LearningSession[],
  attempts: LearningAttempt[],
): LearningJourney {
  const masteryMap = new Map(mastery.map((m) => [m.concept_id, m]));
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const events: JourneyEvent[] = [];

  for (const h of history) {
    const concept = h.concept_id ? conceptMap.get(h.concept_id) : undefined;
    events.push({
      id: h.id,
      date: h.created_at,
      type: h.session_type as JourneyEvent["type"],
      conceptId: h.concept_id,
      conceptTitle: concept?.title ?? h.title,
      subject: concept?.subject ?? null,
      description: h.summary ?? `${h.session_type} session: ${h.title}`,
      xpEarned: h.outcome_score ?? 0,
      metadata: h.metadata,
    });
  }

  for (const session of sessions) {
    const concept = session.concept_id ? conceptMap.get(session.concept_id) : undefined;
    events.push({
      id: `session-${session.id}`,
      date: session.updated_at ?? session.created_at,
      type: "tutor",
      conceptId: session.concept_id,
      conceptTitle: concept?.title ?? session.title,
      subject: concept?.subject ?? session.subject ?? null,
      description: `Tutor session: ${session.title}`,
      xpEarned: 10,
      metadata: {},
    });
  }

  for (const attempt of attempts) {
    const concept = conceptMap.get(attempt.concept_id);
    events.push({
      id: `attempt-${attempt.id}`,
      date: attempt.created_at,
      type: "practiced",
      conceptId: attempt.concept_id,
      conceptTitle: concept?.title ?? null,
      subject: concept?.subject ?? null,
      description: attempt.correct ? "Correct answer" : "Incorrect answer - learned from mistake",
      xpEarned: attempt.correct ? 25 : 5,
      metadata: { correct: attempt.correct },
    });
  }

  for (const m of mastery) {
    const concept = conceptMap.get(m.concept_id);
    if (m.score >= 0.8 && m.updated_at) {
      events.push({
        id: `mastery-${m.concept_id}-${m.updated_at}`,
        date: m.updated_at,
        type: "mastered",
        conceptId: m.concept_id,
        conceptTitle: concept?.title ?? null,
        subject: concept?.subject ?? null,
        description: `Mastered ${concept?.title ?? m.concept_id}`,
        xpEarned: 100,
        metadata: { score: m.score },
      });
    }
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const milestones: JourneyMilestone[] = [];
  const uniqueDates = new Set(events.map((e) => new Date(e.date).toDateString()));
  milestones.push({
    id: "journey-start",
    date: events.length > 0 ? events[events.length - 1].date : new Date().toISOString(),
    title: "Learning Journey Begins",
    description: "Started your AI-powered learning journey",
    xpReward: 0,
    type: "milestone",
  });

  const subjectGroups = new Map<string, { total: number; mastered: number; learning: number }>();
  for (const concept of concepts) {
    const m = masteryMap.get(concept.id);
    if (!subjectGroups.has(concept.subject)) {
      subjectGroups.set(concept.subject, { total: 0, mastered: 0, learning: 0 });
    }
    const group = subjectGroups.get(concept.subject)!;
    group.total++;
    if (m && m.score >= 0.8) group.mastered++;
    else if (m && m.score >= 0.6) group.learning++;
  }

  const subjectProgress = Array.from(subjectGroups.entries()).map(([subject, stats]) => ({
    subject,
    totalConcepts: stats.total,
    mastered: stats.mastered,
    learning: stats.learning,
    notStarted: stats.total - stats.mastered - stats.learning,
    percentComplete: stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0,
  }));

  const totalXp = events.reduce((sum, e) => sum + e.xpEarned, 0);

  return {
    events: events.slice(0, 100),
    milestones,
    subjectProgress,
    totalXp,
    currentLevel: 1,
    daysActive: uniqueDates.size,
    studyStreak: calculateStreak(sessions, attempts),
  };
}

function calculateStreak(sessions: LearningSession[], attempts: LearningAttempt[]): number {
  const dates = new Set([
    ...sessions.map((s) => new Date(s.updated_at ?? s.created_at).toDateString()),
    ...attempts.map((a) => new Date(a.created_at).toDateString()),
  ]);
  const sorted = Array.from(dates)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  if (sorted.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const mostRecent = sorted[0];
  mostRecent.setHours(0, 0, 0, 0);

  if (mostRecent.getTime() !== today.getTime() && mostRecent.getTime() !== yesterday.getTime()) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i - 1];
    const prev = sorted[i];
    const diff = (current.getTime() - prev.getTime()) / 86_400_000;
    if (diff === 1) streak++;
    else if (diff > 1) break;
  }
  return streak;
}

export function getConceptJourney(
  conceptId: string,
  concepts: LearningConcept[],
  mastery: Mastery[],
  history: LearningHistory[],
  sessions: LearningSession[],
  attempts: LearningAttempt[],
): {
  concept: LearningConcept;
  mastery: Mastery | undefined;
  status: string;
  events: JourneyEvent[];
  prerequisites: Array<{ concept: LearningConcept; mastery: Mastery | undefined; status: string }>;
  nextSteps: string[];
} {
  const concept = concepts.find((c) => c.id === conceptId);
  const m = mastery.find((ma) => ma.concept_id === conceptId);
  if (!concept) throw new Error("Concept not found");

  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const conceptHistory = history.filter((h) => h.concept_id === conceptId);
  const conceptSessions = sessions.filter((s) => s.concept_id === conceptId);
  const conceptAttempts = attempts.filter((a) => a.concept_id === conceptId);

  const events: JourneyEvent[] = [];
  for (const h of conceptHistory) {
    events.push({
      id: h.id,
      date: h.created_at,
      type: h.session_type as JourneyEvent["type"],
      conceptId: h.concept_id,
      conceptTitle: concept.title,
      subject: concept.subject,
      description: h.summary ?? h.title,
      xpEarned: h.outcome_score ?? 0,
      metadata: h.metadata,
    });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const prerequisites = concept.prerequisites
    .map((pId) => {
      const pConcept = conceptMap.get(pId);
      const pMastery = mastery.find((ma) => ma.concept_id === pId);
      return {
        concept: pConcept!,
        mastery: pMastery,
        status: pMastery
          ? pMastery.score >= 0.8
            ? "mastered"
            : pMastery.score >= 0.6
              ? "learning"
              : "needs_work"
          : "not-started",
      };
    })
    .filter((p) => p.concept);

  const g = updateGraph(concepts, mastery);
  const nextConcepts = g.getChildren(conceptId);
  const nextSteps = nextConcepts.map((id) => conceptMap.get(id)?.title ?? id).filter(Boolean);

  return {
    concept,
    mastery: m,
    status: m
      ? m.score >= 0.8
        ? "mastered"
        : m.score >= 0.6
          ? "learning"
          : "introduced"
      : "not-started",
    events,
    prerequisites,
    nextSteps,
  };
}
