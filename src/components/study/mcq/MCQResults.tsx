/**
 * MCQResults — final score display with per-question summary and
 * confidence calibration insights.
 */

import { motion } from "framer-motion";
import { Check, X, Trophy, Target, Brain, Gauge } from "lucide-react";
import type { MCQQuestion, MCQAnswerMap, ConfidenceMap } from "./mcq-types";

interface MCQResultsProps {
  questions: MCQQuestion[];
  answers: MCQAnswerMap;
  confidence: ConfidenceMap;
  score: number;
  totalQuestions: number;
  onRestart: () => void;
}

export function MCQResults({
  questions,
  answers,
  confidence,
  score,
  totalQuestions,
  onRestart,
}: MCQResultsProps) {
  const percentage = Math.round((score / totalQuestions) * 100);

  let grade: { label: string; color: string; icon: React.ReactNode } = {
    label: "Keep practicing",
    color: "text-rose-300",
    icon: <Brain className="h-6 w-6" />,
  };

  if (percentage === 100) {
    grade = {
      label: "Perfect Score!",
      color: "text-emerald-300",
      icon: <Trophy className="h-6 w-6" />,
    };
  } else if (percentage >= 70) {
    grade = {
      label: "Well done!",
      color: "text-cyan-300",
      icon: <Target className="h-6 w-6" />,
    };
  } else if (percentage >= 40) {
    grade = {
      label: "Good effort",
      color: "text-amber-300",
      icon: <Brain className="h-6 w-6" />,
    };
  }

  const answeredCount = Object.keys(answers).length;

  type CalibrationLabel = "Overconfident" | "Underconfident" | "Well-calibrated" | "No data";
  const calibrationSummary = (): { label: CalibrationLabel; score: number; color: string } => {
    const reviewed = questions.filter((q) => confidence[q.id] !== undefined);
    if (reviewed.length === 0) {
      return { label: "No data", score: 0, color: "text-cyan-300/40" };
    }
    const correctHigh = reviewed.filter(
      (q) => answers[q.id] === q.answer && (confidence[q.id] ?? 0) >= 4,
    ).length;
    const wrongHigh = reviewed.filter(
      (q) => answers[q.id] !== q.answer && (confidence[q.id] ?? 0) >= 4,
    ).length;
    const correctLow = reviewed.filter(
      (q) => answers[q.id] === q.answer && (confidence[q.id] ?? 0) <= 2,
    ).length;

    if (wrongHigh > correctHigh) {
      return {
        label: "Overconfident",
        score: Math.round((correctHigh / reviewed.length) * 100),
        color: "text-rose-300",
      };
    }
    if (correctLow > 0) {
      return {
        label: "Underconfident",
        score: Math.round((correctLow / reviewed.length) * 100),
        color: "text-amber-300",
      };
    }
    return {
      label: "Well-calibrated",
      score: Math.round((answeredCount / totalQuestions) * 100),
      color: "text-emerald-300",
    };
  };

  const cal = calibrationSummary();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Score hero */}
      <div className="rounded-3xl border border-[rgba(0,255,255,0.12)] bg-[rgba(6,12,24,0.72)] backdrop-blur-xl p-8 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[rgba(0,255,255,0.1)]"
        >
          {grade.icon}
        </motion.div>

        <div className={`font-display text-5xl font-bold ${grade.color}`}>
          {score} / {totalQuestions}
        </div>
        <div
          className={`mt-1 font-display text-sm uppercase tracking-wider ${grade.color} opacity-80`}
        >
          {grade.label}
        </div>

        {/* Mini progress ring */}
        <div className="mx-auto mt-6 h-2 w-48 overflow-hidden rounded-full bg-[rgba(0,255,255,0.08)]">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300"
            style={{ boxShadow: "0 0 12px rgba(0,255,255,0.4)" }}
          />
        </div>
        <div className="mt-2 font-mono text-xs text-cyan-300/50">{percentage}% Correct</div>
      </div>

      {/* Calibration Insights */}
      <div className="rounded-3xl border border-[rgba(255,200,0,0.12)] bg-[rgba(255,200,0,0.03)] p-6">
        <div className="mb-4 flex items-center gap-3">
          <Gauge className="h-5 w-5 text-amber-300" />
          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-300/80">
            Calibration Insights
          </h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-cyan-200/70">Your confidence pattern:</span>
            <span className={`font-bold ${cal.color}`}>{cal.label}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-cyan-200/70">Questions with confidence recorded:</span>
            <span className="text-white">
              {questions.filter((q) => confidence[q.id] !== undefined).length} / {totalQuestions}
            </span>
          </div>
          <p className="text-xs text-cyan-200/50">
            Confidence helps calibrate your self-assessment. Aim to rate high when you truly know
            the answer, and low when you're guessing.
          </p>
        </div>
      </div>

      {/* Per-question summary */}
      <div className="space-y-2">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white/70">
          Question Breakdown
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {questions.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = userAnswer === q.answer;
            const isAnswered = userAnswer !== undefined;
            const conf = confidence[q.id];

            return (
              <div
                key={q.id}
                className="rounded-xl border border-[rgba(0,255,255,0.08)] bg-[rgba(0,255,255,0.04)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-cyan-300/50">
                    Q{i + 1}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {conf !== undefined && (
                      <span className="font-mono text-[10px] text-amber-300/60">
                        Conf: {conf}/5
                      </span>
                    )}
                    {isAnswered ? (
                      isCorrect ? (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-emerald-400">
                          <Check className="h-3 w-3" />
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-rose-400">
                          <X className="h-3 w-3" />
                          Incorrect
                        </span>
                      )
                    ) : (
                      <span className="font-mono text-[10px] text-cyan-300/30">Unanswered</span>
                    )}
                  </div>
                </div>
                <p className="mt-1 truncate text-xs text-white/70">{q.question}</p>
                {isAnswered && !isCorrect && (
                  <p className="mt-1 font-mono text-[10px] text-cyan-300/60">Correct: {q.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Restart button */}
      <div className="flex justify-center">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={onRestart}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-cyan-300 shadow-[0_0_20px_rgba(0,255,255,0.12)] transition hover:bg-cyan-500/20"
        >
          <Target className="h-4 w-4" />
          Restart Quiz
        </motion.button>
      </div>
    </motion.div>
  );
}
