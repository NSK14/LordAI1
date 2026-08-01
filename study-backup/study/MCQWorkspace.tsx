import React from "react";
import { motion } from "framer-motion";
import { MCQQuiz } from "@/components/study/mcq/MCQQuiz";

type Props = {
  rawText?: string;
};

export function MCQWorkspace({ rawText }: Props) {
  return (
    <motion.div
      key="mcq-workspace"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.28 }}
      className="hud-panel p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">MCQ Mission</h3>
          <div className="text-xs text-muted-foreground">
            Answer carefully — your progress will be tracked
          </div>
        </div>
      </div>

      <div className="min-h-[420px]">
        <MCQQuiz rawText={rawText ?? ""} />
      </div>
    </motion.div>
  );
}

export default MCQWorkspace;
