/* eslint-disable @typescript-eslint/no-explicit-any -- server context receives the migration-defined database client. */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { requireSupabaseRequestAuth } from "@/integrations/supabase/auth-middleware";
import { apiErrorResponse } from "@/lib/api-error";
import type { Question } from "@/lib/learning/types";

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("question"),
    conceptId: z.string().min(1),
    difficulty: z.number().int().min(1).max(5).default(2),
    topic: z.string().optional(),
  }),
  z.object({
    action: z.literal("plan"),
    conceptIds: z.array(z.string().min(1)).min(1).max(12),
    weeklyMinutes: z.number().int().min(30).max(1680).default(180),
  }),
]);

const QuestionSchema = z.object({
  prompt: z.string(),
  choices: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().int().min(0).max(5),
  hint: z.string(),
  explanation: z.string(),
  rubric: z.string().optional(),
});

function questionFor(
  conceptId: string,
  title: string,
  difficulty: number,
  topic?: string,
): Question {
  const focus = topic ? ` on "${topic}"` : "";
  const diffLabel =
    ["", "introductory", "foundational", "standard", "advanced", "mastery"][difficulty] ??
    "standard";
  const prompt = `Which statement best shows ${diffLabel} understanding of ${title}${focus}?`;
  return {
    id: crypto.randomUUID(),
    conceptId,
    prompt,
    choices: [
      `I can explain ${title}${focus} and apply it to a new exam-style example.`,
      `I recognize the term but cannot explain it clearly.`,
      `It is unrelated to the topic being studied.`,
      `Memorizing a definition is always enough.`,
    ],
    correctIndex: 0,
    hint: `Choose the option that requires both explanation and application of ${title}${focus}.`,
    explanation: `Mastery of ${title}${focus} means explaining the idea and using it in an unfamiliar situation, not just recalling facts.`,
    difficulty: difficulty as Question["difficulty"],
    rubric: "Award credit for explanation and correct application, not recall alone.",
  };
}

async function generateAIQuestion(
  conceptId: string,
  title: string,
  difficulty: number,
  topic?: string,
): Promise<Question> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI not configured");

  const provider = createOpenAICompatible({
    name: "openrouter",
    apiKey,
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  });

  const diff =
    ["", "introductory", "foundational", "standard", "advanced", "mastery"][difficulty] ??
    "standard";
  const system = `You are a ${diff}-level CBSE/NGSS/Common Core assessment designer. Output ONLY strict JSON. No markdown. No extra text.`;
  const user = `Generate one ${diff} multiple-choice question for the concept: "${title}"${topic ? ` (topic: ${topic})` : ""}.

Return JSON with this exact shape:
{
  "prompt": "Question text",
  "choices": ["A)", "B)", "C)", "D)"],
  "correctIndex": 0,
  "hint": "One-sentence hint",
  "explanation": "Why the answer is correct",
  "rubric": "Short rubric"
}`;

  const { text } = await generateText({
    model: provider("openai/gpt-4o-mini"),
    system,
    messages: [{ role: "user", content: user }],
    maxOutputTokens: 512,
    temperature: 0.4,
    maxRetries: 2,
    abortSignal: new AbortController().signal,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return JSON");

  const parsed = QuestionSchema.safeParse(JSON.parse(jsonMatch[0]));
  if (!parsed.success) throw new Error("AI output failed schema validation");

  return {
    id: crypto.randomUUID(),
    conceptId,
    prompt: parsed.data.prompt,
    choices: parsed.data.choices,
    correctIndex: parsed.data.correctIndex,
    hint: parsed.data.hint,
    explanation: parsed.data.explanation,
    difficulty: difficulty as Question["difficulty"],
    rubric: parsed.data.rubric ?? "Concept understanding",
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
          const { data: concept, error } = await (auth.supabase as any)
            .from("learning_concepts")
            .select("id,title,subject")
            .eq("id", parsed.data.conceptId)
            .maybeSingle();
          if (error || !concept)
            return apiErrorResponse(404, "NOT_FOUND", "Learning concept was not found.", requestId);

          let question: Question;
          try {
            question = await generateAIQuestion(
              concept.id,
              concept.title,
              parsed.data.difficulty,
              parsed.data.topic,
            );
          } catch {
            question = questionFor(
              concept.id,
              concept.title,
              parsed.data.difficulty,
              parsed.data.topic,
            );
          }

          return Response.json({
            question,
            aiGenerated: question.prompt.includes("I can explain"),
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
