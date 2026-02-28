import { Injectable, Logger } from '@nestjs/common';
import type {
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { randomUUID } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

interface AuthenticatedRequest extends FastifyRequest {
  user?: { id: string };
}

/**
 * Global interceptor that:
 * 1. Generates a correlation ID (UUID v4) for each request
 * 2. Attaches it as the `X-Correlation-ID` response header
 * 3. Logs structured JSON with method, url, statusCode, duration, and userId
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<AuthenticatedRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const correlationId = randomUUID();
    const startTime = Date.now();

    void reply.header('X-Correlation-ID', correlationId);

    return next.handle().pipe(
      tap({
        next: () => {
          this.logRequest(request, reply, correlationId, startTime);
        },
        error: () => {
          this.logRequest(request, reply, correlationId, startTime);
        },
      }),
    );
  }

  private logRequest(
    request: AuthenticatedRequest,
    reply: FastifyReply,
    correlationId: string,
    startTime: number,
  ): void {
    const duration = Date.now() - startTime;
    const userId = request.user?.id ?? 'anonymous';

    this.logger.log(
      JSON.stringify({
        correlationId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        duration,
        userId,
      }),
    );
  }
}
