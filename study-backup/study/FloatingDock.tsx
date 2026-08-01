import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Settings, Play } from "lucide-react";

type Props = {
  mode: string;
};

export function FloatingDock({ mode }: Props) {
  const mainLabel = mode === "flashcards" ? "Study" : mode === "tutor" ? "Guide" : "Main";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.28 }}
      className="fixed left-0 right-0 bottom-6 flex justify-center pointer-events-none"
      aria-hidden
    >
      <div className="pointer-events-auto rounded-3xl bg-background/40 backdrop-blur-xl px-4 py-2 shadow-lg">
        <div className="flex items-center gap-3">
          <button className="rounded-full p-2 bg-card/40 hover:scale-105" aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="rounded-full p-3 bg-primary text-primary-foreground shadow-[0_0_18px_var(--hud)] flex items-center gap-2">
            <Play className="h-4 w-4" />
            <span className="hidden sm:inline-block font-semibold">{mainLabel}</span>
          </button>
          <button className="rounded-full p-2 bg-card/40 hover:scale-105" aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="ml-2 flex items-center gap-2">
            <div className="rounded-full p-2 bg-card/10 text-muted-foreground text-xs flex items-center justify-center px-3 py-2">
              Listening
            </div>
            <button className="rounded-full p-2 bg-card/20" title="Settings">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default FloatingDock;
