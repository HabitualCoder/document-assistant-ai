/**
 * File upload API endpoint
 * Handles document uploads with validation and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, UploadRequest, UploadResponse, ValidationError } from '@/lib/types';
import { 
  validateFileType, 
  validateFileSize, 
  generateDocumentId, 
  extractFileMetadata,
  getDocumentTypeFromFile,
  sanitizeFilename 
} from '@/lib/utils';
import { db } from '@/lib/database';

// Configuration
const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['pdf', 'txt', 'docx', 'md'] as const,
  uploadPath: './uploads',
} as const;

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'MISSING_FILE',
          message: 'No file provided',
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate file type
    if (!validateFileType(file, [...UPLOAD_CONFIG.allowedTypes])) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `File type not supported. Allowed types: ${UPLOAD_CONFIG.allowedTypes.join(', ')}`,
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate file size
    if (!validateFileSize(file, UPLOAD_CONFIG.maxFileSize)) {
      const errorResponse: ApiResponse = {
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `File size exceeds maximum allowed size of ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`,
          retryable: false,
        },
        timestamp: new Date(),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Generate document ID and metadata
    const documentId = generateDocumentId();
    const documentType = getDocumentTypeFromFile(file);
    const sanitizedName = sanitizeFilename(file.name);
    const metadata = extractFileMetadata(file);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const content = await extractFileContent(arrayBuffer, documentType!);

    // Create document in database
    await db.createDocument({
      id: documentId,
      name: sanitizedName,
      type: documentType!,
      size: file.size,
      content,
      metadata,
    });

    // Update status to processing
    await db.updateDocumentStatus(documentId, 'processing');

    // Process document asynchronously
    processDocumentAsync(documentId).catch(error => {
      console.error('Document processing failed:', error);
      db.updateDocumentStatus(documentId, 'error');
    });

    const response: ApiResponse<UploadResponse> = {
      success: true,
      data: {
        documentId,
        status: 'processing',
        message: 'File uploaded successfully and is being processed',
      },
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Upload error:', error);
    
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Unknown upload error',
        retryable: true,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * Extracts text content from different file types
 */
async function extractFileContent(arrayBuffer: ArrayBuffer, type: string): Promise<string> {
  switch (type) {
    case 'txt':
    case 'md':
      return new TextDecoder().decode(arrayBuffer);
    
    case 'pdf':
      try {
        // In production, you would use pdf-parse here
        // const pdfParse = require('pdf-parse');
        // const data = await pdfParse(arrayBuffer);
        // return data.text;
        return 'PDF content extraction - demo mode. In production, this would extract actual PDF text.';
      } catch (error) {
        throw new ValidationError(`Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`, 'content');
      }
    
    case 'docx':
      try {
        // In production, you would use mammoth here
        // const mammoth = require('mammoth');
        // const result = await mammoth.extractRawText({ buffer: arrayBuffer });
        // return result.value;
        return 'DOCX content extraction - demo mode. In production, this would extract actual DOCX text.';
      } catch (error) {
        throw new ValidationError(`Failed to extract DOCX content: ${error instanceof Error ? error.message : 'Unknown error'}`, 'content');
      }
    
    default:
      throw new ValidationError(`Unsupported file type: ${type}`, 'type');
  }
}


/**
 * Processes document asynchronously
 */
async function processDocumentAsync(documentId: string): Promise<void> {
  try {
    // Get document from database
    const document = await db.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    // Import AI service dynamically to avoid circular dependencies
    const { aiService } = await import('@/lib/ai-services');
    
    // Process document with AI service (chunking + embeddings)
    const chunks = await aiService.processDocument(document);
    
    // Store chunks in database
    await db.createDocumentChunks(documentId, chunks);
    
    // Update status to processed
    await db.updateDocumentStatus(documentId, 'processed');
    
    console.log(`Document ${documentId} processed successfully with ${chunks.length} chunks`);
  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    await db.updateDocumentStatus(documentId, 'error');
  }
}
