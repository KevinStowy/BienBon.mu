import { Catch, Logger } from '@nestjs/common';
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { DomainError } from '../errors/domain-error';

interface DomainErrorResponseBody {
  statusCode: number;
  error: string;
  code: string;
  message: string;
  timestamp: string;
  path: string;
}

/**
 * Catches DomainError instances and returns a structured JSON response.
 *
 * Registered as a global exception filter in main.ts.
 * Lower priority than AllExceptionsFilter (registered first).
 */
@Catch(DomainError)
export class DomainErrorFilter implements ExceptionFilter<DomainError> {
  private readonly logger = new Logger(DomainErrorFilter.name);

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();
    const statusCode = exception.statusCode;

    const body: DomainErrorResponseBody = {
      statusCode,
      error: exception.name,
      code: exception.code,
      message: exception.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    this.logger.warn(
      `DomainError [${exception.code}]: ${exception.message} — ${request.method} ${request.url}`,
    );

    void reply.status(statusCode).send(body);
  }
}
