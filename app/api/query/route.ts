/**
 * Query processing API endpoint
 * Handles user queries and returns AI-generated responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, QueryRequest, QueryResponse, ValidationError } from '@/lib/types';
import { aiService } from '@/lib/ai-services';
import { db } from '@/lib/database';
import { validateQuery } from '@/lib/utils';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<QueryResponse>>> {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.question) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_QUESTION',
          message: 'Question is required',
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate query
    const validation = validateQuery(body.question);
    if (!validation.isValid) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_QUERY',
          message: validation.error || 'Invalid query',
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Create query request
    const queryRequest: QueryRequest = {
      question: body.question.trim(),
      documentIds: body.documentIds || undefined,
      maxResults: body.maxResults || 5,
      includeSources: body.includeSources !== false,
      contextWindow: body.contextWindow || 1000,
    };

    // Process query using AI service
    const queryResponse = await aiService.processQuery(queryRequest);

    // Store query and sources in database
    await db.createQuery({
      id: queryResponse.queryId,
      question: queryRequest.question,
      answer: queryResponse.answer,
      confidence: queryResponse.confidence,
      processingTime: queryResponse.processingTime,
      documentIds: queryRequest.documentIds,
    });

    if (queryResponse.sources && queryResponse.sources.length > 0) {
      await db.createQuerySources(queryResponse.queryId, queryResponse.sources);
    }

    const response: ApiResponse<QueryResponse> = {
      success: true,
      data: queryResponse,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Query processing error:', error);
    
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: 'QUERY_ERROR',
        message: error instanceof Error ? error.message : 'Unknown query error',
        retryable: true,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Query endpoint - use POST method to submit queries',
    methods: ['POST'],
    requiredFields: ['question'],
    optionalFields: ['documentIds', 'maxResults', 'includeSources', 'contextWindow'],
  });
}
