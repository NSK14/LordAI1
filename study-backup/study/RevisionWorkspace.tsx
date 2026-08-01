import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, CalendarDays, Sparkles } from "lucide-react";
import { StudyWorkspaceShell } from "@/components/study/StudyWorkspaceShell";
import { streamChat } from "@/lib/study-chat";

export function RevisionWorkspace() {
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  const generatePlan = useCallback(async () => {
    const subject = topic.trim();
    if (!subject || busy) return;
    setBusy(true);
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
                  text: `Build a 14-day revision timeline for "${subject}" with priority nodes, memory decay insights, and exam-ready checkpoints. Include a focus session plan for today, tomorrow, and the next week.`,
                },
              ],
            },
          ],
        },
        setOutput,
      );
    } catch {
      setOutput("Connection error. Please retry.");
    } finally {
      setBusy(false);
    }
  }, [topic, busy]);

  return (
    <StudyWorkspaceShell
      mode="plan"
      title="Revision Planner"
      subtitle="Mission Timeline for your next study cycle"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28 }}
          className="space-y-4"
        >
          <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="flex items-center gap-3 text-sm font-semibold text-white">
              <CalendarDays className="h-5 w-5 text-sky-300" />
              Create your mission timeline
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generatePlan()}
              placeholder="Enter course, exam, or topic"
              className="mt-4 w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-sky-300"
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={generatePlan}
                disabled={busy || !topic.trim()}
                className="rounded-3xl bg-sky-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(56,189,248,0.3)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Planning
                  </span>
                ) : (
                  "Generate Plan"
                )}
              </button>
              <button
                onClick={() => setOutput("")}
                className="rounded-3xl border border-white/10 px-5 py-3 text-sm text-white hover:border-sky-300"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-background/70 p-5 min-h-[340px] shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            {output ? (
              <div className="prose prose-invert max-w-none text-sm leading-7 whitespace-pre-wrap">
                {output}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-muted-foreground">
                <Sparkles className="mb-3 h-8 w-8 text-sky-300" />
                Create an AI-powered revision timeline that fits your mission goals.
              </div>
            )}
          </div>
        </motion.div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Timeline nodes
            </div>
            <div className="mt-3 space-y-3 text-sm text-white/80">
              <div className="rounded-2xl bg-white/5 p-3">
                Today: High-priority review + quick recall checks.
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                3 days: Reinforce weak topics and test accuracy.
              </div>
              <div className="rounded-2xl bg-white/5 p-3">
                7 days: Deep review with active recall exercises.
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              AI recommendations
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>• Focus on chapters with the lowest mastery</li>
              <li>• Schedule spaced repetition for 14 days</li>
              <li>• Track your memory decay and revisit critical topics</li>
            </ul>
          </div>
        </aside>
      </div>
    </StudyWorkspaceShell>
  );
}

export default RevisionWorkspace;
