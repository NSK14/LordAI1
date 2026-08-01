import React from "react";
import { motion } from "framer-motion";
import { FlashcardDeckView } from "@/components/study/FlashcardDeck";

type Props = {
  onGenerate: () => void;
  onImport: () => void;
  streak?: number;
};

export function FlashcardWorkspace({ onGenerate, onImport, streak = 0 }: Props) {
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
          <div className="text-sm font-mono text-primary">Streak {streak}</div>
        </div>

        <div className="mt-4">
          <FlashcardDeckView onGenerate={onGenerate} onImport={onImport} streak={streak} />
        </div>
      </div>
    </motion.div>
  );
}

export default FlashcardWorkspace;
