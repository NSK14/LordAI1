"use client";

import { MarkdownRenderer } from "./chat/markdown/MarkdownRenderer";

export function RichMessage({ text }: { text: string | null | undefined }) {
  const safeText = typeof text === "string" ? text : "";
  if (!safeText.trim()) {
    return <span className="whitespace-pre-wrap">{safeText}</span>;
  }
  return <MarkdownRenderer>{safeText}</MarkdownRenderer>;
}
