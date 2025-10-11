/**
 * Error handling utilities
 */

import { ApiError, ApiResponse } from './types';

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    retryable: boolean = false,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, false, { field, ...details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource} not found${id ? ` with ID: ${id}` : ''}`,
      'NOT_FOUND',
      404,
      false,
      { resource, id }
    );
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED', 401, false);
    this.name = 'UnauthorizedError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true);
    this.name = 'RateLimitError';
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `${service} service is currently unavailable`,
      'SERVICE_UNAVAILABLE',
      503,
      true,
      { service }
    );
    this.name = 'ServiceUnavailableError';
  }
}

/**
 * Creates a standardized API error response
 */
export function createErrorResponse(
  error: Error | AppError,
  requestId?: string
): ApiResponse {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        retryable: error.retryable,
      },
      timestamp: new Date(),
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' 
        ? { stack: error.stack, requestId }
        : { requestId },
      retryable: false,
    },
    timestamp: new Date(),
  };
}

/**
 * Creates a standardized API success response
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string
): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date(),
  };
}

/**
 * Error handler middleware for API routes
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      // Convert unknown errors to AppError
      throw new AppError(
        error instanceof Error ? error.message : 'Unknown error',
        'INTERNAL_ERROR',
        500,
        false,
        { originalError: error }
      );
    }
  };
}

/**
 * Validates required environment variables
 */
export function validateEnvironment(): void {
  const requiredVars = ['GOOGLE_API_KEY'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missingVars.join(', ')}`,
      'MISSING_ENV_VARS',
      500,
      false,
      { missingVars }
    );
  }
}

/**
 * Logs errors with appropriate level
 */
export function logError(error: Error, context?: Record<string, unknown>): void {
  const logData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      console.error('Server Error:', logData);
    } else {
      console.warn('Client Error:', logData);
    }
  } else {
    console.error('Unknown Error:', logData);
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  maxDelay: number = 10000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry if it's not a retryable error
      if (error instanceof AppError && !error.retryable) {
        throw error;
      }
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      
      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }
  
  throw lastError!;
}

/**
 * Timeout wrapper for async operations
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new AppError(timeoutMessage, 'TIMEOUT', 408, true));
      }, timeoutMs);
    }),
  ]);
}

/**
 * Validates input parameters
 */
export function validateInput<T>(
  input: unknown,
  validator: (input: unknown) => input is T,
  errorMessage: string = 'Invalid input'
): T {
  if (!validator(input)) {
    throw new ValidationError(errorMessage, 'input');
  }
  return input;
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T>(json: string, fallback?: T): T | undefined {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.warn('Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    logError(error as Error, { operation: 'safeAsync' });
    return fallback;
  }
}

// Additional error classes for AI services
export class AIQueryError extends AppError {
  constructor(message: string, code: string = 'AI_QUERY_ERROR', details?: Record<string, unknown>) {
    super(message, code, 500, true, details);
  }
}

export class DocumentProcessingError extends AppError {
  constructor(message: string, documentId: string, details?: Record<string, unknown>) {
    super(message, 'DOCUMENT_PROCESSING_ERROR', 500, true, { documentId, ...details });
  }
}
