import { SetMetadata } from '@nestjs/common';
import type { Role } from '@bienbon/shared-types';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users with specific roles.
 * If no @Roles() decorator is applied, any authenticated user can access the route.
 *
 * @example
 * ```typescript
 * @Roles(Role.ADMIN, Role.SUPER_ADMIN)
 * @Get('admin/dashboard')
 * getDashboard() { ... }
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
