import { useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningPlanTask } from "@/lib/learning/types";

interface TimelineViewProps {
  tasks: LearningPlanTask[];
  dailyTarget: number;
  onTaskClick: (task: LearningPlanTask) => void;
}

export function TimelineView({ tasks, dailyTarget, onTaskClick }: TimelineViewProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, LearningPlanTask[]>();
    for (const t of tasks) {
      const day = new Date(t.due_at).toISOString().slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(t);
      map.set(day, list);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, dayTasks]) => ({
        date,
        dayTasks: dayTasks.sort((a, b) => a.position - b.position),
        totalMinutes: dayTasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0),
        overloaded: dayTasks.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0) > dailyTarget,
      }));
  }, [tasks, dailyTarget]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const taskTypeColors: Record<string, string> = {
    learn: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    practice: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    quiz: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    flashcards: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    custom: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className="space-y-3">
      {grouped.map((day, dayIndex) => (
        <motion.div
          key={day.date}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: dayIndex * 0.03 }}
          className={cn(
            "rounded-xl border p-4",
            day.overloaded ? "border-amber-500/30 bg-amber-500/5" : "border-border/30 bg-card/30",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h4 className="font-display text-sm font-semibold text-foreground">
                {formatDate(day.date)}
              </h4>
              <p className="text-xs text-muted-foreground">
                {day.totalMinutes} min / {dailyTarget} min
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-2 w-24 overflow-hidden rounded-full bg-muted/40">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    day.overloaded ? "bg-amber-400" : "bg-primary",
                  )}
                  style={{ width: `${Math.min(100, (day.totalMinutes / dailyTarget) * 100)}%` }}
                />
              </div>
              {day.overloaded && <AlertTriangle className="h-4 w-4 text-amber-400" />}
            </div>
          </div>
          <div className="space-y-2">
            {day.dayTasks.map((task, i) => (
              <motion.button
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.02 }}
                onClick={() => onTaskClick(task)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-left transition hover:border-primary/30",
                  taskTypeColors[task.task_type] ?? "border-border/30 bg-card/40",
                  task.status === "completed" && "opacity-60",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/40">
                    <Clock className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        task.status === "completed" && "line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{task.task_type}</span>
                      <span>·</span>
                      <span>{task.estimated_minutes} min</span>
                      <span>·</span>
                      <span className="capitalize">{task.priority} priority</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      task.status === "completed" && "bg-emerald-500/10 text-emerald-400",
                      task.status === "skipped" && "bg-muted text-muted-foreground",
                      task.status === "in_progress" && "bg-primary/10 text-primary",
                      task.status === "pending" && "bg-muted/40 text-muted-foreground",
                    )}
                  >
                    {task.status}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      ))}
      {grouped.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">No tasks scheduled yet.</p>
        </div>
      )}
    </div>
  );
}
