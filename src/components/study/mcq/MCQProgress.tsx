/**
 * MCQProgress — progress bar showing current question, total, answered count,
 * and confidence tracking dots.
 */

import type { MCQAnswerMap, ConfidenceMap } from "./mcq-types";

interface MCQProgressProps {
  currentIndex: number;
  totalQuestions: number;
  answers: MCQAnswerMap;
  confidence: ConfidenceMap;
  submitted: boolean;
}

export function MCQProgress({
  currentIndex,
  totalQuestions,
  answers,
  confidence,
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

      {/* Mini dots for each question — color by confidence if answered */}
      {!submitted && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Array.from({ length: Math.min(totalQuestions, 30) }).map((_, i) => {
            const qId = `q-${i}`;
            const answered = answers[qId] !== undefined;
            const conf = confidence[qId] ?? 0;
            const isCurrent = i === currentIndex;

            let dotClass = "w-1.5 bg-white/10";
            if (answered) {
              if (conf >= 4) {
                dotClass = "w-2.5 bg-emerald-400/60 shadow-[0_0_6px_rgba(0,255,200,0.6)]";
              } else if (conf >= 2) {
                dotClass = "w-2 bg-cyan-400/50 shadow-[0_0_6px_rgba(0,255,255,0.4)]";
              } else {
                dotClass = "w-2 bg-amber-400/40 shadow-[0_0_6px_rgba(255,200,0,0.4)]";
              }
            }
            if (isCurrent) {
              dotClass = "w-5 bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.6)]";
            }

            return (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${dotClass}`}
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
