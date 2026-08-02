import type { LearningConcept } from "@/components/study/types";
import { MasteryBadge } from "./MasteryBadge";
import { DifficultyStars } from "./DifficultyStars";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ConceptCardProps {
  concept: LearningConcept;
  masteryScore?: number;
  onClick?: () => void;
  compact?: boolean;
  delay?: number;
  className?: string;
}

export function ConceptCard({
  concept,
  masteryScore,
  onClick,
  compact = false,
  delay = 0,
  className,
}: ConceptCardProps) {
  const difficulty = concept.difficulty ?? 3;
  const subject = concept.subject ?? "General";
  const framework = concept.framework ?? "CBSE";

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05, ease: "easeOut" }}
      onClick={onClick}
      className={cn(
        "group relative block w-full text-left transition-all duration-200",
        "hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(66,133,244,0.15)]",
        className,
      )}
    >
      <div
        className={cn(
          "hud-panel p-4",
          "border transition-colors duration-200",
          "group-hover:border-primary/30",
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {" "}
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {framework}
            </span>
            <span className="rounded-md bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {subject}
            </span>
          </div>
          <MasteryBadge score={masteryScore} size="sm" />
        </div>

        <h3
          className={cn(
            "font-display font-semibold leading-snug text-foreground",
            compact ? "text-sm" : "text-base",
          )}
        >
          {concept.title}
        </h3>

        {concept.description && !compact && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground/80">
            {concept.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <DifficultyStars difficulty={difficulty} size="sm" showLabel />
          <span className="text-[10px] font-mono text-muted-foreground/60">
            {concept.standard_code}
          </span>
        </div>

        {concept.keywords && concept.keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {concept.keywords.slice(0, 3).map((kw) => (
              <span
                key={kw}
                className="rounded-md bg-accent/10 px-1.5 py-0.5 text-[9px] text-accent-foreground/60"
              >
                #{kw}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  );
}
