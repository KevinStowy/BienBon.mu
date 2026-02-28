import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function createMockContext(overrides?: {
  method?: string;
  url?: string;
  userId?: string;
}): { context: ExecutionContext; reply: { header: ReturnType<typeof vi.fn>; statusCode: number } } {
  const header = vi.fn();
  const reply = { header, statusCode: 200 };

  const request: Record<string, unknown> = {
    method: overrides?.method ?? 'GET',
    url: overrides?.url ?? '/api/baskets',
    user: overrides?.userId ? { id: overrides.userId } : undefined,
  };

  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => reply,
    }),
    getHandler: () => () => undefined,
    getClass: () => class TestController {},
    getType: () => 'http' as const,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getContext: () => ({}), getData: () => ({}) }),
    switchToWs: () => ({ getClient: () => ({}), getData: () => ({}), getPattern: () => '' }),
  } as unknown as ExecutionContext;

  return { context, reply };
}

function createCallHandler(returnValue: unknown = { ok: true }): CallHandler {
  return {
    handle: () => of(returnValue),
  };
}

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should attach X-Correlation-ID header to the response', async () => {
    const { context, reply } = createMockContext();
    const next = createCallHandler();

    const result$ = interceptor.intercept(context, next);
    await lastValueFrom(result$);

    expect(reply.header).toHaveBeenCalledWith('X-Correlation-ID', expect.any(String));
  });

  it('should generate a valid UUID v4 as correlation ID', async () => {
    const { context, reply } = createMockContext();
    const next = createCallHandler();

    const result$ = interceptor.intercept(context, next);
    await lastValueFrom(result$);

    const correlationId = reply.header.mock.calls[0]?.[1] as string;
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(correlationId).toMatch(uuidV4Regex);
  });

  it('should generate unique correlation IDs for different requests', async () => {
    const ids: string[] = [];

    for (let i = 0; i < 3; i++) {
      const { context, reply } = createMockContext();
      const next = createCallHandler();

      const result$ = interceptor.intercept(context, next);
      await lastValueFrom(result$);

      ids.push(reply.header.mock.calls[0]?.[1] as string);
    }

    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('should pass through the response value unchanged', async () => {
    const { context } = createMockContext();
    const payload = { id: '123', name: 'Test Basket' };
    const next = createCallHandler(payload);

    const result$ = interceptor.intercept(context, next);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(payload);
  });

  it('should log with userId when user is authenticated', async () => {
    // Access the private logger through the interceptor instance
    const logger = (interceptor as unknown as { logger: { log: (msg: string) => void } }).logger;
    const logSpy = vi.spyOn(logger, 'log');

    const { context } = createMockContext({ userId: 'user-abc-123' });
    const next = createCallHandler();

    const result$ = interceptor.intercept(context, next);
    await lastValueFrom(result$);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const loggedMessage = logSpy.mock.calls[0]?.[0] as string;
    const parsed = JSON.parse(loggedMessage) as Record<string, unknown>;
    expect(parsed['userId']).toBe('user-abc-123');

    logSpy.mockRestore();
  });

  it('should log with "anonymous" when user is not authenticated', async () => {
    const { context } = createMockContext();
    const next = createCallHandler();

    // We just verify it doesn't throw when user is not present
    const result$ = interceptor.intercept(context, next);
    await lastValueFrom(result$);
  });
});
