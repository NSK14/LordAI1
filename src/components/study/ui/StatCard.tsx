import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail?: string;
  accent?: "cyan" | "emerald" | "amber" | "violet" | "blue";
  delay?: number;
  className?: string;
}

const ACCENT_COLORS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  cyan: "text-cyan-400",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  violet: "text-violet-400",
  blue: "text-blue-400",
};

export function StatCard({
  icon,
  label,
  value,
  detail,
  accent = "cyan",
  delay = 0,
  className,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1, ease: "easeOut" }}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/40 bg-card/60 p-4 backdrop-blur-sm",
        "transition-all duration-200 hover:border-primary/30 hover:bg-card/80",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background/40",
            ACCENT_COLORS[accent],
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("font-display text-2xl font-bold", ACCENT_COLORS[accent])}>{value}</p>
          {detail && <p className="mt-0.5 text-xs text-muted-foreground/70">{detail}</p>}
        </div>
      </div>
    </motion.div>
  );
}
