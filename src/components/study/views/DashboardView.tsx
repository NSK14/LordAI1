import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Target,
  Flame,
  Trophy,
  Calendar,
  Sparkles,
  GraduationCap,
  Brain,
  FileQuestion,
} from "lucide-react";
import { selectNextConcept, isReadyForTest } from "@/lib/learning/mastery";
import { StatCard } from "../ui/StatCard";
import { QuickActionTile } from "../ui/QuickActionTile";
import { ConceptCard } from "../ui/ConceptCard";
import { StudyHeader } from "../StudyHeader";
import type { LearningSnapshot, StudyView } from "../types";

interface DashboardViewProps {
  snapshot: LearningSnapshot | undefined;
  userId: string | null;
  onNavigate: (view: StudyView) => void;
  onStartPractice: (conceptId?: string) => void;
  onStartTutor: (conceptId?: string) => void;
  onConceptClick: (conceptId: string) => void;
}

export function DashboardView({
  snapshot,
  userId,
  onNavigate,
  onStartPractice,
  onStartTutor,
  onConceptClick,
}: DashboardViewProps) {
  if (!snapshot) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No learning data available yet.</p>
      </div>
    );
  }

  const { concepts, mastery, tasks, sessions, attempts, profile } = snapshot;

  const masteryMap = new Map(mastery.map((m) => [m.concept_id, m]));
  const nextConcept = selectNextConcept(concepts, mastery);

  const masteredCount = mastery.filter((m) => m.score >= 0.8).length;
  const totalMastery = mastery.length;
  const masteryPercent = totalMastery > 0 ? Math.round((masteredCount / totalMastery) * 100) : 0;

  const masteredConcepts = concepts.filter((c) => {
    const m = masteryMap.get(c.id);
    return m && m.score >= 0.8;
  });

  const learningConcepts = concepts.filter((c) => {
    const m = masteryMap.get(c.id);
    return m && m.score >= 0.6 && m.score < 0.8;
  });

  const notStartedConcepts = concepts.filter((c) => {
    const m = masteryMap.get(c.id);
    return !m || m.score < 0.35;
  });

  const today = new Date().toDateString();
  const todaysAttempts = attempts.filter((a) => new Date(a.created_at).toDateString() === today);
  const dailyGoal = Math.min(100, Math.round((todaysAttempts.length / 3) * 100));

  let streak = 0;
  const cursor = new Date();
  const activeDays = new Set(
    [...sessions, ...attempts].map((item) => new Date(item.created_at).toDateString()),
  );
  while (activeDays.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const xp = mastery.reduce((sum, m) => sum + (m.evidence_count ?? 0) * 25, 0);

  const upcomingTasks = tasks.slice(0, 5);
  const isReady = isReadyForTest(mastery);

  const quickActions = [
    {
      icon: <Target className="h-5 w-5" />,
      title: "Adaptive Practice",
      subtitle: "AI-generated questions",
      onClick: () => onStartPractice(nextConcept?.id),
      disabled: !nextConcept,
    },
    {
      icon: <GraduationCap className="h-5 w-5" />,
      title: "AI Tutor Session",
      subtitle: "Ask LORD anything",
      onClick: () => onStartTutor(nextConcept?.id),
      disabled: !nextConcept,
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "Flashcard Study",
      subtitle: "Spaced repetition",
      onClick: () => onNavigate("flashcards"),
      disabled: !nextConcept,
    },
    {
      icon: <FileQuestion className="h-5 w-5" />,
      title: "Take a Test",
      subtitle: "Mastery checkpoint",
      onClick: () => onNavigate("exams"),
      disabled: !isReady,
    },
  ];

  // Mastery stats for the persistent header across study views.
  const totalConcepts = concepts.length;
  const overallMasteryPercent =
    totalConcepts > 0 ? Math.round((masteredCount / totalConcepts) * 100) : 0;

  return (
    <div className="p-6">
      <StudyHeader
        view="dashboard"
        title="Learning Dashboard"
        subtitle="Your personalized adaptive learning hub"
        icon={<GraduationCap className="h-6 w-6 text-primary" />}
        masteryPercent={overallMasteryPercent}
        totalConcepts={totalConcepts}
        masteredCount={masteredCount}
      />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          label="Study Streak"
          value={`${streak} day${streak !== 1 ? "s" : ""}`}
          detail={streak ? "Keep it going!" : "Start a session today"}
          accent="amber"
          delay={0}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Mastery"
          value={`${masteryPercent}%`}
          detail={`${masteredCount} of ${totalMastery} concepts mastered`}
          accent="emerald"
          delay={1}
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Today's Goal"
          value={`${dailyGoal}%`}
          detail={`${todaysAttempts.length}/3 practice attempts`}
          accent="cyan"
          delay={2}
        />
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          label="Learning XP"
          value={String(xp)}
          detail="Earned from practice and mastery"
          accent="violet"
          delay={3}
        />
      </motion.section>

      {nextConcept && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-8 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-6"
        >
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Target className="h-3.5 w-3.5" />
            Next Focus
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground">{nextConcept.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{nextConcept.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStartPractice(nextConcept.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
            >
              <Target className="h-4 w-4" />
              Start Practice
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStartTutor(nextConcept.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-border/40 px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/20"
            >
              <GraduationCap className="h-4 w-4" />
              Ask LORD
            </motion.button>
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-8"
      >
        <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action, i) => (
            <QuickActionTile
              key={action.title}
              icon={action.icon}
              title={action.title}
              subtitle={action.subtitle}
              onClick={action.onClick}
              disabled={action.disabled}
              delay={i}
            />
          ))}
        </div>
      </motion.section>

      {upcomingTasks.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mb-8"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-foreground">Upcoming Tasks</h3>
            <button
              onClick={() => onNavigate("planner")}
              className="text-xs text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{task.title}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(task.due_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="mb-8"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-foreground">Your Concepts</h3>
          <button
            onClick={() => onNavigate("concepts")}
            className="text-xs text-primary hover:underline"
          >
            View all
          </button>
        </div>

        {concepts.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {concepts.slice(0, 8).map((concept, i) => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                masteryScore={masteryMap.get(concept.id)?.score}
                onClick={() => onConceptClick(concept.id)}
                compact
                delay={i}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No concepts available yet. Start practicing to build your learning path.
          </div>
        )}
      </motion.section>

      {masteredCount > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="mb-8"
        >
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
            Mastered Concepts
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {masteredConcepts.slice(0, 6).map((concept, i) => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                masteryScore={masteryMap.get(concept.id)?.score}
                onClick={() => onConceptClick(concept.id)}
                compact
                delay={i}
              />
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
