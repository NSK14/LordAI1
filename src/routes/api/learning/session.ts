/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";
import type { Question } from "@/lib/learning/types";

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("question"),
    conceptId: z.string().min(1),
    difficulty: z.number().int().min(1).max(5).default(2),
  }),
  z.object({
    action: z.literal("plan"),
    conceptIds: z.array(z.string().min(1)).min(1).max(12),
    weeklyMinutes: z.number().int().min(30).max(1680).default(180),
  }),
]);

function questionFor(conceptId: string, title: string, difficulty: number): Question {
  const prompt = `Which statement best shows understanding of ${title}?`;
  return {
    id: crypto.randomUUID(),
    conceptId,
    prompt,
    choices: [
      `I can explain ${title} and apply it to a new example.`,
      `I only recognize the term when I see it.`,
      `It is unrelated to the topic being studied.`,
      `Memorizing a definition is always enough.`,
    ],
    correctIndex: 0,
    hint: "Choose the option that requires both explanation and application.",
    explanation: `Mastery of ${title} means explaining the idea and using it in an unfamiliar situation.`,
    difficulty: difficulty as Question["difficulty"],
    rubric: "Award credit for explanation and correct application, not recall alone.",
  };
}

export const Route = createFileRoute("/api/learning/session")({
  server: {
    middleware: [requireSupabaseRequestAuth],
    handlers: {
      POST: async ({ request, context }) => {
        const requestId = crypto.randomUUID();
        const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return apiErrorResponse(400, "INVALID_REQUEST", "Invalid learning request.", requestId);
        const auth = context as { userId?: string; supabase?: { from: (table: string) => any } };
        if (!auth.userId || !auth.supabase)
          return apiErrorResponse(
            401,
            "AI_AUTH_ERROR",
            "Sign in to use learning tools.",
            requestId,
          );
        if (parsed.data.action === "question") {
          const { data, error } = await auth.supabase
            .from("learning_concepts")
            .select("id,title")
            .eq("id", parsed.data.conceptId)
            .maybeSingle();
          if (error || !data)
            return apiErrorResponse(404, "NOT_FOUND", "Learning concept was not found.", requestId);
          return Response.json({
            question: questionFor(data.id, data.title, parsed.data.difficulty),
            aiGenerated: false,
          });
        }
        const now = new Date();
        const minutes = Math.max(
          10,
          Math.round(parsed.data.weeklyMinutes / Math.min(parsed.data.conceptIds.length, 5)),
        );
        const tasks = parsed.data.conceptIds.slice(0, 5).map((conceptId, index) => ({
          conceptId,
          taskType: index % 3 === 2 ? "review" : "practice",
          estimatedMinutes: minutes,
          dueAt: new Date(now.getTime() + index * 86_400_000).toISOString(),
        }));
        return Response.json({ title: "Adaptive weekly plan", tasks, aiGenerated: false });
      },
    },
  },
});
