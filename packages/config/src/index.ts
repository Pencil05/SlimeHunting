import { z } from 'zod';

const requiredString = z.preprocess(
  (value) => value ?? '',
  z.string().trim().min(1, 'is required'),
);
const requiredUrl = z.preprocess(
  (value) => value ?? '',
  z.string().trim().min(1, 'is required').url('must be a valid URL'),
);
const requiredPort = z.coerce
  .number()
  .int('must be an integer')
  .min(1, 'must be at least 1')
  .max(65535, 'must be at most 65535');

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production'], {
    error: 'must be one of development, test, or production',
  }),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error'], {
    error: 'must be one of debug, info, warn, or error',
  }),
  WEB_ORIGIN: requiredUrl,
  API_HOST: requiredString,
  API_PORT: requiredPort,
  REALTIME_HOST: requiredString,
  REALTIME_PORT: requiredPort,
  VITE_API_URL: requiredUrl,
  VITE_REALTIME_URL: requiredUrl,
  DATABASE_URL: requiredUrl,
  REDIS_URL: requiredUrl,
});

export type Config = z.infer<typeof configSchema>;
export type ConfigEnv = Readonly<Record<string, string | undefined>>;

const runtimeEnvironment = (): ConfigEnv => {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: ConfigEnv };
  };

  return runtime.process?.env ?? {};
};

export const parseConfig = (environment: ConfigEnv): Config => {
  const result = configSchema.safeParse(environment);

  if (result.success) {
    return result.data;
  }

  const details = result.error.issues
    .map((issue) => `${issue.path.join('.') || 'configuration'}: ${issue.message}`)
    .join('\n');

  throw new Error(`Invalid configuration:\n${details}`, { cause: result.error });
};

export const config = parseConfig(runtimeEnvironment());
