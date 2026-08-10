-- Document processing pipeline helpers
-- Adds the search_document_chunks RPC for semantic search over document chunks

CREATE OR REPLACE FUNCTION public.search_document_chunks(
  p_document_id UUID,
  p_query_embedding vector(1536),
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  chunk_index INTEGER,
  content TEXT,
  token_count INTEGER,
  page_number INTEGER,
  section TEXT,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    dc.id,
    dc.chunk_index,
    dc.content,
    dc.token_count,
    dc.page_number,
    dc.section,
    1 - (dc.embedding <=> p_query_embedding) AS similarity
  FROM public.document_chunks dc
  WHERE dc.document_id = p_document_id
    AND dc.embedding IS NOT NULL
  ORDER BY dc.embedding <=> p_query_embedding
  LIMIT p_limit;
$$;
