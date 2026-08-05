import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft } from "lucide-react";
import type { StudyView } from "./types";

interface StudyHeaderProps {
  view: StudyView;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
  className?: string;
  // Optional progress stats
  masteryPercent?: number;
  totalConcepts?: number;
  masteredCount?: number;
}

export function StudyHeader({
  view: _view,
  title,
  subtitle,
  icon,
  action,
  onBack,
  showBack = false,
  className,
  masteryPercent,
  totalConcepts,
  masteredCount,
}: StudyHeaderProps) {
  return (
    <header className={cn("mb-6 flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3 flex-1">
        {showBack && onBack && (
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:border-border hover:text-foreground transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <h1 className="font-display text-2xl font-bold tracking-wide text-foreground sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="text-sm text-muted-foreground/70">{subtitle}</p>}
          {/* Display progress stats if provided */}
          {masteryPercent !== undefined &&
            totalConcepts !== undefined &&
            masteredCount !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                Mastery: {masteryPercent}% ({masteredCount} of {totalConcepts} concepts)
              </p>
            )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
