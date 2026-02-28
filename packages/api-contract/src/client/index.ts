import createClient from 'openapi-fetch';
import type { paths } from '../generated/schema';

/**
 * Create a typed API client for BienBon.mu backend.
 *
 * @param baseUrl - The API base URL (e.g. 'http://localhost:3000')
 * @param token  - Optional Supabase JWT Bearer token
 */
export function createApiClient(baseUrl: string, token?: string) {
  return createClient<paths>({
    baseUrl,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
