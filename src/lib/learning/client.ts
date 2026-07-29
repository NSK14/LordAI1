/* eslint-disable @typescript-eslint/no-explicit-any -- database schema is defined in types and client types regenerate after migration deployment. */
import { supabase } from "@/integrations/supabase/client";
import { nextMastery } from "./mastery";
import type { LearningConcept, Mastery, Question } from "./types";

const db = supabase;

export async function getLearningSnapshot(userId: string) {
  const [concepts, mastery, tasks, boards, resources, profile, sources, integrations] =
    await Promise.all([
      db.from("learning_concepts").select("*").order("framework").order("title"),
      db.from("learning_mastery").select("*").eq("user_id", userId),
      db
        .from("learning_plan_tasks")
        .select("*, learning_concepts(title)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("due_at")
        .limit(8),
      db
        .from("learning_boards")
        .select("*, learning_board_items(count)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      db
        .from("learning_resources")
        .select("*, learning_concepts(title)")
        .order("created_at", { ascending: false })
        .limit(12),
      db.from("learning_profiles").select("*").eq("user_id", userId).maybeSingle(),
      db
        .from("learning_sources")
        .select("id,name,mime_type,source_kind,extracted_text,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      db.from("learning_integrations").select("*").eq("user_id", userId),
    ]);
  for (const result of [
    concepts,
    mastery,
    tasks,
    boards,
    resources,
    profile,
    sources,
    integrations,
  ])
    if (result.error) throw result.error;
  return {
    concepts: (concepts.data ?? []).map((concept) => ({
      ...concept,
      framework: concept.framework as LearningConcept["framework"],
      grade_band: concept.grade_band as LearningConcept["grade_band"],
    })) as LearningConcept[],
    mastery: (mastery.data ?? []) as Mastery[],
    tasks: tasks.data ?? [],
    boards: boards.data ?? [],
    resources: resources.data ?? [],
    profile: profile.data,
    sources: sources.data ?? [],
    integrations: integrations.data ?? [],
  };
}

export async function createTutorSession(userId: string, conceptId: string | null, title: string) {
  const { data, error } = await db
    .from("learning_sessions")
    .insert({ user_id: userId, concept_id: conceptId, title })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function saveTutorMessage(
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
  sourceIds: string[] = [],
) {
  const { error } = await db.from("learning_messages").insert({
    user_id: userId,
    session_id: sessionId,
    role,
    content,
    source_ids: sourceIds,
  });
  if (error) throw error;
}

export async function getSessionMessages(userId: string, sessionId: string) {
  const { data, error } = await db
    .from("learning_messages")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function saveArtifact(
  userId: string,
  input: {
    conceptId?: string | null;
    sessionId?: string | null;
    type: string;
    title: string;
    content: unknown;
    aiGenerated?: boolean;
  },
) {
  const { error } = await db.from("learning_artifacts").insert({
    user_id: userId,
    concept_id: input.conceptId ?? null,
    session_id: input.sessionId ?? null,
    artifact_type: input.type,
    title: input.title,
    content: input.content as any,
    ai_generated: input.aiGenerated ?? true,
  });
  if (error) throw error;
}

export async function saveProfile(userId: string, input: Record<string, unknown>) {
  const { error } = await db
    .from("learning_profiles")
    .upsert({ user_id: userId, ...input } as any, { onConflict: "user_id" });
  if (error) throw error;
}

export async function recordAttempt(userId: string, question: Question, selectedIndex: number) {
  const correct = selectedIndex === question.correctIndex;
  const { data: current, error: lookupError } = await db
    .from("learning_mastery")
    .select("*")
    .eq("user_id", userId)
    .eq("concept_id", question.conceptId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  const update = nextMastery(
    current as { score: number; confidence: number; evidence_count: number } | null,
    correct,
  );
  const [{ error: attemptError }, { error: masteryError }] = await Promise.all([
    db.from("learning_attempts").insert({
      user_id: userId,
      concept_id: question.conceptId,
      question,
      answer: { selectedIndex },
      correct,
      score: correct ? 1 : 0,
      feedback: question.explanation,
    }),
    db
      .from("learning_mastery")
      .upsert(
        { user_id: userId, concept_id: question.conceptId, ...update },
        { onConflict: "user_id,concept_id" },
      ),
  ]);
  if (attemptError) throw attemptError;
  if (masteryError) throw masteryError;
  return { correct, mastery: update };
}

export async function saveEvidence(
  userId: string,
  input: {
    conceptId: string;
    sessionId: string | null;
    evidenceType: string;
    score?: number | null;
    note?: string | null;
  },
) {
  const { error } = await db.from("learning_evidence").insert({
    user_id: userId,
    concept_id: input.conceptId,
    session_id: input.sessionId,
    evidence_type: input.evidenceType,
    score: input.score ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
}

export async function saveSourceChunks(userId: string, sourceId: string, chunks: string[]) {
  const rows = chunks.map((content, index) => ({
    user_id: userId,
    source_id: sourceId,
    chunk_index: index,
    content,
  }));
  const { error } = await db.from("learning_source_chunks").insert(rows);
  if (error) throw error;
}

export async function createBoard(userId: string, name: string) {
  const { data, error } = await db
    .from("learning_boards")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function saveToBoard(userId: string, boardId: string, resourceId: string) {
  const { error } = await db
    .from("learning_board_items")
    .upsert({ user_id: userId, board_id: boardId, resource_id: resourceId });
  if (error) throw error;
}

export async function completePlanTask(userId: string, taskId: string) {
  const { error } = await db
    .from("learning_plan_tasks")
    .update({ status: "completed" })
    .eq("id", taskId)
    .eq("user_id", userId);
  if (error) throw error;
}
