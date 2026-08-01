/**
 * MCQQuiz — main quiz orchestrator.
 * Manages state: current index, answers, submission status.
 * Renders progress, question card, and navigation.
 * NEVER renders raw markdown — only parsed JSON.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import type { MCQQuestion, MCQAnswerMap } from "./mcq-types";
import { parseMCQResponse } from "./mcq-parser";
import { MCQProgress } from "./MCQProgress";
import { MCQQuestionCard } from "./MCQQuestionCard";
import { MCQResults } from "./MCQResults";

interface MCQQuizProps {
  /** Raw AI markdown to parse and render */
  rawText: string;
  /** Called when answers change (for external tracking) */
  onAnswersChange?: (answers: MCQAnswerMap) => void;
  /** Optional key to force re-mount (e.g. when new quiz generated) */
  key?: string;
}

export function MCQQuiz({ rawText, onAnswersChange }: MCQQuizProps) {
  const parsed = useMemo(() => parseMCQResponse(rawText), [rawText]);
  const { questions } = parsed;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<MCQAnswerMap>({});
  const [submitted, setSubmitted] = useState(false);

  // Reset state when questions change
  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(false);
  }, [rawText]);

  const currentQ = questions[currentIndex] ?? null;
  const totalQ = questions.length;

  const handleSelect = useCallback(
    (questionId: string, optionId: string) => {
      if (submitted) return;
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: optionId };
        onAnswersChange?.(next);
        return next;
      });
    },
    [submitted, onAnswersChange],
  );

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
  }, []);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalQ - 1, i + 1));
  }, [totalQ]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    setSubmitted(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !submitted) {
        handlePrevious();
      } else if (e.key === "ArrowRight" && !submitted) {
        handleNext();
      } else if (e.key === "Enter" && !submitted) {
        if (currentIndex === totalQ - 1) {
          handleSubmit();
        } else {
          handleNext();
        }
      } else if (e.key === " " && !submitted) {
        // Space skips to next — common pattern
        if (currentIndex < totalQ - 1) {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePrevious, handleNext, handleSubmit, currentIndex, totalQ, submitted]);

  // Compute score
  const score = useMemo(() => {
    if (!submitted) return 0;
    return questions.reduce((acc, q) => {
      return acc + (answers[q.id] === q.answer ? 1 : 0);
    }, 0);
  }, [submitted, questions, answers]);

  // Empty / no-questions state
  if (totalQ === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[rgba(0,255,255,0.08)] text-cyan-300">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <p className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
          No questions could be parsed
        </p>
        <p className="mt-1 text-xs text-cyan-200/40">
          The AI response format may not match the expected pattern. Try asking again with a clearer
          prompt.
        </p>
      </div>
    );
  }

  // Results view
  if (submitted) {
    return (
      <MCQResults
        questions={questions}
        answers={answers}
        score={score}
        totalQuestions={totalQ}
        onRestart={handleRestart}
      />
    );
  }

  // Active quiz
  return (
    <div className="space-y-6">
      <MCQProgress
        currentIndex={currentIndex}
        totalQuestions={totalQ}
        answers={answers}
        submitted={false}
      />

      <AnimatePresence mode="wait">
        {currentQ && (
          <MCQQuestionCard
            key={currentQ.id}
            question={currentQ}
            selectedAnswer={answers[currentQ.id]}
            correctAnswer={currentQ.answer}
            showResult={false}
            onSelect={handleSelect}
            questionIndex={currentIndex}
            totalQuestions={totalQ}
          />
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.06)] px-4 py-2.5 text-sm font-medium text-cyan-200/70 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        <span className="font-mono text-xs text-cyan-300/50">
          <span className="hidden sm:inline">Question </span>
          {currentIndex + 1} / {totalQ}
        </span>

        {currentIndex === totalQ - 1 ? (
          <motion.button
            onClick={handleSubmit}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/20 px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_20px_rgba(0,255,255,0.15)] transition hover:bg-cyan-400/30 hover:shadow-[0_0_30px_rgba(0,255,255,0.3)]"
          >
            Finish Quiz
          </motion.button>
        ) : (
          <button
            onClick={handleNext}
            disabled={currentIndex === totalQ - 1}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.06)] px-4 py-2.5 text-sm font-medium text-cyan-200/70 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="flex justify-center gap-4 font-mono text-[9px] uppercase tracking-wider text-cyan-300/20">
        <span>&larr; &rarr; Navigate</span>
        <span>Enter · Next/Submit</span>
        <span>Space · Skip</span>
      </div>
    </div>
  );
}
