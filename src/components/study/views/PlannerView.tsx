import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, CheckCircle, Play, Plus, Target, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { completePlanTask } from "@/lib/learning/client";
import { callLearningSession } from "../lib/session-api";
import { StudyHeader } from "../StudyHeader";
import { MasteryBadge } from "../ui/MasteryBadge";
import { LoadingState } from "../ui/LoadingState";
import { EmptyState } from "../ui/EmptyState";
import { selectNextConcept } from "@/lib/learning/mastery";
import type {
  LearningSnapshot,
  StudyView,
  LearningPlan,
  LearningPlanTask,
  PlanTask,
} from "../types";

interface PlannerViewProps {
  snapshot: LearningSnapshot | undefined;
  userId: string | null;
  onNavigate: (view: StudyView) => void;
  onBack: () => void;
  refresh: () => void;
}

export function PlannerView({ snapshot, userId, onNavigate, onBack, refresh }: PlannerViewProps) {
  const { user } = useCurrentUser();
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [tasks, setTasks] = useState<LearningPlanTask[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchPlans = useCallback(async () => {
    if (!user?.id || !snapshot) return;
    setLoading(true);
    try {
      const planTasks = snapshot.tasks ?? [];
      setTasks(planTasks);

      const groupedPlans: LearningPlan[] = [];
      if (planTasks.length > 0) {
        const firstTask = planTasks[0];
        groupedPlans.push({
          id: firstTask.plan_id || "default",
          user_id: user.id,
          title: "Study Plan",
          starts_on: firstTask.due_at,
          ends_on: planTasks[planTasks.length - 1]?.due_at || firstTask.due_at,
          status: "active",
          generated_from: {},
          created_at: firstTask.created_at,
          updated_at: firstTask.created_at,
        });
      }
      setPlans(groupedPlans);
    } catch {
      setPlans([]);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, snapshot]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchPlans();
  }, [user?.id, snapshot, fetchPlans]);

  const handleGeneratePlan = async () => {
    if (!user?.id || !snapshot) return;

    const conceptIds = snapshot.concepts.slice(0, 8).map((c) => c.id);

    setGenerating(true);
    try {
      const res = await callLearningSession({
        action: "plan",
        conceptIds,
        weeklyMinutes: 180,
      });

      const planData = res as { title: string; tasks: PlanTask[] };
      if (planData.tasks && planData.tasks.length > 0) {
        setGeneratedTasks(planData.tasks);
        refresh();
      }
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!user?.id) return;
    try {
      await completePlanTask(user.id, taskId);
      refresh();
      await fetchPlans();
    } catch {
      // ignore
    }
  };

  const upcomingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  if (!snapshot || !user) {
    return (
      <div className="p-6">
        <StudyHeader
          view="planner"
          title="Study Planner"
          onBack={onBack}
          showBack
          icon={<Calendar className="h-6 w-6 text-primary" />}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <StudyHeader
        view="planner"
        title="Study Planner"
        subtitle="Your adaptive learning schedule"
        onBack={onBack}
        showBack
        icon={<Calendar className="h-6 w-6 text-primary" />}
      />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6"
      >
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGeneratePlan}
          disabled={generating}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold",
            generating
              ? "cursor-not-allowed bg-muted/30 text-muted-foreground"
              : "bg-primary text-primary-foreground shadow hover:bg-primary/90",
          )}
        >
          {generating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              Generating plan…
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Generate Adaptive Plan
            </>
          )}
        </motion.button>
      </motion.div>

      {loading ? (
        <LoadingState message="Loading your study plan…" />
      ) : tasks.length === 0 && generatedTasks.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <EmptyState
            icon={<Calendar className="h-8 w-8" />}
            title="No study plan yet"
            description="Generate an AI-powered adaptive study plan based on your mastery data."
            action={
              <button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
              >
                Create Plan
              </button>
            }
          />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="space-y-6"
        >
          {generatedTasks.length > 0 && (
            <div>
              <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Suggested Plan (generated)
              </h3>
              <div className="space-y-2">
                {generatedTasks.map((task, i) => {
                  const concept = snapshot.concepts.find((c) => c.id === task.conceptId);
                  const masteryScore = task.conceptId
                    ? snapshot.mastery.find((m) => m.concept_id === task.conceptId)?.score
                    : undefined;
                  return (
                    <motion.div
                      key={`gen-${i}`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className="flex items-center justify-between rounded-lg border border-border/30 bg-card/40 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/40">
                          <Target className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {task.taskType === "learn"
                              ? "Learn "
                              : task.taskType === "practice"
                                ? "Practice "
                                : "Review "}
                            {concept?.title ?? `Concept ${task.conceptId.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {task.taskType} · {task.estimatedMinutes} min · Due{" "}
                            {new Date(task.dueAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {masteryScore !== undefined && (
                        <MasteryBadge score={masteryScore} size="sm" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {upcomingTasks.length > 0 && (
            <div>
              <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Upcoming
              </h3>
              <div className="space-y-2">
                {upcomingTasks.map((task, i) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    concept={snapshot.concepts.find((c) => c.id === task.concept_id)}
                    mastery={
                      task.concept_id
                        ? snapshot.mastery.find((m) => m.concept_id === task.concept_id)
                        : undefined
                    }
                    onComplete={() => handleCompleteTask(task.id)}
                    delay={i}
                  />
                ))}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div>
              <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Completed
              </h3>
              <div className="space-y-2">
                {completedTasks.slice(0, 10).map((task, i) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    concept={snapshot.concepts.find((c) => c.id === task.concept_id)}
                    mastery={
                      task.concept_id
                        ? snapshot.mastery.find((m) => m.concept_id === task.concept_id)
                        : undefined
                    }
                    onComplete={() => {}}
                    completed
                    delay={i}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

interface TaskItemProps {
  task: LearningPlanTask;
  concept?: { title: string; standard_code: string; subject?: string };
  mastery?: { score: number };
  onComplete: () => void;
  completed?: boolean;
  delay?: number;
}

function TaskItem({
  task,
  concept,
  mastery,
  onComplete,
  completed = false,
  delay = 0,
}: TaskItemProps) {
  const taskTypeIcons: Record<string, React.ReactNode> = {
    learn: <Play className="h-3.5 w-3.5" />,
    practice: <Target className="h-3.5 w-3.5" />,
    review: <Clock className="h-3.5 w-3.5" />,
    reflect: <CheckCircle className="h-3.5 w-3.5" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: delay * 0.03 }}
      className={cn(
        "flex items-center justify-between rounded-lg border border-border/30 bg-card/40 p-3",
        completed && "opacity-60",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/40">
          {taskTypeIcons[task.task_type] ?? <Calendar className="h-3.5 w-3.5" />}
        </div>
        <div>
          <p className={cn("text-sm font-medium", completed && "opacity-60")}>{task.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{task.task_type}</span>
            <span>·</span>
            <span>{task.estimated_minutes} min</span>
            {concept && <span>· {concept.subject}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {mastery && <MasteryBadge score={mastery.score} size="sm" />}
        {!completed && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onComplete}
            className="rounded-full p-1 text-emerald-400 hover:bg-emerald-500/10"
            aria-label="Mark as complete"
          >
            <CheckCircle className="h-4 w-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
