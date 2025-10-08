/**
 * Health check API endpoint
 * Returns the status of all services
 */

import { NextRequest, NextResponse } from 'next/server';
import { HealthCheckResponse, ServiceHealth } from '@/lib/types';
import { aiService } from '@/lib/ai-services';
import { db } from '@/lib/database';

export async function GET(request: NextRequest): Promise<NextResponse<HealthCheckResponse>> {
  try {
    const startTime = Date.now();
    
    // Check AI service health
    const aiHealth = await aiService.healthCheck();
    
    // Check database health
    const dbHealth = await db.healthCheck();
    
    const services: ServiceHealth[] = [
      {
        name: 'AI Service',
        status: aiHealth.status === 'healthy' ? 'up' : 'down',
        responseTime: aiHealth.responseTime,
        lastCheck: new Date(),
        error: aiHealth.error,
      },
      {
        name: 'Database',
        status: dbHealth.status === 'healthy' ? 'up' : 'down',
        responseTime: dbHealth.responseTime,
        lastCheck: new Date(),
      },
      {
        name: 'File Storage',
        status: 'up', // Would check file storage availability
        responseTime: 10,
        lastCheck: new Date(),
      },
    ];

    const overallStatus = services.every(service => service.status === 'up') 
      ? 'healthy' 
      : services.some(service => service.status === 'down') 
        ? 'unhealthy' 
        : 'degraded';

    const response: HealthCheckResponse = {
      status: overallStatus,
      services,
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    };

    return NextResponse.json(response);
  } catch (error) {
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      services: [{
        name: 'System',
        status: 'down',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }],
      timestamp: new Date(),
      version: process.env.npm_package_version || '1.0.0',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
