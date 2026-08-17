import { generateChatTitle } from "./chat-title";

const pendingControllers = new Map<string, AbortController>();

export async function generateConversationTitle(
  prompt: string,
  conversationId: string,
): Promise<string | null> {
  const existing = pendingControllers.get(conversationId);
  if (existing) {
    existing.abort();
    pendingControllers.delete(conversationId);
  }

  const controller = new AbortController();
  pendingControllers.set(conversationId, controller);

  try {
    return await generateFromApi(prompt, controller.signal);
  } catch (error) {
    if ((error as Error).name === "AbortError") return null;
    return generateChatTitle(prompt);
  } finally {
    pendingControllers.delete(conversationId);
  }
}

export function cancelTitleGeneration(conversationId: string): void {
  const controller = pendingControllers.get(conversationId);
  if (controller) {
    controller.abort();
    pendingControllers.delete(conversationId);
  }
}

async function generateFromApi(prompt: string, signal: AbortSignal): Promise<string> {
  const response = await fetch("/api/title", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Title generation failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as { title?: string };
  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Empty title from API");
  }

  return data.title.trim();
}
