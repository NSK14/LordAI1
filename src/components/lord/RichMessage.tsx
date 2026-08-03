"use client";

import { MarkdownRenderer } from "./chat/markdown/MarkdownRenderer";

export function RichMessage({ text }: { text: string | null | undefined }) {
  const safeText = typeof text === "string" ? text : "";

  return <MarkdownRenderer>{safeText}</MarkdownRenderer>;
}
