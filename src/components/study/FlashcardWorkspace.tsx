import React from "react";
import { motion } from "framer-motion";
import { Home, Sparkles } from "lucide-react";
import { FlashcardDeckView } from "@/components/study/FlashcardDeck";
import type { StudyActivityInput } from "@/hooks/study/study-activity-types";

type Props = {
  onGenerate: () => void;
  onImport: () => void;
  streak?: number;
  recordActivity?: (activity: StudyActivityInput) => string;
  focus?: "mnemonics";
  onReturnHome?: () => void;
};

export function FlashcardWorkspace({
  onGenerate,
  onImport,
  streak = 0,
  recordActivity,
  focus,
  onReturnHome,
}: Props) {
  return (
    <motion.div
      key="flashcard-workspace"
      initial={{ opacity: 0, scale: 0.995 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.995 }}
      transition={{ duration: 0.32 }}
      className="flex flex-col gap-4"
    >
      <div className="hud-panel p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Flashcard Mission</h3>
            <div className="text-xs text-muted-foreground">Tap a deck to zoom into Study Mode</div>
          </div>
          <div className="flex items-center gap-3">
            {focus === "mnemonics" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                <Sparkles className="h-3 w-3" /> Mnemonic focus
              </span>
            )}
            <span className="text-sm font-mono text-primary">Streak {streak}</span>
          </div>
        </div>

        {onReturnHome && (
          <button
            onClick={onReturnHome}
            className="mb-3 inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-background/50 px-3 py-1.5 text-xs text-cyan-200/70 hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <Home className="h-3 w-3" />
            Back to Dashboard
          </button>
        )}

        <div className="mt-4">
          <FlashcardDeckView
            onGenerate={onGenerate}
            onImport={onImport}
            streak={streak}
            recordActivity={recordActivity}
            focusMnemonics={focus === "mnemonics"}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default FlashcardWorkspace;
