import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path: string;
}

/**
 * Catches all unhandled exceptions and returns a safe JSON response.
 *
 * - For HttpException: returns the NestJS-style response body.
 * - For unknown errors: returns a generic 500 without leaking internals.
 *
 * Registered as a global exception filter in main.ts.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      const body: ErrorResponseBody =
        typeof exceptionResponse === 'string'
          ? {
              statusCode,
              error: exception.name,
              message: exceptionResponse,
              timestamp: new Date().toISOString(),
              path: request.url,
            }
          : {
              statusCode,
              error:
                (exceptionResponse as Record<string, unknown>)['error'] as string ??
                exception.name,
              message:
                this.extractMessage(exceptionResponse as Record<string, unknown>) ??
                exception.message,
              timestamp: new Date().toISOString(),
              path: request.url,
            };

      this.logger.warn(
        `HttpException [${statusCode}]: ${body.message} — ${request.method} ${request.url}`,
      );

      void reply.status(statusCode).send(body);
      return;
    }

    // Unknown error: log the full details but return a generic message
    this.logger.error(
      `Unhandled exception on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const body: ErrorResponseBody = {
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    void reply.status(500).send(body);
  }

  private extractMessage(
    response: Record<string, unknown>,
  ): string | undefined {
    const message = response['message'];
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message)) {
      return message.join('; ');
    }
    return undefined;
  }
}
