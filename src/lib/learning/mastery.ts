import type { LearningConcept, Mastery } from "./types";

/** Bounded evidence update: correct work raises mastery; incorrect work decays it gently. */
export function nextMastery(
  current: Pick<Mastery, "score" | "confidence" | "evidence_count"> | null,
  correct: boolean,
) {
  const previous = current?.score ?? 0.35;
  const evidence = (current?.evidence_count ?? 0) + 1;
  const score = Math.max(
    0,
    Math.min(1, previous + (correct ? (1 - previous) * 0.18 : -previous * 0.16)),
  );
  const confidence = Math.min(1, (current?.confidence ?? 0.2) + 0.12);
  const days = correct ? (score >= 0.8 ? 14 : score >= 0.6 ? 7 : 2) : 1;
  const nextReview = new Date(Date.now() + days * 86_400_000).toISOString();
  return { score, confidence, evidence_count: evidence, next_review_at: nextReview };
}

export function selectNextConcept(
  concepts: LearningConcept[],
  mastery: Mastery[],
): LearningConcept | null {
  const byId = new Map(mastery.map((item) => [item.concept_id, item]));
  return (
    concepts
      .filter((concept) => concept.prerequisites.every((id) => (byId.get(id)?.score ?? 0) >= 0.55))
      .sort((a, b) => (byId.get(a.id)?.score ?? 0.35) - (byId.get(b.id)?.score ?? 0.35))[0] ??
    concepts[0] ??
    null
  );
}

export function isReadyForTest(mastery: Mastery[]): boolean {
  return (
    mastery.length >= 3 &&
    mastery.filter((item) => item.score >= 0.7).length / mastery.length >= 0.75
  );
}
