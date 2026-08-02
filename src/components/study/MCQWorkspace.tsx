import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, FileQuestion, Home, Send } from "lucide-react";
import { MCQQuiz, type QuizCompleteResult } from "@/components/study/mcq/MCQQuiz";
import { streamChat } from "@/lib/study-chat";
import type { StudyActivityInput } from "@/hooks/study/study-activity-types";

type Props = {
  recordActivity?: (activity: StudyActivityInput) => string;
  onReturnHome?: () => void;
};

export function MCQWorkspace({ recordActivity, onReturnHome }: Props) {
  const [topic, setTopic] = useState("");
  const [rawText, setRawText] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"input" | "generating" | "quiz">("input");

  const generateMCQ = useCallback(async () => {
    const subject = topic.trim();
    if (!subject || busy) return;
    setBusy(true);
    setMode("generating");
    setOutput("");
    try {
      await streamChat(
        {
          mode: "reasoning",
          messages: [
            {
              id: "u",
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Generate 5 multiple-choice questions about "${subject}". For each question, provide 4 options (A, B, C, D), mark the correct answer, and include a brief explanation. Format as:\n\n1. Question text\nA) Option 1\nB) Option 2\nC) Option 3\nD) Option 4\nAnswer: B\nExplanation: ...\n\nGenerate now.`,
                },
              ],
            },
          ],
        },
        setOutput,
      );
      setRawText(output.trim());
      if (output.trim()) {
        setMode("quiz");
      }
    } catch {
      setOutput("Connection error. Please retry.");
    } finally {
      setBusy(false);
    }
  }, [topic, busy, output]);

  const handleQuizComplete = useCallback(
    (result: QuizCompleteResult) => {
      recordActivity?.({
        type: "completed_quiz",
        subject: topic.trim(),
        title: `MCQ: ${topic.trim()}`,
        score: Math.round((result.score / result.totalQuestions) * 100),
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        metadata: { confidence: result.confidence, calibrationScore: result.calibrationScore },
      });
    },
    [recordActivity, topic],
  );

  const handleBack = () => {
    setMode("input");
    setRawText("");
    setOutput("");
    setTopic("");
  };

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
            {mode === "quiz"
              ? "Answer carefully — your confidence and progress will be tracked"
              : "Generate custom multiple-choice questions on any topic"}
          </div>
        </div>
        {onReturnHome && mode === "input" && (
          <button
            onClick={onReturnHome}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-background/50 px-3 py-1.5 text-xs text-cyan-200/70 hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <Home className="h-3 w-3" />
            Back to Dashboard
          </button>
        )}
        {mode === "quiz" && (
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-background/50 px-3 py-1.5 text-xs text-cyan-200/70 hover:border-cyan-300/40 hover:text-cyan-300"
          >
            <FileQuestion className="h-3 w-3" />
            New Quiz
          </button>
        )}
      </div>

      {mode === "input" && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.4)]"
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generateMCQ()}
            placeholder="Enter a topic, e.g. Newton's laws of motion"
            className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
          />
          <div className="mt-4 flex gap-3">
            <button
              onClick={generateMCQ}
              disabled={busy || !topic.trim()}
              className="rounded-3xl bg-rose-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(255,80,80,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating
                </span>
              ) : (
                "Generate Quiz"
              )}
            </button>
          </div>
        </motion.div>
      )}

      {mode === "generating" && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28 }}
          className="rounded-3xl border border-white/10 bg-background/70 p-5 min-h-[340px] shadow-[0_0_40px_rgba(0,0,0,0.35)]"
        >
          <div className="prose prose-invert max-w-none text-sm leading-7 whitespace-pre-wrap">
            {output || (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating your quiz…
              </span>
            )}
          </div>
        </motion.div>
      )}

      {mode === "quiz" && (
        <div className="min-h-[420px]">
          <MCQQuiz rawText={rawText} onQuizComplete={handleQuizComplete} />
        </div>
      )}
    </motion.div>
  );
}

export default MCQWorkspace;
