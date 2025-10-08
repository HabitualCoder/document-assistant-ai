/**
 * Application configuration
 */

export const APP_CONFIG = {
  // File upload configuration
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['pdf', 'txt', 'docx', 'md'] as const,
  
  // AI configuration
  AI_MODEL: 'gemini-1.5-flash',
  EMBEDDING_MODEL: 'text-embedding-004',
  MAX_QUERY_LENGTH: 1000,
  MAX_RESULTS_PER_QUERY: 5,
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  TEMPERATURE: 0.1,
  MAX_TOKENS: 2048,
  
  // Processing configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000,
  
  // UI configuration
  DEBOUNCE_DELAY: 300,
  ANIMATION_DURATION: 200,
  
  // Development configuration
  DEBUG: process.env.NODE_ENV === 'development',
  LOG_LEVEL: process.env.NODE_ENV === 'development' ? 'debug' : 'error',
} as const;

export const API_ENDPOINTS = {
  HEALTH: '/api/health',
  UPLOAD: '/api/upload',
  PROCESS: '/api/process',
  QUERY: '/api/query',
} as const;

export const UI_MESSAGES = {
  UPLOAD_SUCCESS: 'File uploaded successfully! Processing...',
  UPLOAD_ERROR: 'Upload failed. Please try again.',
  PROCESSING_SUCCESS: 'Document processed successfully!',
  PROCESSING_ERROR: 'Document processing failed.',
  QUERY_SUCCESS: 'Query processed successfully!',
  QUERY_ERROR: 'Query failed. Please try again.',
  NO_DOCUMENTS: 'No documents uploaded yet',
  SELECT_DOCUMENTS: 'Select documents to search in specific files',
} as const;

export const VALIDATION_MESSAGES = {
  FILE_REQUIRED: 'Please select a file to upload',
  FILE_TYPE_INVALID: 'File type not supported',
  FILE_SIZE_EXCEEDED: 'File size exceeds maximum allowed size',
  QUERY_REQUIRED: 'Please enter a question',
  QUERY_TOO_LONG: 'Query is too long',
  QUERY_TOO_SHORT: 'Query is too short',
} as const;
