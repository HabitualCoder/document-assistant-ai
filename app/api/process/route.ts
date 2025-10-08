/**
 * Document processing API endpoint
 * Handles document processing and chunking
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, ProcessRequest, ProcessResponse, ValidationError } from '@/lib/types';
import { aiService } from '@/lib/ai-services';

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<ProcessResponse>>> {
  try {
    const body = await request.json();
    
    // Validate request body
    if (!body.documentId) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_DOCUMENT_ID',
          message: 'Document ID is required',
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Create process request
    const processRequest: ProcessRequest = {
      documentId: body.documentId,
      forceReprocess: body.forceReprocess || false,
    };

    // Get document from storage (simplified implementation)
    const document = await getDocument(processRequest.documentId);
    if (!document) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Document not found',
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 404 });
    }

    // Check if document is already processed
    if (document.status === 'processed' && !processRequest.forceReprocess) {
      const response: ApiResponse<ProcessResponse> = {
        success: true,
        data: {
          documentId: document.id,
          status: 'processed',
          chunksCreated: document.chunks?.length || 0,
          processingTime: 0,
          message: 'Document is already processed',
        },
        timestamp: new Date(),
      };
      return NextResponse.json(response);
    }

    // Process document
    const startTime = Date.now();
    const chunks = await aiService.processDocument(document);
    const processingTime = Date.now() - startTime;

    // Update document with chunks
    await updateDocumentChunks(document.id, chunks);

    const response: ApiResponse<ProcessResponse> = {
      success: true,
      data: {
        documentId: document.id,
        status: 'processed',
        chunksCreated: chunks.length,
        processingTime,
        message: `Document processed successfully with ${chunks.length} chunks`,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Document processing error:', error);
    
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown processing error',
        retryable: true,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    message: 'Process endpoint - use POST method to process documents',
    methods: ['POST'],
    requiredFields: ['documentId'],
    optionalFields: ['forceReprocess'],
  });
}

/**
 * Gets document from storage (simplified implementation)
 */
async function getDocument(documentId: string): Promise<any> {
  // In production, this would query the database
  // For demo purposes, return a mock document
  return {
    id: documentId,
    name: 'Sample Document',
    type: 'txt',
    size: 1024,
    uploadDate: new Date(),
    status: 'uploading',
    content: 'This is a sample document content for processing.',
    metadata: {},
  };
}

/**
 * Updates document with chunks (simplified implementation)
 */
async function updateDocumentChunks(documentId: string, chunks: any[]): Promise<void> {
  // In production, this would update the database
  console.log(`Updating document ${documentId} with ${chunks.length} chunks`);
}
