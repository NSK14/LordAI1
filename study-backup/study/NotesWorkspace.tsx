import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Loader2, BookOpen, Sparkles } from "lucide-react";
import { StudyWorkspaceShell } from "@/components/study/StudyWorkspaceShell";
import { streamChat } from "@/lib/study-chat";

export function NotesWorkspace() {
  const [topic, setTopic] = useState("");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);

  const generateNotes = useCallback(async () => {
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
                  text: `Generate structured study notes for "${subject}" with headings, bullets, formulas, and a concise summary. Include related concepts and a quick quiz prompt.`,
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
      mode="notes"
      title="Knowledge Workspace"
      subtitle="Your AI-powered note composer"
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.28 }}
        >
          <div className="grid gap-3 rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-3 text-sm font-semibold text-white">
              <BookOpen className="h-5 w-5 text-emerald-300" />
              AI Document Editor
            </div>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && generateNotes()}
              placeholder="Enter topic, e.g. Photosynthesis overview"
              className="w-full rounded-3xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-300"
            />
            <div className="flex flex-wrap gap-3">
              <button
                onClick={generateNotes}
                disabled={busy || !topic.trim()}
                className="rounded-3xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-[0_0_20px_rgba(16,185,129,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generating
                  </span>
                ) : (
                  "Create Notes"
                )}
              </button>
              <button
                onClick={() => setOutput("")}
                className="rounded-3xl border border-white/10 px-5 py-3 text-sm text-white hover:border-emerald-300"
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
                <Sparkles className="mb-3 h-8 w-8 text-emerald-300" />
                Start with a topic to see AI-crafted study notes here.
              </div>
            )}
          </div>
        </motion.div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              AI Summary
            </div>
            <div className="mt-3 text-sm text-white">
              Generate concise notes, extract formulas, and craft flashcards from the same
              workspace.
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-background/70 p-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Related Tools
            </div>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>• Export PDF</li>
              <li>• Generate quiz</li>
              <li>• Create flashcards</li>
              <li>• Share summaries</li>
            </ul>
          </div>
        </aside>
      </div>
    </StudyWorkspaceShell>
  );
}

export default NotesWorkspace;
