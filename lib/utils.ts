/**
 * Utility functions for the Intelligent Document Assistant
 * All functions are type-safe with explicit return types
 */

import { DocumentType, DocumentStatus, DocumentMetadata } from './types';

/**
 * Validates file type against allowed document types
 */
export function validateFileType(file: File, allowedTypes: DocumentType[]): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase() as DocumentType;
  return allowedTypes.includes(fileExtension);
}

/**
 * Validates file size against maximum allowed size
 */
export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

/**
 * Formats file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Generates a unique document ID
 */
export function generateDocumentId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generates a unique query ID
 */
export function generateQueryId(): string {
  return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extracts file metadata from File object
 */
export function extractFileMetadata(file: File): Partial<DocumentMetadata> {
  return {
    title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
    createdAt: new Date(file.lastModified),
    modifiedAt: new Date(file.lastModified),
  };
}

/**
 * Determines document type from file extension
 */
export function getDocumentTypeFromFile(file: File): DocumentType | null {
  const extension = file.name.split('.').pop()?.toLowerCase();
  const validTypes: DocumentType[] = ['pdf', 'txt', 'docx', 'md'];
  
  if (extension && validTypes.includes(extension as DocumentType)) {
    return extension as DocumentType;
  }
  
  return null;
}

/**
 * Sanitizes filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Formats date in a user-friendly format
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Calculates reading time for text content
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Truncates text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

/**
 * Highlights search terms in text
 */
export function highlightText(text: string, searchTerm: string): string {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a random color for document type icons
 */
export function getDocumentTypeColor(type: DocumentType): string {
  const colors: Record<DocumentType, string> = {
    pdf: 'bg-red-100 text-red-800',
    txt: 'bg-gray-100 text-gray-800',
    docx: 'bg-blue-100 text-blue-800',
    md: 'bg-green-100 text-green-800',
  };
  
  return colors[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Gets document type icon
 */
export function getDocumentTypeIcon(type: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    pdf: '📄',
    txt: '📝',
    docx: '📘',
    md: '📋',
  };
  
  return icons[type] || '📄';
}

/**
 * Gets status color for document status
 */
export function getStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    uploading: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    processed: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  };
  
  return colors[status];
}

/**
 * Gets status icon for document status
 */
export function getStatusIcon(status: DocumentStatus): string {
  const icons: Record<DocumentStatus, string> = {
    uploading: '⬆️',
    processing: '⚙️',
    processed: '✅',
    error: '❌',
  };
  
  return icons[status];
}

/**
 * Validates query input
 */
export function validateQuery(query: string): { isValid: boolean; error?: string } {
  if (!query.trim()) {
    return { isValid: false, error: 'Query cannot be empty' };
  }
  
  if (query.length > 1000) {
    return { isValid: false, error: 'Query is too long (max 1000 characters)' };
  }
  
  return { isValid: true };
}

/**
 * Extracts keywords from text
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  const words = text
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
    .slice(0, maxKeywords)
    .map(([word]) => word);
}

/**
 * Calculates similarity between two strings (simple implementation)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}
