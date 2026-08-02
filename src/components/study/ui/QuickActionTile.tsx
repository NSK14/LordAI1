import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface QuickActionTileProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export function QuickActionTile({
  icon,
  title,
  subtitle,
  onClick,
  delay = 0,
  className,
  disabled = false,
}: QuickActionTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delay * 0.07, ease: "easeOut" }}
    >
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "group relative block w-full text-left transition-all duration-200",
          "hover:translate-y-[-2px] hover:shadow-[0_0_20px_rgba(66,133,244,0.15)]",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        <div className="hud-panel p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {title}
              </h4>
              {subtitle && <p className="mt-0.5 text-xs text-muted-foreground/70">{subtitle}</p>}
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
}
