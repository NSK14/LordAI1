import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { getApiBaseUrl } from "@/lib/api-config";
import type { SessionResponse } from "@/components/study/types";

export interface SessionOptions {
  action:
    | "question"
    | "plan"
    | "flashcards"
    | "exam"
    | "tutor"
    | "summary"
    | "revision_schedule"
    | "memory_extract";
  conceptId?: string;
  conceptIds?: string[];
  difficulty?: number;
  topic?: string;
  questionType?: string;
  count?: number;
  examType?: string;
  questionCount?: number;
  timeLimitMinutes?: number;
  weeklyMinutes?: number;
  examDate?: string;
  syllabus?: string[];
  userMessage?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  subject?: string;
  mode?: string;
  explanationDepth?: string;
  gradeBand?: string;
  curriculum?: string;
  sourceContext?: string;
  sourceText?: string;
  format?: string;
}

export async function callLearningSession(body: SessionOptions): Promise<SessionResponse> {
  const response = await authenticatedFetch(`${getApiBaseUrl()}/api/learning/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Learning service error: ${response.status} ${errorText}`);
  }

  return response.json();
}
