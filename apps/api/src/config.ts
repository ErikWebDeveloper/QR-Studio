import path from 'node:path';
import { z } from 'zod';

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0', 'yes', 'no'])
  .default('true')
  .transform((value) => value === 'true' || value === '1' || value === 'yes');

const numberFromEnv = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);

const envSchema = z.object({
  APP_PORT: numberFromEnv(3000, 1, 65535),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('production'),
  API_KEY: z.string().max(256).default(''),
  MAX_BATCH_SIZE: numberFromEnv(500, 1, 10_000),
  BATCH_CONCURRENCY: numberFromEnv(4, 1, 32),
  STORAGE_PATH: z.string().default(path.resolve(process.cwd(), 'storage')),
  TEMP_PATH: z.string().default(path.resolve(process.cwd(), 'storage/temp')),
  RATE_LIMIT_ENABLED: booleanFromEnv,
  RATE_LIMIT_MAX: numberFromEnv(120, 1, 100_000),
  RATE_LIMIT_WINDOW: z.string().max(32).default('1 minute'),
  CORS_ORIGIN: z.string().default('*'),
  JOB_TTL_MINUTES: numberFromEnv(60, 1, 10_080),
  MAX_PAYLOAD: z.string().max(32).default('12mb'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
