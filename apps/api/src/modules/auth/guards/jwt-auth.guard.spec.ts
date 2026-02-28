import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseService } from '../../supabase/supabase.service';
import { Role } from '@bienbon/shared-types';

function createMockExecutionContext(overrides: {
  headers?: Record<string, string | undefined>;
  isPublic?: boolean;
  handler?: () => void;
  classRef?: new () => unknown;
}): ExecutionContext {
  const request = {
    headers: overrides.headers ?? {},
    user: undefined,
  };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => overrides.handler ?? (() => undefined),
    getClass: () => overrides.classRef ?? class TestController {},
    getType: () => 'http' as const,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getContext: () => ({}), getData: () => ({}) }),
    switchToWs: () => ({ getClient: () => ({}), getData: () => ({}), getPattern: () => '' }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let supabaseService: SupabaseService;

  const mockGetUser = vi.fn();

  beforeEach(async () => {
    mockGetUser.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        Reflector,
        {
          provide: SupabaseService,
          useValue: {
            isReady: vi.fn().mockReturnValue(true),
            getClient: vi.fn().mockReturnValue({
              auth: {
                getUser: mockGetUser,
              },
            }),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('public routes', () => {
    it('should allow access to routes decorated with @Public()', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

      const context = createMockExecutionContext({ isPublic: true });
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockGetUser).not.toHaveBeenCalled();
    });
  });

  describe('missing token', () => {
    it('should throw UnauthorizedException when no Authorization header is present', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext({ headers: {} });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Missing authorization token',
      );
    });

    it('should throw UnauthorizedException when Authorization header has wrong scheme', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const context = createMockExecutionContext({
        headers: { authorization: 'Basic some-token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('valid token', () => {
    it('should allow access and attach user to request with valid token', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockUser = {
        id: 'user-123',
        email: 'test@bienbon.mu',
        phone: '+23057000000',
        user_metadata: {
          roles: [Role.CONSUMER],
        },
      };

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer valid-token-123' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);

      const request = context.switchToHttp().getRequest<{ user: unknown }>();
      expect(request.user).toEqual({
        id: 'user-123',
        supabaseId: 'user-123',
        email: 'test@bienbon.mu',
        phone: '+23057000000',
        roles: [Role.CONSUMER],
      });

      expect(mockGetUser).toHaveBeenCalledWith('valid-token-123');
    });

    it('should default to CONSUMER role when no roles in metadata', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      const mockUser = {
        id: 'user-456',
        email: 'noroles@bienbon.mu',
        user_metadata: {},
      };

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer valid-token-456' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);

      const request = context.switchToHttp().getRequest<{ user: { roles: Role[] } }>();
      expect(request.user.roles).toEqual([Role.CONSUMER]);
    });
  });

  describe('invalid token', () => {
    it('should throw UnauthorizedException when Supabase returns an error', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer invalid-token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should throw UnauthorizedException when Supabase returns no user', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer expired-token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('supabase not configured', () => {
    it('should throw UnauthorizedException when Supabase is not ready', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
      vi.spyOn(supabaseService, 'isReady').mockReturnValue(false);

      const context = createMockExecutionContext({
        headers: { authorization: 'Bearer some-token' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Authentication service is not configured',
      );
    });
  });
});
