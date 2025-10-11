/**
 * Vector store configuration using Supabase and Google Gemini embeddings
 */

import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { supabaseClient } from './supabase';

// Initialize Gemini embeddings
const embeddings = new GoogleGenerativeAIEmbeddings({
  model: 'gemini-embedding-001',
  apiKey: process.env.GOOGLE_API_KEY,
});

// Create Supabase vector store
export const vectorStore = new SupabaseVectorStore(embeddings, {
  client: supabaseClient,
  tableName: 'documents',
  queryName: 'match_documents',
});

// Create retriever for similarity search
export const retriever = vectorStore.asRetriever({
  k: 5, // Number of documents to retrieve
});

// Utility function to combine documents (from your course code)
export function combineDocuments(docs: any[]): string {
  return docs.map((doc) => doc.pageContent).join('\n\n');
}

// Add documents to vector store
export async function addDocumentsToVectorStore(documents: any[]): Promise<void> {
  try {
    console.log(`Adding ${documents.length} documents to vector store`);
    await vectorStore.addDocuments(documents);
    console.log('Documents added to vector store successfully');
  } catch (error) {
    console.error('Error adding documents to vector store:', error);
    throw error;
  }
}

// Search for similar documents
export async function searchSimilarDocuments(query: string, k: number = 5): Promise<any[]> {
  try {
    console.log(`Searching for similar documents for query: ${query}`);
    const results = await vectorStore.similaritySearch(query, k);
    console.log(`Found ${results.length} similar documents`);
    return results;
  } catch (error) {
    console.error('Error searching similar documents:', error);
    throw error;
  }
}
