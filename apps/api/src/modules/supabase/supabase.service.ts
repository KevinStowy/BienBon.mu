import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;
  private adminClient: SupabaseClient | null = null;
  private readonly supabaseUrl: string;
  private readonly supabaseAnonKey: string;
  private readonly supabaseServiceRoleKey: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL', '');
    this.supabaseAnonKey = this.configService.get<string>(
      'SUPABASE_ANON_KEY',
      '',
    );
    this.supabaseServiceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
      '',
    );

    this.isConfigured = this.checkConfiguration();
  }

  private checkConfiguration(): boolean {
    const placeholderPatterns = [/^your-/i, /^placeholder/i, /^https:\/\/your-project/i];

    const hasPlaceholder = [
      this.supabaseUrl,
      this.supabaseAnonKey,
      this.supabaseServiceRoleKey,
    ].some((val) => placeholderPatterns.some((pattern) => pattern.test(val)));

    if (hasPlaceholder) {
      this.logger.warn(
        'Supabase is not configured with real credentials. Auth features are disabled.',
      );
      return false;
    }

    return true;
  }

  /**
   * Returns a Supabase client using the anon key.
   * Suitable for operations on behalf of an authenticated user.
   */
  getClient(): SupabaseClient {
    if (!this.isConfigured) {
      this.logger.warn(
        'Supabase client requested but credentials are placeholders.',
      );
    }

    if (!this.client) {
      this.client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    return this.client;
  }

  /**
   * Returns a Supabase client using the service role key.
   * Has admin privileges -- use with caution.
   */
  getAdminClient(): SupabaseClient {
    if (!this.isConfigured) {
      this.logger.warn(
        'Supabase admin client requested but credentials are placeholders.',
      );
    }

    if (!this.adminClient) {
      this.adminClient = createClient(
        this.supabaseUrl,
        this.supabaseServiceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );
    }

    return this.adminClient;
  }

  /**
   * Whether Supabase is configured with real (non-placeholder) credentials.
   */
  isReady(): boolean {
    return this.isConfigured;
  }
}
