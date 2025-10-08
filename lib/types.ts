/**
 * Core TypeScript types for the Intelligent Document Assistant
 * All types are explicitly defined with no 'any' usage
 */

// Document-related types
export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  size: number;
  uploadDate: Date;
  processedDate?: Date;
  status: DocumentStatus;
  content?: string;
  chunks?: DocumentChunk[];
  metadata: DocumentMetadata;
}

export type DocumentType = 'pdf' | 'txt' | 'docx' | 'md';

export type DocumentStatus = 'uploading' | 'processing' | 'processed' | 'error';

export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  author?: string;
  title?: string;
  createdAt?: Date;
  modifiedAt?: Date;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber?: number;
  startIndex: number;
  endIndex: number;
  embedding?: number[];
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  section?: string;
  heading?: string;
  importance: number; // 0-1 scale
  keywords: string[];
}

// AI Query types
export interface QueryRequest {
  question: string;
  documentIds?: string[];
  maxResults?: number;
  includeSources?: boolean;
  contextWindow?: number;
}

export interface QueryResponse {
  answer: string;
  sources: QuerySource[];
  confidence: number;
  processingTime: number;
  queryId: string;
}

export interface QuerySource {
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
  pageNumber?: number;
  relevanceScore: number;
  startIndex: number;
  endIndex: number;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  timestamp: Date;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  retryable: boolean;
}

// Upload types
export interface UploadRequest {
  file: File;
  metadata?: Partial<DocumentMetadata>;
}

export interface UploadResponse {
  documentId: string;
  status: DocumentStatus;
  message: string;
}

// Processing types
export interface ProcessRequest {
  documentId: string;
  forceReprocess?: boolean;
}

export interface ProcessResponse {
  documentId: string;
  status: DocumentStatus;
  chunksCreated: number;
  processingTime: number;
  message: string;
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: Date;
  version: string;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

// UI State types
export interface UIState {
  isLoading: boolean;
  error?: string;
  success?: string;
}

export interface DocumentListState {
  documents: Document[];
  selectedDocuments: string[];
  filter: DocumentFilter;
  sortBy: DocumentSortField;
  sortOrder: 'asc' | 'desc';
}

export interface DocumentFilter {
  type?: DocumentType;
  status?: DocumentStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchTerm?: string;
}

export type DocumentSortField = 'name' | 'uploadDate' | 'processedDate' | 'size' | 'status';

// Configuration types
export interface AppConfig {
  maxFileSize: number; // in bytes
  allowedFileTypes: DocumentType[];
  maxDocumentsPerUser: number;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  llmModel: string;
  maxQueryLength: number;
  maxResultsPerQuery: number;
}

// Error types
export class DocumentProcessingError extends Error {
  constructor(
    message: string,
    public documentId: string,
    public code: string = 'DOCUMENT_PROCESSING_ERROR'
  ) {
    super(message);
    this.name = 'DocumentProcessingError';
  }
}

export class AIQueryError extends Error {
  constructor(
    message: string,
    public queryId: string,
    public code: string = 'AI_QUERY_ERROR'
  ) {
    super(message);
    this.name = 'AIQueryError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Event types for real-time updates
export interface DocumentEvent {
  type: 'upload' | 'process' | 'delete' | 'error';
  documentId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface QueryEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  queryId: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}
