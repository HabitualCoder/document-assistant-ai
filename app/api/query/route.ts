/**
 * Query processing API endpoint
 * Handles user queries and returns AI-generated responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, QueryRequest, QueryResponse, ValidationError } from '@/lib/types';
import { db } from '@/lib/database';
import { validateQuery } from '@/lib/utils';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<QueryResponse>>> {
  try {
    console.log('Query API called');
    console.log('Environment check - GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Present' : 'Missing');
    console.log('Environment check - NODE_ENV:', process.env.NODE_ENV);
    
    const body = await request.json();
    console.log('Request body:', body);
    
    // Validate request body
    if (!body.question) {
      console.log('Missing question in request');
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

    console.log('Question received:', body.question);

    // Validate query
    const validation = validateQuery(body.question);
    if (!validation.isValid) {
      console.log('Query validation failed:', validation.error);
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

    console.log('Query validation passed');

    // Create query request
    const queryRequest: QueryRequest = {
      question: body.question.trim(),
      documentIds: body.documentIds || undefined,
      maxResults: body.maxResults || 5,
      includeSources: body.includeSources !== false,
      contextWindow: body.contextWindow || 1000,
    };

    console.log('Query request created:', queryRequest);

    // Check if we have any processed documents
    console.log('Checking for processed documents...');
    const allDocuments = await db.getAllDocuments();
    console.log('All documents:', allDocuments.map(doc => ({ id: doc.id, name: doc.name, status: doc.status })));
    
    const processedDocuments = allDocuments.filter(doc => doc.status === 'processed');
    console.log(`Found ${allDocuments.length} total documents, ${processedDocuments.length} processed`);
    
    // Check if the specific document IDs exist and are processed
    if (queryRequest.documentIds && queryRequest.documentIds.length > 0) {
      console.log('Checking specific document IDs:', queryRequest.documentIds);
      const requestedDocs = allDocuments.filter(doc => queryRequest.documentIds!.includes(doc.id));
      console.log('Requested documents found:', requestedDocs.map(doc => ({ id: doc.id, name: doc.name, status: doc.status })));
      
      const processedRequestedDocs = requestedDocs.filter(doc => doc.status === 'processed');
      console.log(`Requested documents processed: ${processedRequestedDocs.length}/${requestedDocs.length}`);
      
      if (processedRequestedDocs.length === 0) {
        console.log('No processed documents found for the requested IDs');
        const errorResponse: ApiResponse = {
          success: false,
          error: {
            code: 'NO_PROCESSED_DOCUMENTS',
            message: 'The selected documents are not processed yet. Please wait for processing to complete or select different documents.',
            retryable: false,
          },
          timestamp: new Date(),
        };
        return NextResponse.json(errorResponse, { status: 400 });
      }
    } else if (processedDocuments.length === 0) {
      console.log('No processed documents found');
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'NO_PROCESSED_DOCUMENTS',
          message: 'No processed documents available for querying. Please upload and process documents first.',
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    console.log('Processed documents found, proceeding with AI service...');

    // Import AI service with error handling
    let aiService;
    try {
      console.log('Importing AI service...');
      const aiServiceModule = await import('@/lib/ai-services');
      aiService = aiServiceModule.aiService;
      console.log('AI service imported successfully');
    } catch (error) {
      console.error('Failed to import AI service:', error);
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'AI_SERVICE_ERROR',
          message: 'Failed to initialize AI service. Please check the configuration.',
          retryable: true,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 500 });
    }

    // Process query using AI service
    console.log('Processing query with AI service...');
    const queryResponse = await aiService.processQuery(queryRequest);
    console.log('AI service processing completed');

    // Store query and sources in database
    console.log('Storing query in database...');
    try {
      await db.createQuery({
        id: queryResponse.queryId,
        question: queryRequest.question,
        answer: queryResponse.answer,
        confidence: queryResponse.confidence,
        processingTime: queryResponse.processingTime,
        documentIds: queryRequest.documentIds,
      });

      // Skip creating query sources for now due to foreign key constraints
      // The sources are still returned in the response for the UI
      // if (queryResponse.sources && queryResponse.sources.length > 0) {
      //   await db.createQuerySources(queryResponse.queryId, queryResponse.sources);
      // }
      
      console.log('Query stored successfully');
    } catch (dbError) {
      console.error('Database storage error:', dbError);
      // Continue with response even if database storage fails
    }

    const response: ApiResponse<QueryResponse> = {
      success: true,
      data: queryResponse,
      timestamp: new Date(),
    };

    console.log('Returning successful response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Query processing error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
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
