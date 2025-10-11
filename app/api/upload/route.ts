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
    console.log('File processing:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: documentType,
      arrayBufferSize: arrayBuffer.byteLength
    });
    
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
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      db.updateDocumentStatus(documentId, 'error');
    });

    const response: ApiResponse<UploadResponse> = {
      success: true,
      data: {
        documentId,
        status: 'processing',
        message: 'File uploaded successfully',
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
        // Use pdf2json for reliable PDF parsing
        const PDFParser = require('pdf2json');
        
        // Convert ArrayBuffer to Buffer properly
        const buffer = Buffer.from(arrayBuffer);
        
        console.log('PDF processing - buffer size:', buffer.length);
        console.log('PDF processing - buffer first 10 bytes:', buffer.slice(0, 10));
        
        // Check if buffer looks like a PDF (starts with %PDF)
        const header = buffer.slice(0, 4).toString();
        if (header !== '%PDF') {
          throw new Error('File does not appear to be a valid PDF');
        }
        
        // Create PDF parser instance
        const pdfParser = new PDFParser();
        
        // Parse PDF and extract text
        const pdfData = await new Promise((resolve, reject) => {
          pdfParser.on('pdfParser_dataError', (errData: any) => {
            reject(new Error(`PDF parsing error: ${errData.parserError}`));
          });
          
          pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
            resolve(pdfData);
          });
          
          // Parse the buffer
          pdfParser.parseBuffer(buffer);
        });
        
        // Extract text from all pages
        let fullText = '';
        if (pdfData && (pdfData as any).Pages) {
          (pdfData as any).Pages.forEach((page: any, pageIndex: number) => {
            if (page.Texts) {
              page.Texts.forEach((text: any) => {
                if (text.R) {
                  text.R.forEach((r: any) => {
                    if (r.T) {
                      fullText += decodeURIComponent(r.T) + ' ';
                    }
                  });
                }
              });
            }
            fullText += '\n';
          });
        }
        
        console.log('PDF parsing result:', {
          textLength: fullText.length,
          pages: (pdfData as any).Pages?.length || 0,
          hasText: fullText.trim().length > 0
        });
        
        if (!fullText || fullText.trim().length === 0) {
          console.log('PDF has no extractable text');
          throw new Error('No extractable text found in PDF');
        }
        
        return fullText.trim();
      } catch (error) {
        console.error('PDF parsing error:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        throw new ValidationError(`Failed to extract PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`, 'content');
      }
    
    case 'docx':
      try {
        const mammoth = (await import('mammoth')).default;
        const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
        return result.value;
      } catch (error) {
        console.error('DOCX parsing error:', error);
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
    console.log(`Starting document processing for: ${documentId}`);
    
    // Get document from database
    const document = await db.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    console.log(`Document found: ${document.name}, content length: ${document.content?.length || 0}`);

    // Import AI service dynamically to avoid circular dependencies
    const { aiService } = await import('@/lib/ai-services');
    console.log('AI service imported successfully');
    
    // Process document with AI service (chunking + embeddings)
    console.log('Starting AI processing...');
    const chunks = await aiService.processDocument(document);
    console.log(`AI processing completed, created ${chunks.length} chunks`);
    
    // Store chunks in database
    console.log('Storing chunks in database...');
    await db.createDocumentChunks(documentId, chunks);
    console.log('Chunks stored successfully');
    
    // Update status to processed
    await db.updateDocumentStatus(documentId, 'processed');
    console.log(`Document ${documentId} processed successfully with ${chunks.length} chunks`);
  } catch (error) {
    console.error(`Document processing failed for ${documentId}:`, error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    await db.updateDocumentStatus(documentId, 'error');
  }
}
