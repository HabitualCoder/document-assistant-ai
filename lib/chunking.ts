/**
 * Document Chunking Service
 * Handles splitting documents into searchable chunks for RAG
 */

import { Document, DocumentChunk } from './types';
import { generateDocumentId } from './utils';

export class DocumentChunkingService {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(chunkSize: number = 1000, chunkOverlap: number = 200) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  /**
   * Chunks a document into smaller, searchable pieces
   */
  async chunkDocument(document: Document): Promise<DocumentChunk[]> {
    if (!document.content) {
      throw new Error('Document content is required for chunking');
    }

    const content = document.content;
    const chunks: DocumentChunk[] = [];
    
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(
        startIndex + this.chunkSize,
        content.length
      );

      // Try to break at sentence boundaries for better context
      let actualEndIndex = endIndex;
      if (endIndex < content.length) {
        const lastSentenceEnd = content.lastIndexOf('.', endIndex);
        const lastNewline = content.lastIndexOf('\n', endIndex);
        const lastSpace = content.lastIndexOf(' ', endIndex);
        
        // Find the best break point
        const breakPoint = Math.max(lastSentenceEnd, lastNewline, lastSpace);
        
        if (breakPoint > startIndex + this.chunkSize * 0.5) {
          actualEndIndex = breakPoint + 1;
        }
      }

      const chunkContent = content.substring(startIndex, actualEndIndex).trim();
      
      if (chunkContent.length > 0) {
        const chunk: DocumentChunk = {
          id: `${document.id}_chunk_${chunkIndex}`,
          documentId: document.id,
          content: chunkContent,
          startIndex,
          endIndex: actualEndIndex,
          metadata: {
            section: this.extractSection(chunkContent),
            heading: this.extractHeading(chunkContent),
            importance: this.calculateImportance(chunkContent),
            keywords: this.extractKeywords(chunkContent),
          },
        };

        chunks.push(chunk);
        chunkIndex++;
      }

      // Move start index with overlap
      startIndex = actualEndIndex - this.chunkOverlap;
      
      // Prevent infinite loop
      if (startIndex >= actualEndIndex) {
        startIndex = actualEndIndex;
      }
    }

    return chunks;
  }

  /**
   * Extracts section information from chunk content
   */
  private extractSection(content: string): string {
    const lines = content.split('\n');
    
    // Look for markdown headers
    for (const line of lines) {
      if (line.match(/^#{1,6}\s/)) {
        return line.replace(/^#{1,6}\s/, '').trim();
      }
    }
    
    // Look for common section patterns
    const sectionPatterns = [
      /^(introduction|overview|summary|conclusion|abstract)/i,
      /^(chapter|section|part)\s+\d+/i,
      /^(methodology|results|discussion|analysis)/i,
    ];
    
    for (const line of lines) {
      for (const pattern of sectionPatterns) {
        if (pattern.test(line)) {
          return line.trim();
        }
      }
    }
    
    return 'General';
  }

  /**
   * Extracts heading from chunk content
   */
  private extractHeading(content: string): string {
    const lines = content.split('\n');
    
    // Look for markdown headers first
    for (const line of lines) {
      if (line.match(/^#{1,6}\s/)) {
        return line.replace(/^#{1,6}\s/, '').trim();
      }
    }
    
    // Look for capitalized lines that might be headings
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && trimmed.length < 100 && 
          trimmed === trimmed.toUpperCase() && 
          /^[A-Z\s]+$/.test(trimmed)) {
        return trimmed;
      }
    }
    
    // Look for lines ending with colon (common heading pattern)
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.endsWith(':') && trimmed.length < 100) {
        return trimmed.slice(0, -1).trim();
      }
    }
    
    return '';
  }

  /**
   * Calculates importance score for chunk content
   */
  private calculateImportance(content: string): number {
    const wordCount = content.split(/\s+/).length;
    let score = 0.5; // Base score
    
    // Factors that increase importance
    const importanceFactors = [
      { pattern: /\b(important|key|main|primary|critical|essential)\b/i, weight: 0.2 },
      { pattern: /\b(summary|conclusion|overview|abstract)\b/i, weight: 0.15 },
      { pattern: /\b(methodology|results|findings|analysis)\b/i, weight: 0.1 },
      { pattern: /\d+%|\d+\.\d+%/, weight: 0.1 }, // Contains percentages
      { pattern: /\b\d{4}\b/, weight: 0.05 }, // Contains years
      { pattern: /[A-Z][a-z]+ [A-Z][a-z]+/, weight: 0.05 }, // Proper nouns
    ];
    
    for (const factor of importanceFactors) {
      if (factor.pattern.test(content)) {
        score += factor.weight;
      }
    }
    
    // Length factor
    if (wordCount > 50) score += 0.1;
    if (wordCount > 100) score += 0.05;
    
    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(score, 1.0));
  }

  /**
   * Extracts keywords from content
   */
  private extractKeywords(content: string, maxKeywords: number = 10): string[] {
    // Remove common stop words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
    ]);
    
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  /**
   * Merges overlapping chunks if they're too similar
   */
  async mergeSimilarChunks(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    if (chunks.length <= 1) return chunks;
    
    const merged: DocumentChunk[] = [];
    let currentChunk = chunks[0];
    
    for (let i = 1; i < chunks.length; i++) {
      const nextChunk = chunks[i];
      
      // Calculate similarity between chunks
      const similarity = this.calculateChunkSimilarity(currentChunk, nextChunk);
      
      if (similarity > 0.7) {
        // Merge chunks
        currentChunk = {
          ...currentChunk,
          content: currentChunk.content + ' ' + nextChunk.content,
          endIndex: nextChunk.endIndex,
          metadata: {
            ...currentChunk.metadata,
            keywords: [...new Set([...currentChunk.metadata.keywords, ...nextChunk.metadata.keywords])],
          },
        };
      } else {
        merged.push(currentChunk);
        currentChunk = nextChunk;
      }
    }
    
    merged.push(currentChunk);
    return merged;
  }

  /**
   * Calculates similarity between two chunks
   */
  private calculateChunkSimilarity(chunk1: DocumentChunk, chunk2: DocumentChunk): number {
    const words1 = new Set(chunk1.content.toLowerCase().split(/\s+/));
    const words2 = new Set(chunk2.content.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

// Export singleton instance
export const chunkingService = new DocumentChunkingService();
