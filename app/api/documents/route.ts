/**
 * Documents API endpoint
 * Handles getting all documents for the frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { db } from '@/lib/database';

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<any[]>>> {
  try {
    const documents = await db.getAllDocuments();
    
    const response: ApiResponse<any[]> = {
      success: true,
      data: documents,
      timestamp: new Date(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting documents:', error);
    
    const errorResponse: ApiResponse = {
      success: false,
      error: {
        code: 'DOCUMENTS_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get documents',
        retryable: true,
      },
      timestamp: new Date(),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
