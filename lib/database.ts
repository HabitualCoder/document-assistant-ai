/**
 * Database service for the Intelligent Document Assistant
 * Handles all database operations using Prisma
 */

import { PrismaClient } from '@prisma/client';
import { Document, DocumentChunk, QueryResponse, QuerySource } from '../lib/types';

// Initialize Prisma client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export class DatabaseService {
  /**
   * Store a new document
   */
  async createDocument(documentData: {
    id: string;
    name: string;
    type: string;
    size: number;
    content?: string;
    metadata?: any;
  }): Promise<Document> {
    try {
      const document = await prisma.document.create({
        data: {
          id: documentData.id,
          name: documentData.name,
          type: documentData.type,
          size: documentData.size,
          content: documentData.content,
          metadata: documentData.metadata ? JSON.stringify(documentData.metadata) : null,
          status: 'uploading',
        },
      });

      return this.mapPrismaDocumentToDocument(document);
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  /**
   * Update document status
   */
  async updateDocumentStatus(documentId: string, status: string): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (status === 'processed') {
        updateData.processedDate = new Date();
      }

      await prisma.document.update({
        where: { id: documentId },
        data: updateData,
      });
    } catch (error) {
      console.error('Error updating document status:', error);
      throw error;
    }
  }

  /**
   * Update document content
   */
  async updateDocumentContent(documentId: string, content: string): Promise<void> {
    try {
      await prisma.document.update({
        where: { id: documentId },
        data: { content },
      });
    } catch (error) {
      console.error('Error updating document content:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<Document | null> {
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: {
          chunks: true,
        },
      });

      return document ? this.mapPrismaDocumentToDocument(document) : null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<Document[]> {
    try {
      const documents = await prisma.document.findMany({
        orderBy: { uploadDate: 'desc' },
        include: {
          chunks: true,
        },
      });

      return documents.map(doc => this.mapPrismaDocumentToDocument(doc));
    } catch (error) {
      console.error('Error getting all documents:', error);
      throw error;
    }
  }

  /**
   * Create document chunks
   */
  async createDocumentChunks(documentId: string, chunks: DocumentChunk[]): Promise<void> {
    try {
      await prisma.documentChunk.createMany({
        data: chunks.map(chunk => ({
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          pageNumber: chunk.pageNumber,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          embedding: chunk.embedding ? JSON.stringify(chunk.embedding) : null,
          metadata: chunk.metadata ? JSON.stringify(chunk.metadata) : null,
        })),
      });
    } catch (error) {
      console.error('Error creating document chunks:', error);
      throw error;
    }
  }

  /**
   * Get document chunks by document ID
   */
  async getDocumentChunks(documentId: string): Promise<DocumentChunk[]> {
    try {
      const chunks = await prisma.documentChunk.findMany({
        where: { documentId },
        orderBy: { startIndex: 'asc' },
      });

      return chunks.map(chunk => this.mapPrismaChunkToChunk(chunk));
    } catch (error) {
      console.error('Error getting document chunks:', error);
      throw error;
    }
  }

  /**
   * Find similar chunks using vector similarity
   */
  async findSimilarChunks(
    queryEmbedding: number[],
    documentIds?: string[],
    limit: number = 5
  ): Promise<DocumentChunk[]> {
    try {
      // Get all chunks with embeddings
      const whereClause: any = {
        embedding: { not: null }
      };
      
      if (documentIds && documentIds.length > 0) {
        whereClause.documentId = { in: documentIds };
      }

      const chunks = await prisma.documentChunk.findMany({
        where: whereClause,
        include: {
          document: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate similarity scores
      const chunksWithSimilarity = chunks.map(chunk => {
        const chunkEmbedding = chunk.embedding ? JSON.parse(chunk.embedding) : [];
        const similarity = this.calculateCosineSimilarity(queryEmbedding, chunkEmbedding);
        
        return {
          ...this.mapPrismaChunkToChunk(chunk),
          similarity,
        };
      });

      // Sort by similarity and return top results
      return chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(({ similarity, ...chunk }) => chunk);
        
    } catch (error) {
      console.error('Error finding similar chunks:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
    if (vectorA.length !== vectorB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Create a query record
   */
  async createQuery(queryData: {
    id: string;
    question: string;
    answer?: string;
    confidence?: number;
    processingTime?: number;
    documentIds?: string[];
  }): Promise<void> {
    try {
      await prisma.query.create({
        data: {
          id: queryData.id,
          question: queryData.question,
          answer: queryData.answer,
          confidence: queryData.confidence,
          processingTime: queryData.processingTime,
          documentIds: queryData.documentIds ? JSON.stringify(queryData.documentIds) : null,
        },
      });
    } catch (error) {
      console.error('Error creating query:', error);
      throw error;
    }
  }

  /**
   * Create query sources
   */
  async createQuerySources(queryId: string, sources: QuerySource[]): Promise<void> {
    try {
      await prisma.querySource.createMany({
        data: sources.map(source => ({
          queryId,
          chunkId: source.chunkId,
          relevanceScore: source.relevanceScore,
        })),
      });
    } catch (error) {
      console.error('Error creating query sources:', error);
      throw error;
    }
  }

  /**
   * Get query history
   */
  async getQueryHistory(limit: number = 10): Promise<any[]> {
    try {
      const queries = await prisma.query.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sources: {
            include: {
              chunk: {
                include: {
                  document: true,
                },
              },
            },
          },
        },
      });

      return queries;
    } catch (error) {
      console.error('Error getting query history:', error);
      throw error;
    }
  }

  /**
   * Delete document and all related data
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await prisma.document.delete({
        where: { id: documentId },
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Health check for database
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime: number }> {
    const startTime = Date.now();
    
    try {
      await prisma.$queryRaw`SELECT 1`;
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
      };
    }
  }

  /**
   * Map Prisma document to our Document type
   */
  private mapPrismaDocumentToDocument(prismaDoc: any): Document {
    return {
      id: prismaDoc.id,
      name: prismaDoc.name,
      type: prismaDoc.type as any,
      size: prismaDoc.size,
      uploadDate: new Date(prismaDoc.uploadDate),
      processedDate: prismaDoc.processedDate ? new Date(prismaDoc.processedDate) : undefined,
      status: prismaDoc.status as any,
      content: prismaDoc.content,
      chunks: prismaDoc.chunks?.map((chunk: any) => this.mapPrismaChunkToChunk(chunk)),
      metadata: prismaDoc.metadata ? JSON.parse(prismaDoc.metadata) : {},
    };
  }

  /**
   * Map Prisma chunk to our DocumentChunk type
   */
  private mapPrismaChunkToChunk(prismaChunk: any): DocumentChunk {
    return {
      id: prismaChunk.id,
      documentId: prismaChunk.documentId,
      content: prismaChunk.content,
      pageNumber: prismaChunk.pageNumber,
      startIndex: prismaChunk.startIndex,
      endIndex: prismaChunk.endIndex,
      embedding: prismaChunk.embedding ? JSON.parse(prismaChunk.embedding) : undefined,
      metadata: prismaChunk.metadata ? JSON.parse(prismaChunk.metadata) : {},
    };
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

// Export singleton instance
export const db = new DatabaseService();
