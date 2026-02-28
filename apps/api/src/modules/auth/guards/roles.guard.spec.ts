import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '@bienbon/shared-types';
import type { AuthUser } from '../interfaces/auth-user.interface';

function createMockExecutionContext(user?: AuthUser): ExecutionContext {
  const request = { user };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => () => undefined,
    getClass: () => class TestController {},
    getType: () => 'http' as const,
    getArgs: () => [],
    getArgByIndex: () => undefined,
    switchToRpc: () => ({ getContext: () => ({}), getData: () => ({}) }),
    switchToWs: () => ({ getClient: () => ({}), getData: () => ({}), getPattern: () => '' }),
  } as unknown as ExecutionContext;
}

function createAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user-123',
    supabaseId: 'user-123',
    email: 'test@bienbon.mu',
    roles: [Role.CONSUMER],
    ...overrides,
  };
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, Reflector],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('no @Roles() decorator', () => {
    it('should allow access when no roles are required', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const user = createAuthUser();
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when roles array is empty', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const user = createAuthUser();
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('user with correct role', () => {
    it('should allow access when user has the required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const user = createAuthUser({ roles: [Role.ADMIN] });
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has one of multiple required roles', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Role.ADMIN,
        Role.SUPER_ADMIN,
      ]);

      const user = createAuthUser({ roles: [Role.SUPER_ADMIN] });
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has multiple roles including a required one', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.PARTNER]);

      const user = createAuthUser({
        roles: [Role.CONSUMER, Role.PARTNER],
      });
      const context = createMockExecutionContext(user);

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('user without required role', () => {
    it('should throw ForbiddenException when user lacks the required role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const user = createAuthUser({ roles: [Role.CONSUMER] });
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions',
      );
    });

    it('should throw ForbiddenException when user has no roles at all', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        Role.ADMIN,
        Role.SUPER_ADMIN,
      ]);

      const user = createAuthUser({ roles: [] });
      const context = createMockExecutionContext(user);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('no user on request', () => {
    it('should throw ForbiddenException when no user is attached to request', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);

      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'No user found on request',
      );
    });
  });
});
