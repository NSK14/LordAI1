/**
 * MCQQuiz — main quiz orchestrator.
 * Manages state: current index, answers, confidence ratings, submission status.
 * Renders progress, question card, and navigation.
 * NEVER renders raw markdown — only parsed JSON.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import type { MCQQuestion, MCQAnswerMap, ConfidenceMap } from "./mcq-types";
import { parseMCQResponse } from "./mcq-parser";
import { MCQProgress } from "./MCQProgress";
import { MCQQuestionCard } from "./MCQQuestionCard";
import { MCQResults } from "./MCQResults";

export interface QuizCompleteResult {
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  confidence: ConfidenceMap;
  calibrationScore: number;
  calibrationDetails: CalibrationDetail[];
}

export interface CalibrationDetail {
  questionId: string;
  confidence: number;
  correct: boolean;
  expected: "overconfident" | "underconfident" | "well-calibrated";
}

interface MCQQuizProps {
  /** Raw AI markdown to parse and render */
  rawText: string;
  /** Called when answers change (for external tracking) */
  onAnswersChange?: (answers: MCQAnswerMap) => void;
  /** Called when the quiz is submitted */
  onQuizComplete?: (result: QuizCompleteResult) => void;
  /** Optional key to force re-mount (e.g. when new quiz generated) */
  key?: string;
}

export function MCQQuiz({ rawText, onAnswersChange, onQuizComplete }: MCQQuizProps) {
  const parsed = useMemo(() => parseMCQResponse(rawText), [rawText]);
  const { questions } = parsed;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<MCQAnswerMap>({});
  const [confidence, setConfidence] = useState<ConfidenceMap>({});
  const [submitted, setSubmitted] = useState(false);

  // Reset state when questions change
  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setConfidence({});
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

  const handleConfidence = useCallback(
    (questionId: string, level: number) => {
      if (submitted) return;
      setConfidence((prev) => ({ ...prev, [questionId]: level }));
    },
    [submitted],
  );

  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    const finalScore = questions.reduce((acc, q) => {
      return acc + (answers[q.id] === q.answer ? 1 : 0);
    }, 0);

    const details: CalibrationDetail[] = questions.map((q) => {
      const conf = confidence[q.id] ?? 0;
      const correct = answers[q.id] === q.answer;
      let expected: CalibrationDetail["expected"];
      if (correct && conf >= 4) expected = "well-calibrated";
      else if (correct && conf <= 2) expected = "underconfident";
      else if (!correct && conf >= 4) expected = "overconfident";
      else if (!correct && conf <= 2) expected = "well-calibrated";
      else expected = "well-calibrated";
      return { questionId: q.id, confidence: conf, correct, expected };
    });

    const overconfident = details.filter((d) => d.expected === "overconfident").length;
    const calibrationScore = Math.max(
      0,
      100 -
        Math.round(
          (details
            .filter((d) => d.confidence > 0)
            .reduce((sum, d) => {
              const diff = d.correct ? 5 - d.confidence : d.confidence - 1;
              return sum + Math.abs(diff);
            }, 0) /
            Math.max(1, details.filter((d) => d.confidence > 0).length)) *
            20,
        ),
    );

    onQuizComplete?.({
      score: finalScore,
      totalQuestions: totalQ,
      correctAnswers: finalScore,
      confidence,
      calibrationScore,
      calibrationDetails: details,
    });
  }, [questions, answers, confidence, onQuizComplete, totalQ]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalQ - 1, i + 1));
  }, [totalQ]);

  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setAnswers({});
    setConfidence({});
    setSubmitted(false);
  }, []);

  const currentSelected = currentQ ? answers[currentQ.id] : undefined;
  const currentConfidence = currentQ ? confidence[currentQ.id] : undefined;
  const canNavigateNext =
    !submitted && currentSelected !== undefined && currentConfidence !== undefined;
  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => answers[q.id] !== undefined && confidence[q.id] !== undefined);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && !submitted && canNavigateNext) {
        handlePrevious();
      } else if (e.key === "ArrowRight" && !submitted && canNavigateNext) {
        handleNext();
      } else if (e.key === "Enter" && !submitted && allAnswered) {
        if (currentIndex === totalQ - 1) {
          handleSubmit();
        } else {
          handleNext();
        }
      } else if (e.key === " " && !submitted && canNavigateNext) {
        // Space skips to next — common pattern
        if (currentIndex < totalQ - 1) {
          e.preventDefault();
          handleNext();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    canNavigateNext,
    allAnswered,
    handlePrevious,
    handleNext,
    handleSubmit,
    currentIndex,
    totalQ,
    submitted,
  ]);

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
        confidence={confidence}
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
        confidence={confidence}
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
            onConfidenceSelect={handleConfidence}
            selectedConfidence={currentConfidence}
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
            whileHover={{ scale: allAnswered ? 1.03 : 1 }}
            whileTap={{ scale: allAnswered ? 0.98 : 1 }}
            disabled={!allAnswered}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400/20 px-6 py-2.5 font-display text-sm font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_20px_rgba(0,255,255,0.15)] transition hover:bg-cyan-400/30 hover:shadow-[0_0_30px_rgba(0,255,255,0.3)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Finish Quiz
          </motion.button>
        ) : (
          <button
            onClick={handleNext}
            disabled={!canNavigateNext}
            className="inline-flex items-center gap-2 rounded-xl border border-[rgba(0,255,255,0.15)] bg-[rgba(0,255,255,0.06)] px-4 py-2.5 text-sm font-medium text-cyan-200/70 transition hover:border-cyan-400/40 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Confidence guidance */}
      {!currentConfidence && currentSelected && (
        <p className="text-center text-[10px] text-amber-300/60">
          Set your confidence level before moving on
        </p>
      )}

      {/* Keyboard hints */}
      <div className="flex justify-center gap-4 font-mono text-[9px] uppercase tracking-wider text-cyan-300/20">
        <span>&larr; &rarr; Navigate</span>
        <span>Enter · Next/Submit</span>
        <span>Space · Skip</span>
        <span className="hidden sm:inline">1-5 · Confidence</span>
      </div>
    </div>
  );
}
