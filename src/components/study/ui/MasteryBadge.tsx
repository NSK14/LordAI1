import { cn } from "@/lib/utils";
import { getMasteryLevel, type MasteryLevel } from "@/components/study/types";

interface MasteryBadgeProps {
  score: number | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const LEVEL_COLORS: Record<MasteryLevel, string> = {
  mastered: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  learning: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  introduced: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  "not-started": "bg-slate-600/20 text-slate-500 border-slate-600/30",
};

const LEVEL_LABELS: Record<MasteryLevel, string> = {
  mastered: "Mastered",
  learning: "Learning",
  introduced: "Introduced",
  "not-started": "Not Started",
};

export function MasteryBadge({
  score,
  size = "md",
  showLabel = false,
  className,
}: MasteryBadgeProps) {
  const level = getMasteryLevel(score);
  const percentage = Math.round((score ?? 0) * 100);
  const sizeClasses = {
    sm: "h-5 px-1.5 text-[9px]",
    md: "h-6 px-2 text-[10px]",
    lg: "h-7 px-2.5 text-xs",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-mono font-bold uppercase tracking-wider",
        LEVEL_COLORS[level],
        sizeClasses[size],
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: getLevelColorValue(level) }}
      />
      {showLabel && <span>{LEVEL_LABELS[level]}</span>}
      {!showLabel && <span>{percentage}%</span>}
    </div>
  );
}

function getLevelColorValue(level: MasteryLevel): string {
  switch (level) {
    case "mastered":
      return "#34d399";
    case "learning":
      return "#fbbf24";
    case "introduced":
      return "#94a3b8";
    default:
      return "#64748b";
  }
}
