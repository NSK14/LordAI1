"use client";

import { MarkdownRenderer } from "./chat/markdown/MarkdownRenderer";

export function RichMessage({
  text,
  streaming,
}: {
  text: string | null | undefined;
  streaming?: boolean;
}) {
  const safeText = typeof text === "string" ? text : "";
  if (!safeText.trim()) {
    return <span className="whitespace-pre-wrap">{safeText}</span>;
  }
  return <MarkdownRenderer streaming={streaming}>{safeText}</MarkdownRenderer>;
}
