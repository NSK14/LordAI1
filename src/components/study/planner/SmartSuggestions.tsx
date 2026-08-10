import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { LearningPlanTask, LearningPlan } from "@/lib/learning/types";

interface SmartSuggestionsProps {
  plan: LearningPlan;
  tasks: LearningPlanTask[];
  onRebalance: () => void;
}

interface Suggestion {
  id: string;
  message: string;
  action: () => void;
  actionLabel: string;
}

export function SmartSuggestions({ plan, tasks, onRebalance }: SmartSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newSuggestions: Suggestion[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const pending = tasks.filter((t) => t.status === "pending" || t.status === "in_progress");
    const totalTasks = tasks.length;

    const daysRemaining = Math.max(
      0,
      Math.ceil(
        (new Date(plan.ends_on + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) /
          86400000,
      ),
    );

    if (pending.length > daysRemaining && daysRemaining > 0) {
      const behindCount = pending.length - daysRemaining;
      if (behindCount > 0 && behindCount <= 5) {
        newSuggestions.push({
          id: "behind",
          message: `You're behind by ${behindCount} task${behindCount !== 1 ? "s" : ""}. Want me to rebalance the next ${Math.min(5, daysRemaining)} days?`,
          action: onRebalance,
          actionLabel: "Rebalance",
        });
      }
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const tomorrowTasks = tasks.filter(
      (t) =>
        new Date(t.due_at).toISOString().slice(0, 10) === tomorrowStr && t.status !== "completed",
    );
    const highPriorityTomorrow = tomorrowTasks.filter((t) => t.priority === "high");
    if (highPriorityTomorrow.length >= 3) {
      newSuggestions.push({
        id: "heavy-tomorrow",
        message: `You have ${highPriorityTomorrow.length} difficult topics scheduled tomorrow. Want me to spread them out?`,
        action: onRebalance,
        actionLabel: "Spread out",
      });
    }

    const examDate = (plan.generated_from as Record<string, unknown>)?.exam_date as
      string | undefined;
    if (examDate) {
      const daysToExam = Math.max(
        0,
        Math.ceil(
          (new Date(examDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) /
            86400000,
        ),
      );
      if (daysToExam <= 14 && daysToExam > 0) {
        newSuggestions.push({
          id: "exam-approaching",
          message: `Your exam is in ${daysToExam} days. Want me to create a revision phase?`,
          action: onRebalance,
          actionLabel: "Create revision",
        });
      }
    }

    if (totalTasks > 0 && pending.length === totalTasks && totalTasks > 3) {
      newSuggestions.push({
        id: "no-progress",
        message:
          "You haven't completed any tasks yet. Start with the easiest one to build momentum.",
        action: () => toast("Keep going! You've got this."),
        actionLabel: "Got it",
      });
    }

    setSuggestions(newSuggestions);
  }, [plan, tasks, onRebalance]);

  const dismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const visible = suggestions.filter((s) => !dismissed.has(s.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {visible.map((suggestion) => (
          <motion.div
            key={suggestion.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3"
          >
            <p className="flex-1 text-sm text-foreground">{suggestion.message}</p>
            <div className="ml-3 flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={suggestion.action}
                className="h-7 text-xs text-primary hover:text-primary"
              >
                {suggestion.actionLabel}
              </Button>
              <button
                onClick={() => dismiss(suggestion.id)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
