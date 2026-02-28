import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public, bypassing JWT authentication.
 * Use this on endpoints like /health that should be accessible without auth.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
