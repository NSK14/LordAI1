import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanOptimizationResult, LearningPlanTask } from "@/lib/learning/types";

interface PlanHealthProps {
  result: PlanOptimizationResult;
  tasks: LearningPlanTask[];
}

export function PlanHealth({ result, tasks }: PlanHealthProps) {
  const { health } = result;

  const healthItems = [
    {
      label: "Workload",
      value: health.workload,
      icon:
        health.workload === "optimal" || health.workload === "low" ? CheckCircle2 : AlertTriangle,
      color:
        health.workload === "optimal" || health.workload === "low"
          ? "text-emerald-400"
          : "text-amber-400",
    },
    {
      label: "Coverage",
      value: health.coverage,
      icon: health.coverage === "excellent" || health.coverage === "good" ? CheckCircle2 : Info,
      color:
        health.coverage === "excellent" || health.coverage === "good"
          ? "text-emerald-400"
          : "text-amber-400",
    },
    {
      label: "Revision",
      value: health.revision,
      icon:
        health.revision === "good"
          ? CheckCircle2
          : health.revision === "fair"
            ? Info
            : AlertTriangle,
      color:
        health.revision === "good"
          ? "text-emerald-400"
          : health.revision === "fair"
            ? "text-amber-400"
            : "text-red-400",
    },
    {
      label: "Weak topics",
      value: `${health.weakTopics} topics`,
      icon: health.weakTopics === 0 ? CheckCircle2 : AlertTriangle,
      color:
        health.weakTopics === 0
          ? "text-emerald-400"
          : health.weakTopics <= 3
            ? "text-amber-400"
            : "text-red-400",
    },
    {
      label: "Deadline",
      value: health.deadline.replace("_", " "),
      icon:
        health.deadline === "on_track" || health.deadline === "ahead"
          ? CheckCircle2
          : AlertTriangle,
      color:
        health.deadline === "on_track" || health.deadline === "ahead"
          ? "text-emerald-400"
          : "text-amber-400",
    },
  ];

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 p-4">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
        Plan Health
      </h3>
      <div className="mb-4 grid grid-cols-2 gap-3">
        {healthItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <item.icon className={cn("h-4 w-4 shrink-0", item.color)} />
            <div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn("text-sm font-medium capitalize", item.color)}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>
      {totalCount > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold text-foreground">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted/40">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}
      {result.recommendations.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-foreground">Recommendations:</h4>
          <ul className="space-y-1.5">
            {result.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
