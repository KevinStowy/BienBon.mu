import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../modules/auth/decorators/public.decorator';

interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
  version: string;
}

interface ReadinessResponse {
  status: string;
  timestamp: string;
  checks: {
    database: string;
    redis: string;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiOkResponse({
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-01-01T00:00:00.000Z' },
        service: { type: 'string', example: 'bienbon-api' },
        version: { type: 'string', example: '0.1.0' },
      },
    },
  })
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'bienbon-api',
      version: '0.1.0',
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness check endpoint',
    description:
      'Verifies that the service and its dependencies are ready to serve traffic. ' +
      'Currently returns placeholder values; will check DB and Redis in future iterations.',
  })
  @ApiOkResponse({
    description: 'Service is ready to serve traffic',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2026-01-01T00:00:00.000Z' },
        checks: {
          type: 'object',
          properties: {
            database: { type: 'string', example: 'ok' },
            redis: { type: 'string', example: 'ok' },
          },
        },
      },
    },
  })
  getReadiness(): ReadinessResponse {
    // TODO: Replace placeholders with actual DB + Redis connectivity checks
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        redis: 'ok',
      },
    };
  }
}
