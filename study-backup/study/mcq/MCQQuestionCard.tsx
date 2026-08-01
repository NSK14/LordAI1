/**
 * MCQQuestionCard — a single question card with its own radio group.
 * Each card owns its state independently – never shares state across questions.
 */

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import type { MCQQuestion, MCQAnswerMap } from "./mcq-types";

interface MCQQuestionCardProps {
  question: MCQQuestion;
  selectedAnswer?: string;
  correctAnswer: string;
  showResult: boolean;
  onSelect: (questionId: string, optionId: string) => void;
  questionIndex: number;
  totalQuestions: number;
}

export function MCQQuestionCard({
  question,
  selectedAnswer,
  correctAnswer,
  showResult,
  onSelect,
  questionIndex,
  totalQuestions,
}: MCQQuestionCardProps) {
  const handleSelect = useCallback(
    (optionId: string) => {
      if (showResult) return;
      onSelect(question.id, optionId);
    },
    [question.id, showResult, onSelect],
  );

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-3xl border border-[rgba(0,255,255,0.12)] bg-[rgba(6,12,24,0.72)] backdrop-blur-xl p-6 sm:p-8"
    >
      {/* Question header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[rgba(0,255,255,0.1)] font-display text-sm font-bold text-cyan-300">
            {questionIndex + 1}
          </span>
          <div>
            <span className="font-display text-sm font-bold uppercase tracking-wider text-white/90">
              Question {questionIndex + 1}
            </span>
            <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-cyan-300/50">
              / {totalQuestions}
            </span>
          </div>
        </div>

        {/* Status badge */}
        {showResult && selectedAnswer && (
          <div className="flex items-center gap-1.5">
            {selectedAnswer === correctAnswer ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                <Check className="h-3 w-3" /> Correct
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-rose-300">
                <X className="h-3 w-3" /> Incorrect
              </span>
            )}
          </div>
        )}
      </div>

      {/* Question text — no raw markdown ever */}
      <p className="mb-6 text-base leading-relaxed text-white/90 sm:text-lg">{question.question}</p>

      {/* Options — each question has its own radio group via onSelect scoped to question.id */}
      <div
        className="space-y-3"
        role="radiogroup"
        aria-label={`Question ${questionIndex + 1} options`}
      >
        {question.options.map((option) => {
          const isSelected = selectedAnswer === option.id;
          const isCorrectAnswer = showResult && correctAnswer === option.id;
          const isWrongSelection = showResult && isSelected && option.id !== correctAnswer;

          let stateClass = "border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.04)]";

          if (isWrongSelection) {
            stateClass =
              "border-rose-400/70 bg-[rgba(255,80,80,0.12)] shadow-[0_0_20px_rgba(255,80,80,0.2)]";
          } else if (isCorrectAnswer) {
            stateClass =
              "border-emerald-400/70 bg-[rgba(0,255,200,0.12)] shadow-[0_0_20px_rgba(0,255,200,0.2)]";
          } else if (isSelected && !showResult) {
            stateClass =
              "border-cyan-400/70 bg-[rgba(0,255,255,0.12)] shadow-[0_0_20px_rgba(0,255,255,0.2)]";
          }

          const showCorrectIndicator = showResult && correctAnswer === option.id;

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.id)}
              disabled={showResult}
              className={`group relative flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all duration-200 ${
                showResult
                  ? "cursor-default"
                  : "cursor-pointer hover:shadow-[0_0_25px_rgba(0,255,255,0.2)] hover:border-cyan-400/40"
              } ${stateClass}`}
              role="radio"
              aria-checked={isSelected}
              tabIndex={showResult ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(option.id);
                }
              }}
            >
              {/* Radio indicator */}
              <div className="relative grid h-7 w-7 shrink-0 place-items-center">
                <div
                  className={`absolute inset-0 rounded-full border-2 transition-all duration-200 ${
                    isWrongSelection
                      ? "border-rose-400 bg-[rgba(255,80,80,0.15)]"
                      : showCorrectIndicator
                        ? "border-emerald-400 bg-[rgba(0,255,200,0.15)]"
                        : isSelected
                          ? "border-cyan-400 bg-[rgba(0,255,255,0.15)]"
                          : "border-[rgba(0,255,255,0.3)] group-hover:border-cyan-400/60"
                  }`}
                />
                <AnimatePresence>
                  {(isSelected || showCorrectIndicator || isWrongSelection) && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className={`h-3 w-3 rounded-full ${
                        isWrongSelection
                          ? "bg-rose-400 shadow-[0_0_10px_rgba(255,80,80,0.8)]"
                          : showCorrectIndicator
                            ? "bg-emerald-400 shadow-[0_0_10px_rgba(0,255,200,0.8)]"
                            : "bg-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.8)]"
                      }`}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Option text */}
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300/70">
                  {option.id})
                </span>
                <span className="ml-2 text-sm text-white/80">{option.text}</span>
              </div>

              {/* Status icon */}
              {showCorrectIndicator && <Check className="h-5 w-5 shrink-0 text-emerald-400" />}
              {isWrongSelection && <X className="h-5 w-5 shrink-0 text-rose-400" />}
            </button>
          );
        })}
      </div>

      {/* Explanation (revealed after submit) */}
      <AnimatePresence>
        {showResult && question.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 overflow-hidden"
          >
            <div className="rounded-xl border border-[rgba(0,255,255,0.08)] bg-[rgba(0,255,255,0.04)] p-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300/60">
                  Explanation
                </span>
              </div>
              <p className="text-sm leading-relaxed text-cyan-200/70">{question.explanation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
