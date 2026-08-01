/**
 * parseMCQResponse — converts AI markdown MCQ output into structured JSON.
 *
 * Handles formats:
 *   1. Question text
 *   A) Option 1
 *   B) Option 2
 *   C) Option 3
 *   D) Option 4
 *   Answer: B
 *   Explanation: ...
 *
 * Strips all markdown (**, #, $, ---, etc).
 * Returns ParsedMCQResult with clean MCQQuestion[].
 */

import type { MCQOption, MCQQuestion, ParsedMCQResult } from "./mcq-types";

/**
 * Strip common markdown formatting symbols from a string.
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "") // bold
    .replace(/__/g, "") // underline-style bold
    .replace(/`/g, "") // inline code
    .replace(/^#+\s*/gm, "") // headings
    .replace(/\$/g, "") // dollar signs
    .replace(/^---+$/gm, "") // horizontal rules
    .replace(/^[-*]\s+/gm, "") // list markers at start
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text only
    .trim();
}

/**
 * Normalize whitespace: collapse multiple spaces/newlines into single space.
 */
function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Parse raw AI response string into structured MCQ questions.
 */
export function parseMCQResponse(raw: string): ParsedMCQResult {
  // First, strip all markdown from the entire text
  const cleaned = stripMarkdown(raw);

  // Split into question blocks
  // A block starts with a number followed by period/paren: "1.", "2)", etc.
  const blocks = splitIntoBlocks(cleaned);

  const questions: MCQQuestion[] = [];

  for (const block of blocks) {
    const parsed = parseSingleBlock(block);
    if (parsed) {
      questions.push(parsed);
    }
  }

  return { questions };
}

/**
 * Split cleaned text into individual question blocks.
 */
function splitIntoBlocks(text: string): string[] {
  // Split on patterns like "1." "2)" "3." "10." at the start of a line
  const blockRegex = /(?=^\d+[.)]\s)/m;
  const candidates = text.split(blockRegex).filter((b) => b.trim().length > 0);

  // Also try splitting on "Question N" / "Q N" patterns if above yields nothing
  if (candidates.length <= 1) {
    const altSplit = text.split(/(?=Question\s+\d+\s*[:.]?\s*)/i).filter(Boolean);
    return altSplit.length > 1 ? altSplit : candidates;
  }

  return candidates;
}

/**
 * Parse one question block into an MCQQuestion, or null if invalid.
 */
function parseSingleBlock(block: string): MCQQuestion | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 3) return null;

  let questionText = "";
  const options: { id: string; text: string }[] = [];
  let answerId = "";
  let explanation = "";
  let phase: "question" | "options" | "answer" | "explanation" = "question";

  for (const line of lines) {
    // Skip the header number e.g. "1." or "1)" or "Question 1:"
    const isHeader =
      /^\d+[.)]\s*$/.test(line) ||
      /^Question\s+\d+\s*[:.]?\s*$/i.test(line) ||
      /^Q\d*\s*[:.]?\s*$/i.test(line);
    if (isHeader) continue;

    // Try to match an option line: "A) text", "A. text", "A : text"
    const optionMatch = line.match(/^([A-D])\s*[).:]\s*(.+)/i);
    if (optionMatch && phase !== "answer" && phase !== "explanation") {
      const id = optionMatch[1].toUpperCase();
      const text = normalize(optionMatch[2]);
      if (text.length > 0) {
        options.push({ id, text });
        phase = "options";
        continue;
      }
    }

    // Answer line: "Answer: B" or "Correct: B"
    const answerMatch = line.match(/^(?:Answer|Correct)\s*:?\s*([A-D])/i);
    if (answerMatch) {
      answerId = answerMatch[1].toUpperCase();
      phase = "answer";
      continue;
    }

    // Explanation line
    if (/^Explanation/i.test(line) || phase === "explanation") {
      const expl = line.replace(/^Explanation\s*:?\s*/i, "").trim();
      if (expl) {
        explanation += (explanation ? " " : "") + normalize(expl);
      }
      phase = "explanation";
      continue;
    }

    // Anything else: if we haven't hit options yet, it's question text
    if (phase === "question") {
      questionText += (questionText ? " " : "") + normalize(line);
    } else if (phase === "options" && !answerMatch) {
      // Could be a continuation of the last option or stray text — skip
      // But check if it looks like an explanation starter
      if (/^(Explanation|Note|Hint)/i.test(line)) {
        const expl = line.replace(/^(Explanation|Note|Hint)\s*:?\s*/i, "").trim();
        if (expl) explanation += (explanation ? " " : "") + normalize(expl);
        phase = "explanation";
      }
    }
  }

  // Validate
  if (!questionText || options.length < 2) return null;

  // If no answer found, auto-detect from common patterns
  if (!answerId && options.length > 0) {
    // Try to infer from the block text
    const allText = block.toLowerCase();
    for (const opt of options) {
      if (
        allText.includes(`correct: ${opt.id.toLowerCase()}`) ||
        allText.includes(`answer: ${opt.id.toLowerCase()}`)
      ) {
        answerId = opt.id;
        break;
      }
    }
  }

  // Strip any remaining markdown from question and options
  questionText = stripMarkdown(normalize(questionText));

  const finalOptions: MCQOption[] = options.map((opt) => ({
    id: opt.id,
    text: stripMarkdown(normalize(opt.text)),
  }));

  const finalExplanation = explanation ? stripMarkdown(normalize(explanation)) : undefined;

  return {
    id: crypto.randomUUID(),
    question: questionText,
    options: finalOptions,
    answer: answerId || finalOptions[0]?.id || "A",
    explanation: finalExplanation,
  };
}
