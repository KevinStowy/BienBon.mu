import { Module, Global } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * Global authentication module.
 *
 * Registers JwtAuthGuard and RolesGuard as global guards (APP_GUARD).
 * JwtAuthGuard runs first to verify the JWT token, then RolesGuard
 * checks if the user has the required roles.
 *
 * Routes decorated with @Public() bypass authentication entirely.
 * Routes without @Roles() allow any authenticated user.
 */
@Global()
@Module({
  providers: [
    JwtAuthGuard,
    RolesGuard,
    {
      provide: APP_GUARD,
      useExisting: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: RolesGuard,
    },
  ],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
