import type { LearningSource, LearningConcept, LearningResource, LearningArtifact } from "./types";

export interface SourceChunk {
  index: number;
  content: string;
  embedding?: number[];
  conceptId?: string;
  conceptTitle?: string;
  keywords: string[];
  startOffset: number;
  endOffset: number;
}

export interface IndexedSource {
  source: LearningSource;
  chunks: SourceChunk[];
  summary: string | null;
  keyPoints: string[];
  concepts: Array<{ conceptId: string; conceptTitle: string; confidence: number }>;
  wordCount: number;
  indexedAt: string;
}

export interface SourceAnswer {
  answer: string;
  sources: Array<{ sourceId: string; sourceName: string; excerpt: string }>;
  confidence: number;
  relatedConcepts: string[];
}

const KEYWORD_STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "to",
  "of",
  "in",
  "for",
  "on",
  "with",
  "at",
  "by",
  "from",
  "as",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "out",
  "off",
  "over",
  "under",
  "again",
  "further",
  "then",
  "once",
  "here",
  "there",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "because",
  "but",
  "and",
  "or",
  "if",
  "while",
  "about",
  "against",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "we",
  "our",
  "you",
  "your",
  "he",
  "him",
  "his",
  "she",
  "her",
  "they",
  "them",
  "their",
]);

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !KEYWORD_STOP_WORDS.has(w));
}

function chunkText(text: string, chunkSize = 500, overlap = 100): SourceChunk[] {
  const chunks: SourceChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    let chunkEnd = end;

    if (end < text.length) {
      const lastPeriod = text.lastIndexOf(".", end);
      const lastNewline = text.lastIndexOf("\n", end);
      const breakPoint = Math.max(lastPeriod, lastNewline);
      if (breakPoint > start + chunkSize / 2) {
        chunkEnd = breakPoint + 1;
      }
    }

    const content = text.slice(start, chunkEnd).trim();
    if (content.length > 50) {
      chunks.push({
        index,
        content,
        keywords: extractKeywords(content),
        startOffset: start,
        endOffset: chunkEnd,
      });
      index++;
    }

    if (chunkEnd >= text.length) break;
    start = chunkEnd - overlap;
  }

  return chunks;
}

export function indexSource(
  source: LearningSource,
  concepts: LearningConcept[],
  resources: LearningResource[],
): IndexedSource | null {
  const text = source.extracted_text;
  if (!text || text.trim().length === 0) return null;

  const chunks = chunkText(text);
  const conceptMap = new Map(concepts.map((c) => [c.title.toLowerCase(), c]));
  const conceptKeywords = new Map<string, string[]>();
  for (const concept of concepts) {
    const keywords = [
      concept.title.toLowerCase(),
      ...(concept.keywords ?? []).map((k) => k.toLowerCase()),
      ...(concept.description ?? "")
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3),
    ];
    conceptKeywords.set(concept.id, keywords);
  }

  const matchedConcepts: Array<{ conceptId: string; conceptTitle: string; confidence: number }> =
    [];

  for (const chunk of chunks) {
    for (const [conceptId, keywords] of conceptKeywords) {
      const matches = keywords.filter((kw) => chunk.keywords.includes(kw)).length;
      if (matches > 0) {
        const existing = matchedConcepts.find((mc) => mc.conceptId === conceptId);
        if (existing) {
          existing.confidence = Math.min(1, existing.confidence + matches * 0.1);
        } else {
          const concept = concepts.find((c) => c.id === conceptId);
          matchedConcepts.push({
            conceptId,
            conceptTitle: concept?.title ?? conceptId,
            confidence: matches * 0.15,
          });
        }
      }
    }
  }

  const summary = generateSummary(text);
  const keyPoints = extractKeyPoints(text);

  return {
    source,
    chunks,
    summary,
    keyPoints,
    concepts: matchedConcepts.sort((a, b) => b.confidence - a.confidence).slice(0, 5),
    wordCount: text.split(/\s+/).length,
    indexedAt: new Date().toISOString(),
  };
}

export function generateSummary(text: string, maxLength = 200): string {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  if (sentences.length === 0) return text.slice(0, maxLength);

  const scored = sentences.map((sentence) => {
    const words = sentence.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const score = uniqueWords.size / words.length;
    return { sentence, score };
  });

  scored.sort((a, b) => b.score - a.score);

  let summary = "";
  for (const { sentence } of scored.slice(0, 3)) {
    if ((summary + " " + sentence).length <= maxLength) {
      summary += (summary ? ". " : "") + sentence;
    }
  }

  return summary || text.slice(0, maxLength);
}

export function extractKeyPoints(text: string): string[] {
  const sentences = text
    .replace(/\s+/g, " ")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 300);

  const keywords = extractKeywords(text);
  const scored = sentences.map((sentence) => {
    const lower = sentence.toLowerCase();
    const matches = keywords.filter((kw) => lower.includes(kw)).length;
    return { sentence, score: matches };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5).map((s) => s.sentence);
}

export function searchSources(
  query: string,
  indexedSources: IndexedSource[],
  topK = 5,
): SourceAnswer {
  const queryKeywords = extractKeywords(query);
  const results: Array<{
    source: IndexedSource;
    chunk: SourceChunk;
    score: number;
  }> = [];

  for (const indexed of indexedSources) {
    for (const chunk of indexed.chunks) {
      const matches = queryKeywords.filter((kw) => chunk.keywords.includes(kw)).length;
      if (matches > 0) {
        results.push({
          source: indexed,
          chunk,
          score: matches / queryKeywords.length,
        });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  const topResults = results.slice(0, topK);

  const sources = topResults.map((r) => ({
    sourceId: r.source.source.id,
    sourceName: r.source.source.name,
    excerpt: r.chunk.content.slice(0, 200),
  }));

  const relatedConcepts = new Set<string>();
  for (const r of topResults) {
    for (const concept of r.source.concepts) {
      relatedConcepts.add(concept.conceptTitle ?? concept.conceptId);
    }
  }

  const answer =
    topResults.length > 0
      ? topResults[0].chunk.content
      : "I couldn't find specific information about that in your uploaded sources. Try uploading relevant materials or asking a general question.";

  const confidence = topResults.length > 0 ? Math.round(topResults[0].score * 100) : 0;

  return {
    answer,
    sources,
    confidence,
    relatedConcepts: Array.from(relatedConcepts).slice(0, 5),
  };
}

export function buildSourceContext(indexedSources: IndexedSource[], maxTokens = 2000): string {
  let context = "";
  const usedSources: string[] = [];

  for (const indexed of indexedSources) {
    if (context.length >= maxTokens) break;
    if (indexed.summary && context.length + indexed.summary.length < maxTokens) {
      context += `\n\nSource: ${indexed.source.name}\n${indexed.summary}`;
      usedSources.push(indexed.source.name);
    }
    for (const chunk of indexed.chunks.slice(0, 2)) {
      if (context.length + chunk.content.length < maxTokens) {
        context += `\n\n[${indexed.source.name}]\n${chunk.content}`;
      }
    }
  }

  return context.trim();
}
