import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { createClientTag, markClientTagSent } from "@/lib/realtime/client-tag";
import { embed } from "@/lib/memory/embeddings";
import type { KnowledgeChunk, KnowledgeSource } from "./types";

export const KNOWLEDGE_SOURCES_KEY = (
  userId: string | null | undefined,
  projectId: string | null | undefined,
) => ["knowledge_sources", userId ?? "anon", projectId ?? "global"] as const;

export const KNOWLEDGE_CHUNKS_KEY = (userId: string | null | undefined, sourceId: string) =>
  ["knowledge_chunks", userId ?? "anon", sourceId] as const;

// ============================================================
// Helpers
// ============================================================

type DbKnowledgeSource = Database["public"]["Tables"]["knowledge_sources"]["Row"];
type DbKnowledgeChunk = Database["public"]["Tables"]["knowledge_chunks"]["Row"];

function splitIntoChunks(text: string, maxTokens = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];
  let tokenCount = 0;

  for (const word of words) {
    const wTokens = Math.ceil(word.length / 4) + 1;
    if (tokenCount + wTokens > maxTokens && current.length > 0) {
      chunks.push(current.join(" "));
      current = [];
      tokenCount = 0;
    }
    current.push(word);
    tokenCount += wTokens;
  }
  if (current.length > 0) chunks.push(current.join(" "));
  return chunks;
}

// ============================================================
// Queries
// ============================================================

export function useKnowledgeSources(
  userId: string | null | undefined,
  projectId: string | null | undefined,
) {
  return useQuery({
    queryKey: KNOWLEDGE_SOURCES_KEY(userId, projectId),
    enabled: !!userId,
    queryFn: async (): Promise<KnowledgeSource[]> => {
      let query = supabase
        .from("knowledge_sources")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (projectId) {
        query = query.eq("project_id", projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(mapSource);
    },
  });
}

export function useKnowledgeChunks(
  userId: string | null | undefined,
  sourceId: string | null | undefined,
) {
  return useQuery({
    queryKey: sourceId ? KNOWLEDGE_CHUNKS_KEY(userId, sourceId) : ["chunks", "none"],
    enabled: !!userId && !!sourceId,
    queryFn: async (): Promise<KnowledgeChunk[]> => {
      if (!sourceId) return [];
      const { data, error } = await supabase
        .from("knowledge_chunks")
        .select("*")
        .eq("knowledge_source_id", sourceId)
        .order("chunk_index");

      if (error) throw error;
      return (data ?? []).map(mapChunk);
    },
  });
}

// ============================================================
// Mutations
// ============================================================

export function useCreateKnowledgeSource(
  userId: string | null | undefined,
  projectId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      sourceType: string;
      contentText?: string;
      sourceUrl?: string;
      storagePath?: string;
      mimeType?: string;
      fileSizeBytes?: number;
      metadata?: Record<string, unknown>;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const insert: Database["public"]["Tables"]["knowledge_sources"]["Insert"] = {
        user_id: userId,
        project_id: projectId ?? null,
        name: input.name,
        source_type: input.sourceType,
        content_text: input.contentText ?? null,
        source_url: input.sourceUrl ?? null,
        storage_path: input.storagePath ?? null,
        mime_type: input.mimeType ?? null,
        file_size_bytes: input.fileSizeBytes ?? 0,
        metadata: (input.metadata ??
          {}) as Database["public"]["Tables"]["knowledge_sources"]["Row"]["metadata"],
      };
      const { data, error } = await supabase
        .from("knowledge_sources")
        .insert(insert)
        .select()
        .single();
      if (error) throw error;
      return data as DbKnowledgeSource;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KNOWLEDGE_SOURCES_KEY(userId, projectId) });
    },
  });
}

export function useDeleteKnowledgeSource(
  userId: string | null | undefined,
  projectId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("knowledge_sources")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KNOWLEDGE_SOURCES_KEY(userId, projectId) });
    },
  });
}

export function useReindexKnowledgeSource(
  userId: string | null | undefined,
  projectId: string | null | undefined,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (source: KnowledgeSource) => {
      if (!userId) throw new Error("Not authenticated");

      const { error: deleteError } = await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("knowledge_source_id", source.id)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      const text = source.contentText ?? "";
      const chunks = splitIntoChunks(text, 500);
      const chunkRecords: Database["public"]["Tables"]["knowledge_chunks"]["Insert"][] = [];

      for (let i = 0; i < chunks.length; i++) {
        chunkRecords.push({
          knowledge_source_id: source.id,
          user_id: userId,
          project_id: source.projectId,
          chunk_index: i,
          content: chunks[i],
          token_count: Math.ceil(chunks[i].length / 4),
        });
      }

      if (chunkRecords.length > 0) {
        const { error: insertError } = await supabase.from("knowledge_chunks").insert(chunkRecords);
        if (insertError) throw insertError;
      }

      const { error: updateError } = await supabase
        .from("knowledge_sources")
        .update({
          chunk_count: chunks.length,
          is_indexed: true,
          last_indexed_at: new Date().toISOString(),
        })
        .eq("id", source.id)
        .eq("user_id", userId);

      if (updateError) throw updateError;

      return { sourceId: source.id, chunkCount: chunks.length };
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: KNOWLEDGE_SOURCES_KEY(userId, projectId) });
    },
  });
}

// ============================================================
// Mappers
// ============================================================

function mapSource(row: DbKnowledgeSource): KnowledgeSource {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    name: row.name,
    sourceType: row.source_type,
    sourceUrl: row.source_url ?? undefined,
    storagePath: row.storage_path ?? undefined,
    contentText: row.content_text ?? undefined,
    mimeType: row.mime_type ?? undefined,
    fileSizeBytes: row.file_size_bytes,
    pageCount: row.page_count ?? undefined,
    wordCount: row.word_count,
    language: row.language,
    processingStatus: row.processing_status,
    processingError: row.processing_error ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    chunkCount: row.chunk_count,
    isIndexed: row.is_indexed,
    lastIndexedAt: row.last_indexed_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapChunk(row: DbKnowledgeChunk): KnowledgeChunk {
  return {
    id: row.id,
    knowledgeSourceId: row.knowledge_source_id,
    projectId: row.project_id,
    userId: row.user_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    summary: row.summary ?? undefined,
    heading: row.heading ?? undefined,
    section: row.section ?? undefined,
    pageNumber: row.page_number ?? undefined,
    tokenCount: row.token_count,
    language: row.language,
    createdAt: row.created_at,
  };
}
