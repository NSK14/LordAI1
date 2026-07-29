/* eslint-disable @typescript-eslint/no-explicit-any -- database schema is introduced by this change and client types regenerate after migration deployment. */
import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Compass,
  FileUp,
  LayoutList,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/lord/AppShell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-config";
import {
  createBoard,
  completePlanTask,
  getLearningSnapshot,
  recordAttempt,
  saveProfile,
  saveToBoard,
} from "@/lib/learning/client";
import { isReadyForTest, selectNextConcept } from "@/lib/learning/mastery";
import type { Question } from "@/lib/learning/types";
import { AI_GENERATED_NOTICE } from "@/lib/learning/types";

export type LearningView = "learn" | "practice" | "plan" | "feed" | "boards" | "progress";
const labels: Record<LearningView, string> = {
  learn: "Learn with LORD",
  practice: "Adaptive Practice",
  plan: "Study Plan",
  feed: "Learning Feed",
  boards: "My Boards",
  progress: "Progress & Reflection",
};

async function getSession(body: unknown) {
  const response = await authenticatedFetch(`${getApiBaseUrl()}/api/learning/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Unable to prepare this learning activity.");
  return response.json();
}

export function LearningPage({ view }: { view: LearningView }) {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const snapshot = useQuery({
    queryKey: ["learning", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => getLearningSnapshot(user!.id),
  });
  const data = snapshot.data;
  const next = useMemo(() => data && selectNextConcept(data.concepts, data.mastery), [data]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["learning", user?.id] });
  if (!user) return null;

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-6 pb-12">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              LORD Learning
            </p>
            <h1 className="font-display text-3xl gradient-text">{labels[view]}</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-xs">
            {(["learn", "practice", "plan", "feed", "boards", "progress"] as LearningView[]).map(
              (item) => (
                <a
                  key={item}
                  href={`/${item}`}
                  className={`rounded-md border px-3 py-2 ${item === view ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {labels[item]}
                </a>
              ),
            )}
          </nav>
        </header>
        <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          {AI_GENERATED_NOTICE}
        </p>
        {snapshot.isLoading && (
          <p className="text-muted-foreground">Loading your learning space…</p>
        )}
        {snapshot.error && (
          <p className="rounded-md bg-destructive/10 p-3 text-destructive">
            Your learning data could not be loaded. Please retry.
          </p>
        )}
        {data && (
          <View
            view={view}
            data={data}
            next={next}
            userId={user.id}
            refresh={refresh}
            notify={setNotice}
          />
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

function View({
  view,
  data,
  next,
  userId,
  refresh,
  notify,
}: {
  view: LearningView;
  data: Awaited<ReturnType<typeof getLearningSnapshot>>;
  next: any;
  userId: string;
  refresh: () => void;
  notify: (value: string) => void;
}) {
  if (view === "learn")
    return <Learn data={data} next={next} userId={userId} refresh={refresh} notify={notify} />;
  if (view === "practice")
    return <Practice data={data} next={next} userId={userId} refresh={refresh} notify={notify} />;
  if (view === "plan")
    return <Plan data={data} next={next} userId={userId} notify={notify} refresh={refresh} />;
  if (view === "feed")
    return <Feed data={data} userId={userId} notify={notify} refresh={refresh} />;
  if (view === "boards")
    return <Boards data={data} userId={userId} notify={notify} refresh={refresh} />;
  return <Progress data={data} />;
}

function Learn({ data, next, userId, refresh, notify }: any) {
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
      const { error } = await db.from("learning_sources").insert({
        user_id: userId,
        name: "Pasted study material",
        mime_type: "text/plain",
        source_kind: "paste",
        extracted_text: sourceText.slice(0, 100_000),
      });
      if (error) throw error;
      notify("Private study material saved. It can be used for grounded study activities.");
      setSourceText("");
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
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel icon={<BrainCircuit />} title="Your adaptive tutor">
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
          Paste lesson text or upload a text file. Sources are private to your account and are never
          added to the shared curriculum.
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
          <a href={`/practice?concept=${next?.id ?? ""}`} className="action inline-flex">
            Start a guided understanding check <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </Panel>
    </div>
  );
}

function Practice({ data, next, userId, refresh, notify }: any) {
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

function Plan({ data, next, userId, notify, refresh }: any) {
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

function Feed({ data, userId, notify, refresh }: any) {
  const [boardId, setBoardId] = useState("");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.resources.length ? (
        data.resources.map((resource: any) => (
          <Panel key={resource.id} icon={<Compass />} title={resource.title}>
            <p className="text-sm text-muted-foreground">{resource.summary}</p>
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

function Boards({ data, userId, notify, refresh }: any) {
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
    </div>
  );
}

function Progress({ data }: any) {
  const ready = isReadyForTest(data.mastery);
  return (
    <div className="space-y-4">
      <Panel icon={<Sparkles />} title="Reflection">
        <p className="text-sm text-muted-foreground">
          {ready
            ? "You are on track for a readiness check. Keep reviewing the concepts scheduled for today."
            : "Focus on the concepts below; LORD will schedule short reviews as your evidence grows."}
        </p>
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
function Panel({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
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
