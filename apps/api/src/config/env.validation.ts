import { z } from 'zod';
import { Logger } from '@nestjs/common';

const logger = new Logger('EnvValidation');

const PLACEHOLDER_PATTERNS = [
  /^your-/i,
  /^placeholder/i,
  /^https:\/\/your-project/i,
];

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test', 'staging'])
    .default('development'),

  PORT: z.coerce.number().int().positive().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),

  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),

  JWT_SECRET: z.string().optional(),

  CORS_ORIGINS: z.string().optional(),

  REDIS_URL: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates environment variables using the Zod schema.
 * In development mode, placeholder values are accepted with warnings.
 * In production, placeholder values cause a hard failure.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  ${field}: ${String(messages?.join(', '))}`)
      .join('\n');
    throw new Error(
      `Environment validation failed:\n${errorMessages}`,
    );
  }

  const parsed = result.data;
  const isProduction = parsed.NODE_ENV === 'production';

  // Check for placeholder values
  const supabaseFields: Array<{ key: string; value: string }> = [
    { key: 'SUPABASE_URL', value: parsed.SUPABASE_URL },
    { key: 'SUPABASE_ANON_KEY', value: parsed.SUPABASE_ANON_KEY },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: parsed.SUPABASE_SERVICE_ROLE_KEY },
  ];

  for (const field of supabaseFields) {
    if (isPlaceholder(field.value)) {
      if (isProduction) {
        throw new Error(
          `Placeholder value detected for ${field.key} in production. Set real credentials.`,
        );
      }
      logger.warn(
        `${field.key} contains a placeholder value. Auth features will not work until real credentials are set.`,
      );
    }
  }

  return parsed as unknown as Record<string, unknown>;
}
