import type { Role } from '@bienbon/shared-types';

/**
 * Represents the authenticated user object attached to the request
 * after JWT verification by the JwtAuthGuard.
 */
export interface AuthUser {
  /** Internal user ID (maps to the `users` table primary key) */
  id: string;

  /** Supabase Auth user ID */
  supabaseId: string;

  /** User's email address */
  email: string;

  /** User's phone number (optional) */
  phone?: string;

  /** User's RBAC roles */
  roles: Role[];
}
