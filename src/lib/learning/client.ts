/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase types are generated after the migration is applied. */
import { supabase } from "@/integrations/supabase/client";
import { nextMastery } from "./mastery";
import type { LearningConcept, Mastery, Question } from "./types";

// Generated Supabase types lag migrations in this repository. Keep the cast at
// this boundary so all learning callers remain typed and the migration is the
// source of truth for database contracts.
const db = supabase as unknown as { from: (table: string) => any };

export async function getLearningSnapshot(userId: string) {
  const [concepts, mastery, tasks, boards, resources, profile] = await Promise.all([
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
  ]);
  for (const result of [concepts, mastery, tasks, boards, resources, profile])
    if (result.error) throw result.error;
  return {
    concepts: (concepts.data ?? []) as LearningConcept[],
    mastery: (mastery.data ?? []) as Mastery[],
    tasks: tasks.data ?? [],
    boards: boards.data ?? [],
    resources: resources.data ?? [],
    profile: profile.data,
  };
}

export async function saveProfile(userId: string, input: Record<string, unknown>) {
  const { error } = await db
    .from("learning_profiles")
    .upsert({ user_id: userId, ...input }, { onConflict: "user_id" });
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
  const update = nextMastery(current as Mastery | null, correct);
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
