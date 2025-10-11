/**
 * AI Services for the Intelligent Document Assistant
 * Handles all AI-related functionality using LangChain.js and Google Gemini with Supabase Vector Store
 */

import { Document as AppDocument, DocumentChunk, QueryRequest, QueryResponse, QuerySource } from './types';
import { addDocumentsToVectorStore, searchSimilarDocuments } from './vector-store';
import { processDocumentsIntoChunks } from './document-loaders';
import { processQueryWithRAG, processSimpleQuery } from './langchain-chains';
import { testSupabaseConnection } from './supabase';
import { AIQueryError, DocumentProcessingError } from './error-handling';
import { retryWithBackoff } from './error-handling';

// AI Configuration
const AI_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  maxResults: 5,
  temperature: 0.1,
  maxTokens: 2048,
} as const;

export class AIService {
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void>;

  constructor() {
    console.log('AI Service - Initializing with LangChain + Gemini + Supabase');
    this.initializationPromise = this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('Testing Supabase connection...');
      const isConnected = await testSupabaseConnection();
      
      if (!isConnected) {
        throw new Error('Failed to connect to Supabase');
      }
      
      // Test Google API key
      if (!process.env.GOOGLE_API_KEY) {
        throw new Error('GOOGLE_API_KEY environment variable is missing');
      }
      
      this.isInitialized = true;
      console.log('AI Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to initialize AI service: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Processes a document and creates chunks for retrieval
   */
  async processDocument(document: AppDocument): Promise<DocumentChunk[]> {
    await this.initializationPromise;
    
    if (!this.isInitialized) {
      throw new DocumentProcessingError('AI service not initialized', document.id);
    }

    try {
      console.log(`Processing document: ${document.name}`);
      
      // Convert document to LangChain format and split into chunks
      const chunks = await processDocumentsIntoChunks([document]);
      console.log(`Created ${chunks.length} chunks for document ${document.name}`);
      
      // Add chunks to Supabase vector store
      await addDocumentsToVectorStore(chunks);
      console.log(`Added ${chunks.length} chunks to vector store`);
      
      // Convert LangChain documents back to our format
      const documentChunks: DocumentChunk[] = chunks.map((chunk, index) => ({
        id: `chunk_${document.id}_${index}`,
        documentId: document.id,
        content: chunk.pageContent,
        pageNumber: 1, // We'll extract this from metadata if available
        startIndex: 0, // We'll calculate this if needed
        endIndex: chunk.pageContent.length,
        embedding: [], // Embeddings are stored in Supabase
        metadata: {
          section: chunk.metadata.section || 'General',
          heading: chunk.metadata.heading || '',
          importance: 0.5, // Default importance
          keywords: [], // We'll extract keywords later
        },
      }));
      
      console.log(`Document ${document.name} processed successfully with ${documentChunks.length} chunks`);
      return documentChunks;
    } catch (error) {
      console.error(`Document processing failed for ${document.id}:`, error);
      
      if (error instanceof DocumentProcessingError) {
        throw error;
      }
      
      throw new DocumentProcessingError(
        `Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`,
        document.id
      );
    }
  }

  /**
   * Processes a user query and returns AI-generated response
   */
  async processQuery(request: QueryRequest): Promise<QueryResponse> {
    await this.initializationPromise;
    
    if (!this.isInitialized) {
      throw new AIQueryError('AI service not initialized', 'INIT_ERROR');
    }

    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      console.log(`Processing query: ${request.question}`);
      
      // Use LangChain RAG chain to process the query
      const answer = await processQueryWithRAG(request.question);
      
      // Get similar documents for sources (optional)
      const similarDocs = await searchSimilarDocuments(request.question, request.maxResults || AI_CONFIG.maxResults);
      
      // Create sources from similar documents
      const sources: QuerySource[] = similarDocs.map((doc, index) => ({
        documentId: doc.metadata.id || 'unknown',
        documentName: doc.metadata.name || 'Unknown Document',
        chunkId: `chunk_${index}`,
        content: doc.pageContent,
        relevanceScore: 0.8, // We'll calculate this properly later
        startIndex: 0,
        endIndex: doc.pageContent.length,
      }));

      const processingTime = Date.now() - startTime;

      return {
        answer,
        sources: request.includeSources !== false ? sources : [],
        confidence: this.calculateConfidence(answer, sources),
        processingTime,
        queryId,
      };
    } catch (error) {
      console.error('Query processing error:', error);
      
      throw new AIQueryError(
        `Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUERY_ERROR'
      );
    }
  }

  /**
   * Health check for the AI service
   */
  async healthCheck(): Promise<{ status: string; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: 'AI service not initialized',
        };
      }

      // Test Supabase connection
      const isConnected = await testSupabaseConnection();
      
      if (!isConnected) {
        return {
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: 'Supabase connection failed',
        };
      }

      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate confidence score based on answer and sources
   */
  private calculateConfidence(answer: string, sources: QuerySource[]): number {
    // Simple confidence calculation
    // In a real implementation, you might use more sophisticated methods
    if (sources.length === 0) return 0.3;
    if (answer.toLowerCase().includes("don't know") || answer.toLowerCase().includes("not enough information")) {
      return 0.2;
    }
    return Math.min(0.9, 0.5 + (sources.length * 0.1));
  }
}

// Export singleton instance
let aiService: AIService;
try {
  console.log('Creating AI service instance...');
  aiService = new AIService();
  console.log('AI service instance created successfully');
} catch (error) {
  console.error('Failed to create AI service instance:', error);
  // Create a mock service for development
  aiService = {
    processDocument: async () => {
      throw new Error('AI service not available');
    },
    processQuery: async () => {
      throw new Error('AI service not available');
    },
    healthCheck: async () => ({
      status: 'unhealthy',
      responseTime: 0,
      error: 'AI service initialization failed'
    })
  } as any;
}

export { aiService };