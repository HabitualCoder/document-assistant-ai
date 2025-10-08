/**
 * AI Services for the Intelligent Document Assistant
 * Handles all AI-related functionality using LangChain.js and Google Gemini
 */

import { GoogleGenerativeAI } from '@langchain/google-genai';
import { Document as LangChainDocument } from '@langchain/core/documents';
import { 
  Document, 
  DocumentChunk, 
  QueryRequest, 
  QueryResponse, 
  QuerySource,
  AIQueryError,
  DocumentProcessingError 
} from './types';
import { retryWithBackoff, calculateSimilarity } from './utils';

// Configuration
const AI_CONFIG = {
  maxRetries: 3,
  timeout: 30000,
  chunkSize: 1000,
  chunkOverlap: 200,
  maxResults: 5,
  temperature: 0.1,
  maxTokens: 2048,
} as const;

export class AIService {
  private model: GoogleGenerativeAI;
  private embeddingModel: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is required');
    }

    this.model = new GoogleGenerativeAI({
      modelName: 'gemini-1.5-flash',
      apiKey,
      temperature: AI_CONFIG.temperature,
      maxTokens: AI_CONFIG.maxTokens,
    });

    this.embeddingModel = new GoogleGenerativeAI({
      modelName: 'text-embedding-004',
      apiKey,
    });
  }

  /**
   * Processes a document and creates chunks for retrieval
   */
  async processDocument(document: Document): Promise<DocumentChunk[]> {
    try {
      if (!document.content) {
        throw new DocumentProcessingError(
          'Document content is required for processing',
          document.id
        );
      }

      // Import chunking service dynamically
      const { chunkingService } = await import('./chunking');
      
      // Create document chunks
      const chunks = await chunkingService.chunkDocument(document);
      
      // Generate embeddings for each chunk
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);
      
      return chunksWithEmbeddings;
    } catch (error) {
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
   * Generates embeddings for document chunks
   */
  private async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    try {
      const embeddings = await Promise.all(
        chunks.map(chunk => 
          retryWithBackoff(async () => {
            const response = await this.embeddingModel.embedQuery(chunk.content);
            return response;
          }, AI_CONFIG.maxRetries)
        )
      );

      return chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index],
      }));
    } catch (error) {
      throw new DocumentProcessingError(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        chunks[0]?.documentId || 'unknown'
      );
    }
  }

  /**
   * Processes a user query and returns AI-generated response
   */
  async processQuery(request: QueryRequest): Promise<QueryResponse> {
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // Generate query embedding for similarity search
      const queryEmbedding = await retryWithBackoff(async () => {
        const response = await this.embeddingModel.embedQuery(request.question);
        return response;
      }, AI_CONFIG.maxRetries);

      // Find relevant chunks (this would typically query a vector database)
      const relevantChunks = await this.findRelevantChunks(
        queryEmbedding,
        request.documentIds,
        request.maxResults || AI_CONFIG.maxResults
      );

      // Generate response using retrieved context
      const response = await this.generateResponse(request.question, relevantChunks);
      
      // Create sources from relevant chunks
      const sources: QuerySource[] = relevantChunks.map(chunk => ({
        documentId: chunk.documentId,
        documentName: '', // Will be populated from chunk metadata
        chunkId: chunk.id,
        content: chunk.content,
        relevanceScore: this.calculateRelevanceScore(request.question, chunk.content),
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
      }));

      const processingTime = Date.now() - startTime;

      return {
        answer: response,
        sources: request.includeSources !== false ? sources : [],
        confidence: this.calculateConfidence(response, sources),
        processingTime,
        queryId,
      };
    } catch (error) {
      throw new AIQueryError(
        `Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`,
        queryId
      );
    }
  }

  /**
   * Finds relevant chunks based on query embedding
   */
  private async findRelevantChunks(
    queryEmbedding: number[],
    documentIds?: string[],
    maxResults: number = AI_CONFIG.maxResults
  ): Promise<DocumentChunk[]> {
    try {
      // Import database service dynamically
      const { db } = await import('./database');
      
      // Find similar chunks using vector similarity
      const relevantChunks = await db.findSimilarChunks(
        queryEmbedding,
        documentIds,
        maxResults
      );
      
      return relevantChunks;
    } catch (error) {
      console.error('Error finding relevant chunks:', error);
      return [];
    }
  }

  /**
   * Generates AI response using retrieved context
   */
  private async generateResponse(question: string, chunks: DocumentChunk[]): Promise<string> {
    const context = chunks
      .map(chunk => chunk.content)
      .join('\n\n');

    const prompt = `
You are an intelligent document assistant. Answer the user's question based on the provided context from their documents.

Context:
${context}

Question: ${question}

Instructions:
- Answer based only on the provided context
- If the context doesn't contain enough information, say so
- Be concise but comprehensive
- Cite specific parts of the documents when relevant
- If you're unsure about something, express that uncertainty

Answer:`;

    try {
      const response = await retryWithBackoff(async () => {
        const result = await this.model.invoke(prompt);
        return result.content as string;
      }, AI_CONFIG.maxRetries);

      return response.trim();
    } catch (error) {
      throw new AIQueryError(
        `Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'unknown'
      );
    }
  }

  /**
   * Extracts section information from chunk content
   */
  private extractSection(content: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.match(/^#{1,6}\s/)) {
        return line.replace(/^#{1,6}\s/, '').trim();
      }
    }
    return 'General';
  }

  /**
   * Extracts heading from chunk content
   */
  private extractHeading(content: string): string {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.match(/^#{1,6}\s/) || line.match(/^[A-Z][^.!?]*$/)) {
        return line.replace(/^#{1,6}\s/, '').trim();
      }
    }
    return '';
  }

  /**
   * Calculates importance score for chunk content
   */
  private calculateImportance(content: string): number {
    const wordCount = content.split(/\s+/).length;
    const hasNumbers = /\d/.test(content);
    const hasCapitalizedWords = /[A-Z][a-z]+/.test(content);
    const hasSpecialTerms = /(important|key|main|primary|critical)/i.test(content);
    
    let score = 0.5; // Base score
    
    if (wordCount > 50) score += 0.1;
    if (hasNumbers) score += 0.1;
    if (hasCapitalizedWords) score += 0.1;
    if (hasSpecialTerms) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  /**
   * Extracts keywords from content
   */
  private extractKeywords(content: string): string[] {
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
    
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Calculates relevance score between query and content
   */
  private calculateRelevanceScore(query: string, content: string): number {
    return calculateSimilarity(query.toLowerCase(), content.toLowerCase());
  }

  /**
   * Calculates confidence score for the response
   */
  private calculateConfidence(response: string, sources: QuerySource[]): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on source relevance
    if (sources.length > 0) {
      const avgRelevance = sources.reduce((sum, source) => sum + source.relevanceScore, 0) / sources.length;
      confidence += avgRelevance * 0.3;
    }
    
    // Increase confidence if response is substantial
    if (response.length > 100) {
      confidence += 0.1;
    }
    
    // Decrease confidence if response contains uncertainty indicators
    if (/\b(unsure|uncertain|might|could|possibly)\b/i.test(response)) {
      confidence -= 0.1;
    }
    
    return Math.max(0, Math.min(confidence, 1.0));
  }

  /**
   * Health check for AI services
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.model.invoke('Test connection');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
