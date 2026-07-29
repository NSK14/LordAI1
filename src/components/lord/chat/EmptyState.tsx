import { motion } from "framer-motion";
import { Plus } from "lucide-react";

interface EmptyStateProps {
  onPick: (s: string) => void;
  userName?: string | null;
}

export function EmptyState({ onPick, userName }: EmptyStateProps) {
  const displayName = userName || "there";
  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="font-sans text-5xl font-semibold tracking-tight text-white sm:text-6xl"
        >
          Hi {displayName},
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
          className="mt-3 text-2xl text-muted-foreground"
        >
          What can I help with today?
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="w-full max-w-3xl cursor-pointer"
        onClick={() => onPick("")}
      >
        <div className="relative rounded-full border border-border/40 bg-[rgba(35,35,35,0.95)] shadow-xl backdrop-blur-xl transition-all duration-200 hover:border-border/60">
          <input
            type="text"
            placeholder="Ask LORD anything..."
            className="w-full rounded-full bg-transparent px-14 py-5 text-base text-white outline-none placeholder:text-muted-foreground"
            readOnly
          />
          <button
            aria-label="Open tools menu"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/40 bg-background/50 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
