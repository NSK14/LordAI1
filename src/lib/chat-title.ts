// Improved heuristic conversation title generator.
//
// Used as a fallback when AI-powered title generation is unavailable, and
// as the authoritative source for default-title detection.

const DEFAULT_TITLES: ReadonlySet<string> = new Set([
  "",
  "untitled",
  "new chat",
  "new conversation",
]);

const GREETING_WORDS: ReadonlySet<string> = new Set([
  "hi",
  "hello",
  "hey",
  "hiya",
  "yo",
  "sup",
  "howdy",
  "greetings",
  "good morning",
  "good afternoon",
  "good evening",
  "thanks",
  "thank",
  "thx",
  "ok",
  "okay",
  "k",
  "cool",
  "nice",
  "sure",
  "please",
]);

const FILLER_PHRASES: readonly string[] = [
  "can you",
  "could you",
  "please",
  "help me",
  "help",
  "i need",
  "i want",
  "i'd like",
  "i would like",
  "please help",
  "please explain",
  "explain",
  "tell me",
  "show me",
  "walk me through",
  "describe",
  "what is",
  "what are",
  "what's",
  "how do",
  "how does",
  "how can",
  "why is",
  "why are",
  "when should",
  "where is",
  "which",
  "who is",
  "is it",
  "are there",
  "do i",
  "does this",
  "can you help",
  "can someone",
  "i have a question",
  "i have a question about",
  "question about",
];

const MAX_TITLE_WORDS = 5;

const MINOR_WORDS: ReadonlySet<string> = new Set([
  "a",
  "an",
  "the",
  "to",
  "of",
  "for",
  "and",
  "or",
  "in",
  "on",
  "with",
  "by",
  "at",
  "from",
  "as",
  "into",
  "over",
  "under",
  "about",
]);

function normalize(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]/g, " ")
    .replace(/--/g, " ")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDefaultTitle(title: string): boolean {
  return DEFAULT_TITLES.has(title.trim().toLowerCase());
}

function capitalizeTitle(title: string): string {
  const words = title.split(" ").filter(Boolean);
  if (words.length === 0) return title;

  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      if (MINOR_WORDS.has(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function generateChatTitle(prompt: string): string | null {
  const normalized = normalize(prompt);
  if (!normalized) return null;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 0) return null;

  // Check if it's just a greeting
  const nonGreeting = words.filter((w) => !GREETING_WORDS.has(w.toLowerCase()));
  const source = nonGreeting.length > 0 ? nonGreeting : words;
  if (source.length === 0) return null;

  // Strip leading filler phrases
  let startIndex = 0;
  for (const phrase of FILLER_PHRASES) {
    const phraseWords = phrase.split(" ");
    if (source.length >= phraseWords.length) {
      const isMatch = phraseWords.every((pw, i) => source[i].toLowerCase() === pw);
      if (isMatch) {
        startIndex = phraseWords.length;
        break;
      }
    }
  }

  const finalWords = source.slice(startIndex, startIndex + MAX_TITLE_WORDS);
  if (finalWords.length === 0) return null;

  const title = capitalizeTitle(finalWords.join(" "));
  return title.length > 0 ? title : null;
}

/**
 * Whether a stored conversation title is still a default placeholder and thus
 * eligible for automatic generation. A previously renamed conversation is
 * never overwritten.
 */
export function shouldGenerateTitle(storedTitle: string | null | undefined): boolean {
  if (storedTitle === null || storedTitle === undefined) return true;
  return isDefaultTitle(storedTitle);
}
