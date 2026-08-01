/**
 * MCQProgress — progress bar showing current question, total, and completion percentage.
 */

import type { MCQAnswerMap } from "./mcq-types";

interface MCQProgressProps {
  currentIndex: number;
  totalQuestions: number;
  answers: MCQAnswerMap;
  submitted: boolean;
}

export function MCQProgress({
  currentIndex,
  totalQuestions,
  answers,
  submitted,
}: MCQProgressProps) {
  if (totalQuestions === 0) return null;

  const answeredCount = Object.keys(answers).length;
  const percentage = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  const answeredPercentage = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="mb-6 space-y-2">
      {/* Question counter */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-widest text-cyan-300/70">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
        <span className="font-mono text-xs text-cyan-300/50">{answeredPercentage}% Complete</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 overflow-hidden rounded-full bg-[rgba(0,255,255,0.08)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300 transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            boxShadow: "0 0 12px rgba(0,255,255,0.4)",
          }}
        />
      </div>

      {/* Mini dots for each question */}
      {!submitted && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from({ length: Math.min(totalQuestions, 30) }).map((_, i) => {
            const qId = `q-${i}`;
            const answered = answers[qId] !== undefined;
            const isCurrent = i === currentIndex;
            return (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  isCurrent
                    ? "w-5 bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.6)]"
                    : answered
                      ? "w-1.5 bg-cyan-400/50"
                      : "w-1.5 bg-white/10"
                }`}
              />
            );
          })}
        </div>
      )}

      {submitted && (
        <div className="flex items-center gap-2 pt-1 text-xs text-cyan-300/60">
          <span className="font-mono">Quiz Complete</span>
          <span className="text-cyan-300/30">·</span>
          <span className="font-mono">
            {answeredCount} of {totalQuestions} answered
          </span>
        </div>
      )}
    </div>
  );
}
