import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ArgumentsHost } from '@nestjs/common';
import { DomainErrorFilter } from './domain-error.filter';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../errors/domain-error';

function createMockHost(url: string, method: string): {
  host: ArgumentsHost;
  reply: { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn>; statusCode: number };
} {
  const send = vi.fn();
  const status = vi.fn().mockReturnValue({ send });

  const reply = { status, send, statusCode: 0 };

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url, method }),
      getResponse: () => reply,
    }),
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getContext: () => ({}), getData: () => ({}) }),
    switchToWs: () => ({ getClient: () => ({}), getData: () => ({}), getPattern: () => '' }),
    getType: () => 'http' as const,
  } as unknown as ArgumentsHost;

  return { host, reply };
}

describe('DomainErrorFilter', () => {
  let filter: DomainErrorFilter;

  beforeEach(() => {
    filter = new DomainErrorFilter();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should return structured JSON for BusinessRuleError', () => {
    const error = new BusinessRuleError('INSUFFICIENT_STOCK', 'Not enough stock available');
    const { host, reply } = createMockHost('/api/reservations', 'POST');

    filter.catch(error, host);

    expect(reply.status).toHaveBeenCalledWith(400);
    const body = reply.status.mock.results[0]?.value.send.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      statusCode: 400,
      error: 'BusinessRuleError',
      code: 'INSUFFICIENT_STOCK',
      message: 'Not enough stock available',
      path: '/api/reservations',
    });
    expect(body['timestamp']).toBeDefined();
  });

  it('should return 404 for NotFoundError', () => {
    const error = new NotFoundError('BASKET_NOT_FOUND', 'Basket not found');
    const { host, reply } = createMockHost('/api/baskets/123', 'GET');

    filter.catch(error, host);

    expect(reply.status).toHaveBeenCalledWith(404);
    const body = reply.status.mock.results[0]?.value.send.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      statusCode: 404,
      error: 'NotFoundError',
      code: 'BASKET_NOT_FOUND',
      message: 'Basket not found',
    });
  });

  it('should return 409 for ConflictError', () => {
    const error = new ConflictError(
      'RESERVATION_ALREADY_EXISTS',
      'User already has an active reservation',
    );
    const { host, reply } = createMockHost('/api/reservations', 'POST');

    filter.catch(error, host);

    expect(reply.status).toHaveBeenCalledWith(409);
    const body = reply.status.mock.results[0]?.value.send.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      statusCode: 409,
      error: 'ConflictError',
      code: 'RESERVATION_ALREADY_EXISTS',
    });
  });

  it('should return 403 for ForbiddenError', () => {
    const error = new ForbiddenError('STORE_NOT_OWNED', 'You do not own this store');
    const { host, reply } = createMockHost('/api/stores/456', 'PATCH');

    filter.catch(error, host);

    expect(reply.status).toHaveBeenCalledWith(403);
    const body = reply.status.mock.results[0]?.value.send.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      statusCode: 403,
      error: 'ForbiddenError',
      code: 'STORE_NOT_OWNED',
    });
  });

  it('should return 422 for ValidationError', () => {
    const error = new ValidationError(
      'INVALID_PICKUP_WINDOW',
      'Pickup end must be after pickup start',
    );
    const { host, reply } = createMockHost('/api/baskets', 'POST');

    filter.catch(error, host);

    expect(reply.status).toHaveBeenCalledWith(422);
    const body = reply.status.mock.results[0]?.value.send.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(body).toMatchObject({
      statusCode: 422,
      error: 'ValidationError',
      code: 'INVALID_PICKUP_WINDOW',
      message: 'Pickup end must be after pickup start',
    });
  });

  it('should include the request path in the response', () => {
    const error = new NotFoundError('STORE_NOT_FOUND', 'Store not found');
    const { host, reply } = createMockHost('/api/stores/some-id', 'GET');

    filter.catch(error, host);

    const body = reply.status.mock.results[0]?.value.send.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(body['path']).toBe('/api/stores/some-id');
  });

  it('should include a valid ISO timestamp', () => {
    const error = new BusinessRuleError('STORE_CLOSED', 'Store is currently closed');
    const { host, reply } = createMockHost('/api/baskets', 'POST');

    filter.catch(error, host);

    const body = reply.status.mock.results[0]?.value.send.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    const timestamp = body['timestamp'] as string;
    const date = new Date(timestamp);
    expect(date.toISOString()).toBe(timestamp);
  });
});
