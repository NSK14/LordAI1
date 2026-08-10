import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Target, Calendar, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LearningPlan, LearningPlanTask } from "@/lib/learning/types";

interface PlanProgressProps {
  plan: LearningPlan;
  tasks: LearningPlanTask[];
}

export function PlanProgress({ plan, tasks }: PlanProgressProps) {
  const completed = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const remainingMinutes = tasks
    .filter((t) => t.status !== "completed")
    .reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);

  const today = new Date().toISOString().slice(0, 10);
  const targetDate = plan.ends_on;
  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(targetDate + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime()) /
        86400000,
    ),
  );

  const pendingCount = tasks.filter(
    (t) => t.status === "pending" || t.status === "in_progress",
  ).length;
  const onTrack = pendingCount <= daysRemaining * ((plan.daily_minutes ?? 120) / 30);

  const statusColor =
    plan.status === "paused"
      ? "text-amber-400"
      : plan.status === "completed"
        ? "text-emerald-400"
        : plan.status === "archived"
          ? "text-muted-foreground"
          : onTrack
            ? "text-emerald-400"
            : "text-amber-400";

  const statusLabel =
    plan.status === "paused"
      ? "Paused"
      : plan.status === "completed"
        ? "Completed"
        : plan.status === "archived"
          ? "Archived"
          : onTrack
            ? "On track"
            : "Behind schedule";

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
          Plan Progress
        </h3>
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", statusColor)}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {statusLabel}
        </span>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {completed} / {total} tasks
          </span>
          <span className="font-semibold text-foreground">{percent}%</span>
        </div>
        <Progress value={percent} className="mt-1.5 h-2" />
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">
            {remainingMinutes >= 60
              ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m`
              : `${remainingMinutes}m`}
          </p>
          <p className="text-xs text-muted-foreground">Remaining</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {daysRemaining > 0 ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}` : "Today"}
          </p>
          <p className="text-xs text-muted-foreground">Until target</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {new Date(targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground">Target date</p>
        </div>
      </div>
    </div>
  );
}
