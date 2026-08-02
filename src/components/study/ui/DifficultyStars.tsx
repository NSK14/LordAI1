import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface DifficultyStarsProps {
  difficulty: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Introductory",
  2: "Foundational",
  3: "Standard",
  4: "Advanced",
  5: "Mastery",
};

export function DifficultyStars({
  difficulty,
  max = 5,
  size = "md",
  showLabel = false,
  className,
}: DifficultyStarsProps) {
  const safeDifficulty = Math.max(1, Math.min(max, Math.round(difficulty)));
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  };

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            i < safeDifficulty ? "fill-amber-400 text-amber-400" : "text-slate-600",
            sizeClasses[size],
          )}
        />
      ))}
      {showLabel && (
        <span className="ml-1.5 text-xs text-muted-foreground">
          {DIFFICULTY_LABELS[safeDifficulty] ?? `Level ${safeDifficulty}`}
        </span>
      )}
    </div>
  );
}
