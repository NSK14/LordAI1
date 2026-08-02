/* eslint-disable @typescript-eslint/no-explicit-any -- database schema is defined in types and client types regenerate after migration deployment. */
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileText,
  FileUp,
  Flame,
  Library,
  Lightbulb,
  LayoutList,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/lord/AppShell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  addConceptToPlan,
  createBoard,
  completePlanTask,
  createTutorSession,
  getLatestTutorSession,
  getLearningSnapshot,
  getSessionMessages,
  recordAttempt,
  saveArtifact,
  saveProfile,
  saveTutorMessage,
  saveToBoard,
} from "@/lib/learning/client";
import { isReadyForTest, selectNextConcept } from "@/lib/learning/mastery";
import type { Question } from "@/lib/learning/types";
import type { TutorMode } from "@/lib/learning/types";
import { AI_GENERATED_NOTICE } from "@/lib/learning/types";
import { MasteryMap } from "./MasteryMap";

export type LearningView = "learn" | "practice" | "plan" | "feed" | "boards" | "progress";

const labels: Record<LearningView, string> = {
  learn: "Learn with LORD",
  practice: "Adaptive Practice",
  plan: "Study Plan",
  feed: "Learning Feed",
  boards: "My Boards",
  progress: "Progress & Reflection",
};

const TUTOR_MODE_LABELS: Record<TutorMode, string> = {
  socratic: "Socratic (Guided)",
  direct: "Direct Answer",
  hint: "Hint Focus",
  worked_example: "Worked Example",
  simplified: "Simplified",
  analogy: "Analogy Mode",
  diagnostic: "Diagnostic",
};

const TUTOR_MODE_INSTRUCTIONS: Record<TutorMode, string> = {
  socratic:
    "Guide the student through questions and hints before revealing answers. Ask one useful question at a time.",
  direct:
    "Provide a clear, direct answer to the student's question without unnecessary scaffolding.",
  hint: "Give a focused hint that nudges the student toward the answer without giving it away entirely.",
  worked_example:
    "Walk through a fully worked example step-by-step, explaining each stage as you go.",
  simplified:
    "Explain the concept in very simple language, avoiding jargon and breaking it into tiny pieces.",
  analogy:
    "Explain the concept using a relatable everyday analogy. Connect the analogy back to the concept explicitly.",
  diagnostic:
    "Ask a targeted diagnostic mini-question to probe the student's understanding. Do not reveal the answer.",
};

const DEFAULT_TUTOR_MODE: TutorMode = "socratic";

async function getSession(body: unknown) {
  const response = await authenticatedFetch(`${getApiBaseUrl()}/api/learning/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Unable to prepare this learning activity.");
  return response.json();
}

type TutorMessage = { id: string; role: "user" | "assistant"; text: string };

async function streamTutorReply(body: unknown, onDelta: (text: string) => void) {
  const response = await authenticatedFetch(`${getApiBaseUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) throw new Error("Tutor response unavailable");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      try {
        const event = JSON.parse(line.slice(5).trim());
        if (event.type === "text-delta" && typeof event.delta === "string") {
          answer += event.delta;
          onDelta(answer);
        }
      } catch {
        // Metadata and incomplete SSE fragments are not visible tutor text.
      }
    }
  }
  return answer;
}

export function StudyShell() {
  const rawView = useSearch({ from: "/_authenticated/study" });
  const view: LearningView = ["learn", "practice", "plan", "feed", "boards", "progress"].includes(
    rawView.view,
  )
    ? (rawView.view as LearningView)
    : "learn";
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const snapshot = useQuery({
    queryKey: ["learning", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getLearningSnapshot(user!.id),
  });
  const data = snapshot.data;
  const next = useMemo(() => data && selectNextConcept(data.concepts, data.mastery), [data]);
  const activeConcept = data?.concepts.find((concept) => concept.id === selectedConceptId) ?? next;

  if (!user) return null;
  if (snapshot.isLoading)
    return (
      <AppShell>
        <main className="mx-auto max-w-6xl p-6 text-muted-foreground">
          Loading your learning space…
        </main>
      </AppShell>
    );
  if (snapshot.error || !data)
    return (
      <AppShell>
        <main className="mx-auto max-w-6xl p-6">
          <p className="rounded-md bg-destructive/10 p-3 text-destructive">
            Your learning data could not be loaded. Please refresh and try again.
          </p>
        </main>
      </AppShell>
    );

  const renderView = () => {
    switch (view) {
      case "practice":
        return (
          <PracticeView
            data={data}
            next={activeConcept}
            userId={user.id}
            refresh={() => qc.invalidateQueries({ queryKey: ["learning", user.id] })}
            notify={setNotice}
          />
        );
      case "plan":
        return (
          <PlanView
            data={data}
            next={activeConcept}
            userId={user.id}
            notify={setNotice}
            refresh={() => qc.invalidateQueries({ queryKey: ["learning", user.id] })}
          />
        );
      case "feed":
        return (
          <FeedView
            data={data}
            userId={user.id}
            notify={setNotice}
            refresh={() => qc.invalidateQueries({ queryKey: ["learning", user.id] })}
          />
        );
      case "boards":
        return (
          <BoardsView
            data={data}
            userId={user.id}
            notify={setNotice}
            refresh={() => qc.invalidateQueries({ queryKey: ["learning", user.id] })}
          />
        );
      case "progress":
        return <ProgressView data={data} />;
      default:
        return (
          <LearnView
            data={data}
            next={activeConcept}
            userId={user.id}
            refresh={() => qc.invalidateQueries({ queryKey: ["learning", user.id] })}
            notify={setNotice}
          />
        );
    }
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-6 pb-12">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              LORD AI Academy
            </p>
            <h1 className="font-display text-3xl gradient-text">
              {view === "learn" ? "Your adaptive learning workspace" : labels[view]}
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs">
            {(["learn", "practice", "plan", "feed", "boards", "progress"] as LearningView[]).map(
              (item) => (
                <a
                  key={item}
                  href={`/study?view=${item}`}
                  className={`rounded-md border px-3 py-2 ${item === view ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {labels[item]}
                </a>
              ),
            )}
          </nav>
        </header>
        <AcademyProgress data={data} />
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          {AI_GENERATED_NOTICE}
        </p>
        {data && (
          <div className="space-y-6">
            <MasteryMap
              concepts={data.concepts}
              mastery={data.mastery}
              selectedId={activeConcept?.id}
              onSelect={(concept) => setSelectedConceptId(concept.id)}
            />
            {view === "learn" ? (
              <>
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2 space-y-6">
                    <LearnView
                      data={data}
                      next={activeConcept}
                      userId={user.id}
                      refresh={() => qc.invalidateQueries({ queryKey: ["learning", user.id] })}
                      notify={setNotice}
                    />
                  </div>
                  <div className="space-y-6">
                    <LearningDock
                      next={activeConcept}
                      userId={user.id}
                      sources={data.sources}
                      notify={setNotice}
                      refresh={() => qc.invalidateQueries({ queryKey: ["learning", user.id] })}
                    />
                  </div>
                </div>
                <ResourceLibrary data={data} />
              </>
            ) : (
              <div>{renderView()}</div>
            )}
          </div>
        )}
        {notice && (
          <p
            role="status"
            className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
          >
            {notice}
          </p>
        )}
      </main>
    </AppShell>
  );
}

function AcademyProgress({ data }: { data: Awaited<ReturnType<typeof getLearningSnapshot>> }) {
  const mastered = data.mastery.filter((item) => Number(item.score) >= 0.7).length;
  const total = Math.max(data.concepts.length, 1);
  const mastery = Math.round((mastered / total) * 100);
  const xp = data.mastery.reduce((sum, item) => sum + item.evidence_count * 25, 0);
  const today = new Date().toDateString();
  const dailyAttempts = data.attempts.filter(
    (attempt) => new Date(attempt.created_at).toDateString() === today,
  ).length;
  const dailyGoal = Math.min(100, Math.round((dailyAttempts / 3) * 100));
  const activeDays = new Set(
    [...data.sessions, ...data.attempts].map((item) => new Date(item.created_at).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  while (activeDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return (
    <section className="grid gap-3 rounded-xl border border-primary/20 bg-card/70 p-4 sm:grid-cols-2 xl:grid-cols-4">
      <ProgressMetric
        icon={<Target />}
        label="Today’s goal"
        value={`${dailyGoal}%`}
        detail={`${dailyAttempts}/3 validated practice attempts today`}
      />
      <ProgressMetric
        icon={<Flame />}
        label="Study streak"
        value={`${streak} day${streak === 1 ? "" : "s"}`}
        detail={
          streak ? "Based on persisted learning activity" : "Complete a focused session today"
        }
      />
      <ProgressMetric
        icon={<Trophy />}
        label="Mastery"
        value={`${mastery}%`}
        detail={`${mastered} of ${total} concepts secure`}
      />
      <ProgressMetric
        icon={<Sparkles />}
        label="Academy XP"
        value={String(xp)}
        detail="Earned from validated learning evidence"
      />
    </section>
  );
}

function ProgressMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-background/40 p-3">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl">{value}</p>
        <p className="text-[11px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function ResourceLibrary({ data }: { data: Awaited<ReturnType<typeof getLearningSnapshot>> }) {
  const items = [
    ...data.sources.map((source) => ({
      id: source.id,
      title: source.name,
      type: source.mime_type,
      detail: "Private study material",
    })),
    ...data.resources.map((resource: any) => ({
      id: resource.id,
      title: resource.title,
      type: resource.resource_type,
      detail: resource.provenance,
    })),
  ].slice(0, 8);
  return (
    <section className="rounded-xl border border-primary/20 bg-card/80 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Resources & evidence
          </p>
          <h2 className="mt-1 font-display text-xl">Your grounded learning library</h2>
        </div>
        <Library className="h-5 w-5 text-primary" />
      </div>
      {items.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border border-border bg-background/40 p-3">
              <div className="mb-2 flex items-center gap-2 text-primary">
                <FileText className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">{item.type}</span>
              </div>
              <p className="font-medium text-sm">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add a private school resource or save a reviewed learning item to ground your tutor
          sessions with evidence.
        </p>
      )}
    </section>
  );
}

function LearnView({ data, next, userId, refresh, notify }: any) {
  const [subject, setSubject] = useState(data.profile?.subjects?.[0] ?? "Mathematics");
  const [goal, setGoal] = useState(
    data.profile?.goals?.[0] ?? "Build confidence through steady practice",
  );
  const [sourceText, setSourceText] = useState("");
  const [gradeBand, setGradeBand] = useState(data.profile?.grade_band ?? "middle");
  const [curriculum, setCurriculum] = useState(data.profile?.curriculum ?? "CBSE");
  const [explanationDepth, setExplanationDepth] = useState(
    data.profile?.explanation_depth ?? "standard",
  );
  const [saving, setSaving] = useState(false);
  const saveSource = async () => {
    if (!sourceText.trim()) return;
    setSaving(true);
    try {
      const db = (await import("@/integrations/supabase/client")).supabase as unknown as {
        from: (table: string) => any;
      };
      const extractedText = sourceText.slice(0, 100_000);
      const { data: source, error } = await db
        .from("learning_sources")
        .insert({
          user_id: userId,
          name: "Pasted study material",
          mime_type: "text/plain",
          source_kind: "paste",
          extracted_text: extractedText,
        })
        .select("id")
        .single();
      if (error) throw error;
      const chunks = extractedText.match(/[\s\S]{1,1800}/g) ?? [];
      if (source?.id && chunks.length)
        await import("@/lib/learning/client").then(({ saveSourceChunks }) =>
          saveSourceChunks(userId, source.id, chunks).catch(() => undefined),
        );
      notify("Private study material saved. It can be used for grounded study activities.");
      setSourceText("");
      refresh();
    } catch {
      notify("Could not save this study material.");
    } finally {
      setSaving(false);
    }
  };
  const save = async () => {
    setSaving(true);
    try {
      await saveProfile(userId, {
        subjects: [subject],
        goals: [goal],
        curriculum,
        grade_band: gradeBand,
        explanation_depth: explanationDepth,
      });
      notify("Learning profile saved. LORD will adapt explanations and practice to it.");
      refresh();
    } catch {
      notify("Could not save your learning profile.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-br from-primary/15 via-card to-card p-6">
        <div className="relative z-10 max-w-2xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Your learning path
          </p>
          <h2 className="font-display text-2xl">
            Learn one step at a time—with help when you need it.
          </h2>
          <p className="text-sm text-muted-foreground">
            Start with a concept, get a hint before the answer, prove your understanding, then let
            LORD schedule the right review. This is an original LORD experience, built around open
            standards and your own materials.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <a href={`/study?view=practice`} className="action inline-flex">
              Continue with {next?.title ?? "a learning check"} <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="/study?view=plan"
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              View my plan
            </a>
          </div>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <TutorStudio
          subject={subject}
          next={next}
          userId={userId}
          sources={data.sources}
          notify={notify}
        />
        <Panel icon={<BrainCircuit />} title="Set up your adaptive tutor">
          <p className="text-sm text-muted-foreground">
            LORD starts with what you know, gives hints before answers, and checks understanding as
            you learn.
          </p>
          <label>
            Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} className="field" />
          </label>
          <label>
            Learning goal
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="field min-h-20"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              Grade band
              <select
                value={gradeBand}
                onChange={(e) => setGradeBand(e.target.value)}
                className="field"
              >
                <option value="middle">Middle school</option>
                <option value="high">High school</option>
              </select>
            </label>
            <label>
              Curriculum
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value)}
                className="field"
              >
                <option value="CBSE">CBSE</option>
                <option value="COMMON_CORE">Common Core</option>
                <option value="NGSS">NGSS</option>
              </select>
            </label>
            <label>
              Explanation depth
              <select
                value={explanationDepth}
                onChange={(e) => setExplanationDepth(e.target.value)}
                className="field"
              >
                <option value="concise">Concise</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </label>
          </div>
          <button disabled={saving} onClick={() => void save()} className="action">
            Save learner profile
          </button>
        </Panel>
        <Panel icon={<FileUp />} title="Learn from your materials">
          <p className="text-sm text-muted-foreground">
            Paste lesson text or upload a text file. Sources are private to your account and are
            never added to the shared curriculum.
          </p>
          <input
            type="file"
            accept=".txt,.md,.csv,.json,text/plain,text/markdown"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file)
                void file
                  .text()
                  .then(setSourceText)
                  .catch(() => notify("That file could not be read."));
            }}
            className="block w-full text-sm"
          />
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste notes, a question, or a passage…"
            className="field min-h-40"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void saveSource()}
              disabled={saving || !sourceText.trim()}
              className="action"
            >
              Save private source
            </button>
            <a href={`/study?view=practice`} className="action inline-flex">
              Start a guided understanding check <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function LearningDock({
  next,
  userId,
  sources,
  notify,
  refresh,
}: {
  next: any;
  userId: string;
  sources: Array<{ id: string; name: string; extracted_text?: string | null }>;
  notify: (value: string) => void;
  refresh: () => void;
}) {
  const [hint, setHint] = useState("");
  const [coachResponse, setCoachResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [flashcardTitle, setFlashcardTitle] = useState("");
  const [isCreatingFlashcards, setIsCreatingFlashcards] = useState(false);

  const generateHint = async () => {
    setIsGenerating(true);
    setHint("");
    try {
      const answer = await streamTutorReply(
        {
          mode: "balanced",
          context: { page: "study", workflow: "adaptive-socratic-tutor" },
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Provide a single, short hint for the concept: ${next?.title ?? "the current topic"}. Do not give the full answer.`,
                },
              ],
            },
          ],
        },
        (text) => setHint(text),
      );
      if (answer.trim()) {
        void createTutorSession(
          userId,
          next?.id ?? null,
          `Hint: ${next?.title ?? "learning concept"}`,
        )
          .then((sessionId) => saveTutorMessage(userId, sessionId, "assistant", answer))
          .catch(() => undefined);
      }
    } catch {
      notify("Could not generate a hint right now.");
    } finally {
      setIsGenerating(false);
    }
  };

  const runCoachAction = async (instruction: string) => {
    if (!next) return;
    setIsGenerating(true);
    setCoachResponse("");
    try {
      await streamTutorReply(
        {
          mode: "balanced",
          context: { page: "study", workflow: "learning-dock" },
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `${instruction} for ${next.title}. Keep it suitable for CBSE middle/high school, clear, and concise. Label examples as AI-generated.`,
                },
              ],
            },
          ],
        },
        setCoachResponse,
      );
    } catch {
      notify("Could not prepare that learning aid right now.");
    } finally {
      setIsGenerating(false);
    }
  };

  const createFlashcards = async () => {
    if (!flashcardTitle.trim()) return;
    setIsCreatingFlashcards(true);
    try {
      const answer = await streamTutorReply(
        {
          mode: "balanced",
          context: { page: "study", workflow: "adaptive-socratic-tutor" },
          messages: [
            {
              id: crypto.randomUUID(),
              role: "user",
              parts: [
                {
                  type: "text",
                  text: `Create a set of 6 flashcards for ${flashcardTitle}. Front = concise question; Back = one-line answer. Format as JSON array: [{"front":"...","back":"..."}].`,
                },
              ],
            },
          ],
        },
        () => {},
      );
      const jsonMatch = answer.match(/\[[\s\S]*?\]/);
      if (!jsonMatch) {
        notify("Could not parse flashcards.");
        return;
      }
      const cards = JSON.parse(jsonMatch[0]);
      await import("@/lib/learning/client").then(({ saveArtifact }) =>
        saveArtifact(userId, {
          conceptId: next?.id ?? null,
          type: "flashcards",
          title: flashcardTitle,
          content: { cards },
          aiGenerated: true,
        }),
      );
      notify("Flashcards saved to your learning artifacts.");
      setFlashcardTitle("");
      refresh();
    } catch {
      notify("Could not create flashcards.");
    } finally {
      setIsCreatingFlashcards(false);
    }
  };

  const addToPlan = async () => {
    if (!next?.id) return;
    try {
      await addConceptToPlan(userId, next);
      notify(`${next.title} was added to your active study plan.`);
      refresh();
    } catch {
      notify("Could not update your plan.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-primary/25 bg-card/80 p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Learning Dock
        </h2>
        <p className="text-sm text-muted-foreground">
          {next
            ? `Currently focused on: ${next.title}`
            : "Select a concept from the mastery map to get started."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={generateHint}
            disabled={isGenerating}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
            Give me a hint
          </button>
          <button
            onClick={() => void runCoachAction("Give one short worked example")}
            disabled={!next}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            <Sparkles className="mr-1 inline h-3.5 w-3.5" />
            Worked example
          </button>
          <button
            onClick={() =>
              void runCoachAction("Explain this in simpler language with an everyday analogy")
            }
            disabled={!next}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            Explain simpler
          </button>
          <button
            onClick={() =>
              void runCoachAction(
                "Ask one diagnostic mini-check question without giving its answer",
              )
            }
            disabled={!next}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            Mini-check
          </button>
          <button
            onClick={addToPlan}
            disabled={!next}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            Add to plan
          </button>
        </div>
        {hint && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Hint</p>
            <p className="text-muted-foreground">{hint}</p>
          </div>
        )}
        {coachResponse && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-primary">
              AI-generated learning aid
            </p>
            <p className="whitespace-pre-wrap text-muted-foreground">{coachResponse}</p>
          </div>
        )}
      </section>
      <section className="rounded-xl border border-primary/25 bg-card/80 p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          Create flashcards
        </h3>
        <input
          value={flashcardTitle}
          onChange={(e) => setFlashcardTitle(e.target.value)}
          placeholder="e.g. cbse-math-10-quadratic"
          className="field min-w-0 text-sm"
        />
        <button
          onClick={createFlashcards}
          disabled={isCreatingFlashcards || !flashcardTitle.trim()}
          className="action text-sm"
        >
          {isCreatingFlashcards ? "Generating…" : "Generate flashcards"}
        </button>
      </section>
      <section className="rounded-xl border border-primary/25 bg-card/80 p-5 space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-primary" />
          Sources
        </h3>
        <p className="text-xs text-muted-foreground">
          {sources.length} private source(s) available for grounded answers.
        </p>
      </section>
    </div>
  );
}

function TutorStudio({
  subject,
  next,
  userId,
  sources,
  notify,
}: {
  subject: string;
  next: any;
  userId: string;
  sources: Array<{ id: string; name: string; extracted_text?: string | null }>;
  notify: (value: string) => void;
}) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Hi — I'm LORD, your ${subject} learning coach. What would you like to understand? I'll guide you with questions and hints before I reveal an answer.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [tutorMode, setTutorMode] = useState<TutorMode>(DEFAULT_TUTOR_MODE);

  useEffect(() => {
    let active = true;
    const welcome: TutorMessage = {
      id: "welcome",
      role: "assistant",
      text: `Hi — I'm LORD, your ${subject} learning coach. What would you like to understand? I'll guide you with questions and hints before I reveal an answer.`,
    };
    setSessionId(null);
    setMessages([welcome]);
    void getLatestTutorSession(userId, next?.id ?? null)
      .then(async (session) => {
        if (!active || !session) return;
        const saved = await getSessionMessages(userId, session.id);
        if (!active) return;
        setSessionId(session.id);
        if (saved.length)
          setMessages(
            saved.map((message) => ({
              id: message.id,
              role: message.role === "assistant" ? "assistant" : "user",
              text: message.content,
            })),
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [next?.id, subject, userId]);

  const send = async (event?: FormEvent, prompt = draft) => {
    event?.preventDefault();
    const text = prompt.trim();
    if (!text || isThinking) return;
    const userMessage: TutorMessage = { id: crypto.randomUUID(), role: "user", text };
    const assistantId = crypto.randomUUID();
    setDraft("");
    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", text: "" },
    ]);
    setIsThinking(true);
    let persistedSessionId = sessionId;
    if (!persistedSessionId) {
      try {
        persistedSessionId = await createTutorSession(
          userId,
          next?.id ?? null,
          next?.title ? `Learning ${next.title}` : "Tutor session",
        );
        setSessionId(persistedSessionId);
      } catch {
        // Keep the session usable if the migration awaits deployment.
      }
    }
    if (persistedSessionId)
      void saveTutorMessage(userId, persistedSessionId, "user", text).catch(() => undefined);
    const sourceContext = sources
      .filter((source) => source.extracted_text?.trim())
      .slice(0, 2)
      .map((source) => `[${source.name}] ${source.extracted_text!.slice(0, 2500)}`)
      .join("\n\n");
    const tutorInstruction = [
      "You are LORD, a safe and encouraging middle/high-school tutor.",
      `Student subject: ${subject}. Current target concept: ${next?.title ?? "not selected"}.`,
      `TUTOR MODE: ${TUTOR_MODE_LABELS[tutorMode]}. ${TUTOR_MODE_INSTRUCTIONS[tutorMode]}`,
      "Use short, clear chunks.",
      "Label any worked example as AI-generated and encourage the student to check course-specific requirements.",
      sourceContext
        ? `PRIVATE STUDENT MATERIALS (use only when relevant and cite the source name):\n${sourceContext}`
        : "No private study material is selected for this answer.",
      messages.length > 1
        ? `RECENT CONVERSATION:\n${messages
            .slice(-8)
            .map((message) => `${message.role.toUpperCase()}: ${message.text}`)
            .join("\n")}`
        : "",
      `Student message: ${text}`,
    ].join("\n");
    try {
      const answer = await streamTutorReply(
        {
          mode: "balanced",
          context: { page: "study", workflow: "adaptive-socratic-tutor" },
          messages: [
            { id: userMessage.id, role: "user", parts: [{ type: "text", text: tutorInstruction }] },
          ],
        },
        (answer) =>
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId ? { ...message, text: answer } : message,
            ),
          ),
      );
      if (persistedSessionId && answer.trim()) {
        void saveTutorMessage(
          userId,
          persistedSessionId,
          "assistant",
          answer,
          sources
            .filter((source) => source.extracted_text?.trim())
            .slice(0, 2)
            .map((source) => source.id),
        ).catch(() => undefined);
      }
    } catch {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                text: "I'm unable to respond right now. You can still continue with a guided practice check.",
              }
            : message,
        ),
      );
      notify("The tutor could not connect. Try again in a moment.");
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <section className="flex min-h-[34rem] flex-col overflow-hidden rounded-xl border border-primary/25 bg-card/80 shadow-[0_0_30px_rgba(0,255,255,0.06)] lg:row-span-2">
      <header className="flex items-center justify-between border-b border-border/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <MessageSquare className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-semibold">LORD Tutor</h2>
            <p className="text-xs text-muted-foreground">Guided help · {next?.title ?? subject}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-primary">Adaptive session</span>
          <select
            value={tutorMode}
            onChange={(e) => setTutorMode(e.target.value as TutorMode)}
            className="rounded-md border border-border/40 bg-background/60 px-2 py-1 text-xs text-cyan-200/70 focus:border-cyan-300/60 focus:outline-none focus:ring-1 focus:ring-cyan-400/40"
            aria-label="Tutor mode"
          >
            {(Object.keys(TUTOR_MODE_LABELS) as TutorMode[]).map((mode) => (
              <option key={mode} value={mode}>
                {TUTOR_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </div>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-8 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground"
                : "mr-5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-6"
            }
          >
            {message.text || (
              <span className="animate-pulse text-muted-foreground">LORD is thinking…</span>
            )}
          </div>
        ))}
      </div>
      <div className="border-t border-border/70 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {[
            "Give me a hint",
            "Explain it more simply",
            "Show a worked example",
            "Ask another diagnostic question",
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isThinking}
              onClick={() => void send(undefined, prompt)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
            >
              <Lightbulb className="mr-1 inline h-3 w-3" />
              {prompt}
            </button>
          ))}
          <button
            type="button"
            disabled={!next?.id || isThinking}
            onClick={() =>
              void addConceptToPlan(userId, next)
                .then(() => notify(`${next.title} added to your study plan.`))
                .catch(() => notify("Could not add this concept to your plan."))
            }
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            Add to plan
          </button>
          <button
            type="button"
            disabled={!messages.some((message) => message.role === "assistant")}
            onClick={() => {
              const latest = [...messages]
                .reverse()
                .find((message) => message.role === "assistant" && message.id !== "welcome");
              if (!latest) return;
              void saveArtifact(userId, {
                conceptId: next?.id ?? null,
                sessionId,
                type: "notes",
                title: `Tutor note: ${next?.title ?? subject}`,
                content: { text: latest.text },
                aiGenerated: true,
              })
                .then(() => notify("Tutor explanation saved to My Boards."))
                .catch(() => notify("Could not save this note."));
            }}
            className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            Save note
          </button>
        </div>
        <form onSubmit={(event) => void send(event)} className="flex gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about a topic, show your thinking, or paste a problem…"
            className="field min-w-0 flex-1"
            disabled={isThinking}
          />
          <button
            type="submit"
            disabled={isThinking || !draft.trim()}
            className="action"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function PracticeView({ data, next, userId, refresh, notify }: any) {
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const start = async () => {
    if (!next) return;
    setLoading(true);
    setResult(null);
    setSelected(null);
    try {
      const value = await getSession({
        action: "question",
        conceptId: next.id,
        difficulty: Math.max(
          1,
          Math.min(
            5,
            Math.ceil(
              (1 - (data.mastery.find((m: any) => m.concept_id === next.id)?.score ?? 0.35)) * 5,
            ),
          ),
        ),
      });
      setQuestion(value.question);
    } catch {
      notify("Could not generate practice right now.");
    } finally {
      setLoading(false);
    }
  };
  const submit = async () => {
    if (!question || selected === null) return;
    try {
      const outcome = await recordAttempt(userId, question, selected);
      setResult(
        outcome.correct
          ? "Correct — LORD has increased your mastery and scheduled the next review."
          : `Not yet — ${question.explanation}`,
      );
      refresh();
    } catch {
      notify("Your answer could not be saved.");
    }
  };
  return (
    <Panel icon={<Target />} title={next ? `Next focus: ${next.title}` : "No concepts available"}>
      {!question ? (
        <>
          <p className="text-sm text-muted-foreground">
            Practice adapts to your weakest available concept and unlocks prerequisites first.
          </p>
          <button onClick={() => void start()} disabled={loading || !next} className="action">
            {loading ? "Preparing…" : "Start adaptive question"}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">{question.prompt}</h2>
          <p className="rounded bg-muted p-2 text-sm">Hint: {question.hint}</p>
          {question.choices.map((choice, index) => (
            <label key={choice} className="flex cursor-pointer gap-2 rounded border p-3">
              <input
                type="radio"
                checked={selected === index}
                onChange={() => setSelected(index)}
              />
              {choice}
            </label>
          ))}
          <button onClick={() => void submit()} className="action">
            Check answer
          </button>
          {result && <p className="rounded border border-primary/30 p-3 text-sm">{result}</p>}
        </div>
      )}
    </Panel>
  );
}

function PlanView({ data, next, userId, notify, refresh }: any) {
  const [loading, setLoading] = useState(false);
  const generate = async () => {
    const ids = [next?.id, ...data.mastery.map((m: any) => m.concept_id)]
      .filter(Boolean)
      .slice(0, 5);
    if (!ids.length) return;
    setLoading(true);
    try {
      const plan = await getSession({
        action: "plan",
        conceptIds: ids,
        weeklyMinutes: data.profile?.weekly_minutes ?? 180,
      });
      const db = (await import("@/integrations/supabase/client")).supabase as unknown as {
        from: (table: string) => any;
      };
      const { data: saved, error } = await db
        .from("learning_plans")
        .insert({
          user_id: userId,
          title: plan.title,
          starts_on: new Date().toISOString().slice(0, 10),
          ends_on: new Date(Date.now() + 6 * 86400000).toISOString().slice(0, 10),
          generated_from: { conceptIds: ids },
        })
        .select()
        .single();
      if (error) throw error;
      const { error: taskError } = await db.from("learning_plan_tasks").insert(
        plan.tasks.map((task: any) => ({
          user_id: userId,
          plan_id: saved.id,
          concept_id: task.conceptId,
          title: `${task.taskType === "review" ? "Review" : "Practice"}: ${task.conceptId}`,
          task_type: task.taskType,
          due_at: task.dueAt,
          estimated_minutes: task.estimatedMinutes,
        })),
      );
      if (taskError) throw taskError;
      notify("Your adaptive week is ready. Each task reflects current mastery and due reviews.");
      refresh();
    } catch {
      notify("Could not create a plan.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-4">
      <Panel icon={<LayoutList />} title="Dynamic weekly plan">
        <p className="text-sm text-muted-foreground">
          Plans prioritize low-mastery concepts, prerequisites, and spaced reviews.
        </p>
        <button onClick={() => void generate()} disabled={loading} className="action">
          {loading ? "Building…" : "Build my week"}
        </button>
      </Panel>
      {data.tasks.length > 0 && (
        <Panel icon={<CheckCircle2 />} title="Up next">
          <ul className="space-y-2">
            {data.tasks.map((task: any) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-3 rounded border p-3 text-sm"
              >
                <span>{task.title}</span>
                <span className="flex shrink-0 items-center gap-3 text-muted-foreground">
                  {new Date(task.due_at).toLocaleDateString()}
                  <button
                    className="text-primary hover:underline"
                    onClick={() =>
                      void completePlanTask(userId, task.id)
                        .then(() => {
                          notify("Task completed. Your next plan will adapt to the new evidence.");
                          refresh();
                        })
                        .catch(() => notify("Could not update this task."))
                    }
                  >
                    Complete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

function FeedView({ data, userId, notify, refresh }: any) {
  const [boardId, setBoardId] = useState("");
  const masteryByConcept = new Map(data.mastery.map((item: any) => [item.concept_id, item]));
  const resources = [...data.resources].sort(
    (a: any, b: any) =>
      Number(masteryByConcept.get(a.concept_id)?.score ?? 0.35) -
      Number(masteryByConcept.get(b.concept_id)?.score ?? 0.35),
  );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {resources.length ? (
        resources.map((resource: any) => (
          <Panel key={resource.id} icon={<Compass />} title={resource.title}>
            <p className="text-sm text-muted-foreground">{resource.summary}</p>
            {resource.concept_id && (
              <p className="mt-2 text-xs text-primary">
                Recommended for{" "}
                {Math.round(Number(masteryByConcept.get(resource.concept_id)?.score ?? 0.35) * 100)}
                % mastery
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Source: {resource.provenance} · {resource.license ?? "license not supplied"}
            </p>
            {data.boards.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Choose board"
                  value={boardId || data.boards[0].id}
                  onChange={(event) => setBoardId(event.target.value)}
                  className="field min-w-36 flex-1"
                >
                  {data.boards.map((board: any) => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() =>
                    void saveToBoard(userId, boardId || data.boards[0].id, resource.id)
                      .then(() => {
                        notify("Saved to your board.");
                        refresh();
                      })
                      .catch(() => notify("Could not save this item."))
                  }
                  className="action"
                >
                  Save to board
                </button>
              </div>
            )}
          </Panel>
        ))
      ) : (
        <Panel icon={<Sparkles />} title="Your feed is ready to grow">
          <p className="text-sm text-muted-foreground">
            Save resources from course uploads and open educational sources to create personalized
            recommendations.
          </p>
        </Panel>
      )}
    </div>
  );
}

function BoardsView({ data, userId, notify, refresh }: any) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-4">
      <Panel icon={<BookOpen />} title="Create a board">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="e.g. Physics final review"
          />
          <button
            onClick={() => {
              if (name.trim())
                void createBoard(userId, name.trim())
                  .then(() => {
                    setName("");
                    refresh();
                  })
                  .catch(() => notify("Could not create board."));
            }}
            className="action"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
        </div>
      </Panel>
      <div className="grid gap-4 md:grid-cols-2">
        {data.boards.map((board: any) => (
          <Panel key={board.id} icon={<BookOpen />} title={board.name}>
            <p className="text-sm text-muted-foreground">
              Private board · {board.learning_board_items?.[0]?.count ?? 0} saved resources
            </p>
          </Panel>
        ))}
      </div>
      <Panel icon={<FileText />} title="Saved notes & learning artifacts">
        {data.artifacts.length ? (
          <ul className="space-y-2">
            {data.artifacts.map((artifact: any) => (
              <li key={artifact.id} className="rounded border p-3 text-sm">
                <p className="font-medium">{artifact.title}</p>
                <p className="text-xs text-muted-foreground">
                  {artifact.artifact_type} · {new Date(artifact.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Save a tutor explanation or generate flashcards to build your personal study library.
          </p>
        )}
      </Panel>
    </div>
  );
}

function ProgressView({ data }: any) {
  const ready = isReadyForTest(data.mastery);
  const attempts = data.attempts.length;
  const correct = data.attempts.filter((attempt: any) => attempt.correct).length;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const weak = data.concepts
    .map((concept: any) => ({
      concept,
      score: Number(
        data.mastery.find((item: any) => item.concept_id === concept.id)?.score ?? 0.35,
      ),
    }))
    .sort((a: any, b: any) => a.score - b.score)
    .slice(0, 3);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel icon={<Target />} title="Practice accuracy">
          <p className="font-display text-3xl text-primary">{accuracy}%</p>
          <p className="text-sm text-muted-foreground">
            {correct} correct from {attempts} persisted attempts
          </p>
        </Panel>
        <Panel icon={<MessageSquare />} title="Tutor history">
          <p className="font-display text-3xl text-primary">{data.sessions.length}</p>
          <p className="text-sm text-muted-foreground">Persisted learning sessions</p>
        </Panel>
        <Panel icon={<Sparkles />} title="Study artifacts">
          <p className="font-display text-3xl text-primary">{data.artifacts.length}</p>
          <p className="text-sm text-muted-foreground">Notes, cards, and generated aids</p>
        </Panel>
      </div>
      <Panel icon={<Sparkles />} title="Reflection">
        <p className="text-sm text-muted-foreground">
          {ready
            ? "You are on track for a readiness check. Keep reviewing the concepts scheduled for today."
            : "Focus on the concepts below; LORD will schedule short reviews as your evidence grows."}
        </p>
      </Panel>
      <Panel icon={<Target />} title="Priority review concepts">
        <ul className="space-y-2 text-sm">
          {weak.map(({ concept, score }: any) => (
            <li key={concept.id} className="flex justify-between rounded border p-3">
              <span>{concept.title}</span>
              <span className="text-primary">{Math.round(score * 100)}%</span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="grid gap-3 md:grid-cols-2">
        {data.concepts.map((concept: any) => {
          const mastery = data.mastery.find((item: any) => item.concept_id === concept.id);
          const score = Math.round((mastery?.score ?? 0.35) * 100);
          return (
            <div key={concept.id} className="rounded-md border p-4">
              <p className="font-medium">{concept.title}</p>
              <p className="text-xs text-muted-foreground">
                {concept.framework} · {concept.standard_code}
              </p>
              <div className="mt-3 h-2 rounded bg-muted">
                <div className="h-2 rounded bg-primary" style={{ width: `${score}%` }} />
              </div>
              <p className="mt-1 text-xs">{score}% estimated mastery</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Panel({ icon, title, children }: { icon: any; title: string; children: any }) {
  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        {icon}
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}
