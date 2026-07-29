import { CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";
import type { LearningConcept, Mastery } from "@/lib/learning/types";

type Props = {
  concepts: LearningConcept[];
  mastery: Mastery[];
  selectedId?: string;
  onSelect: (concept: LearningConcept) => void;
};

export function MasteryMap({ concepts, mastery, selectedId, onSelect }: Props) {
  const records = new Map(mastery.map((item) => [item.concept_id, item]));
  return (
    <section className="overflow-hidden rounded-xl border border-primary/25 bg-card/80 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Learning constellation
          </p>
          <h2 className="mt-1 font-display text-xl">Your mastery map</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a concept to guide your next tutor session. Locked concepts unlock as you build
            foundations.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Evidence, not guesses
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {concepts.map((concept) => {
          const item = records.get(concept.id);
          const score = Math.round(Number(item?.score ?? 0.35) * 100);
          const unlocked = concept.prerequisites.every(
            (id) => Number(records.get(id)?.score ?? 0) >= 0.55,
          );
          const selected = selectedId === concept.id;
          return (
            <button
              key={concept.id}
              type="button"
              disabled={!unlocked}
              onClick={() => onSelect(concept)}
              className={`group relative min-h-36 overflow-hidden rounded-lg border p-4 text-left transition ${selected ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(0,255,255,0.12)]" : unlocked ? "border-border hover:border-primary/50 hover:bg-primary/5" : "cursor-not-allowed border-border/50 opacity-60"}`}
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {concept.subject} · {concept.standard_code}
                </span>
                {unlocked ? (
                  score >= 70 ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
              </div>
              <p className="font-medium leading-snug">{concept.title}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${unlocked ? score : 0}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {unlocked ? `${score}% estimated mastery` : "Complete the prerequisite first"}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
