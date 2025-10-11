-- Supabase Vector Store Setup for LangChain
-- Run this SQL in your Supabase SQL Editor

-- Enable pgvector extension (REQUIRED - uncomment this line)
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing table if it exists
DROP TABLE IF EXISTS documents;

-- Create documents table for LangChain SupabaseVectorStore
CREATE TABLE documents (
  id bigserial PRIMARY KEY,
  content text NOT NULL,
  metadata jsonb,
  embedding vector(3072) -- gemini-embedding-001 uses 3072 dimensions
);

-- Note: Both ivfflat and hnsw indexes have a 2000 dimension limit
-- For 3072-dimensional Gemini embeddings, we'll use brute force search without an index
-- This is acceptable for small to medium datasets

-- Create function for similarity search (required by LangChain)
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(3072),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE documents.metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Test the function (optional)
-- SELECT * FROM match_documents('[0.1,0.2,0.3]'::vector, 5, '{}'::jsonb);
