import { describe, expect, it, vi } from 'vitest';
import type { Config } from '@slime-hunter/config';
import type { DatabaseClient, DatabaseHealth } from '@slime-hunter/database';
import type { RedisClient, RedisHealth } from '@slime-hunter/event-bus';
import type { AppDependencies } from '../app.js';

vi.stubEnv('NODE_ENV', 'test');
vi.stubEnv('LOG_LEVEL', 'debug');
vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
vi.stubEnv('API_HOST', '127.0.0.1');
vi.stubEnv('API_PORT', '4000');
vi.stubEnv('REALTIME_HOST', '127.0.0.1');
vi.stubEnv('REALTIME_PORT', '4001');
vi.stubEnv('VITE_API_URL', 'http://localhost:4000');
vi.stubEnv('VITE_REALTIME_URL', 'ws://localhost:4001');
vi.stubEnv('DATABASE_URL', 'postgresql://slime_hunter:super-secret@localhost:5432/slime_hunter');
vi.stubEnv('REDIS_URL', 'redis://:super-secret@localhost:6379');

const { buildApp } = await import('../app.js');

const testConfig = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  WEB_ORIGIN: 'http://localhost:3000',
  API_HOST: '127.0.0.1',
  API_PORT: 4000,
  REALTIME_HOST: '127.0.0.1',
  REALTIME_PORT: 4001,
  VITE_API_URL: 'http://localhost:4000',
  VITE_REALTIME_URL: 'ws://localhost:4001',
  DATABASE_URL: 'postgresql://slime_hunter:super-secret@localhost:5432/slime_hunter',
  REDIS_URL: 'redis://:super-secret@localhost:6379',
} as Config;

const createDependencies = (
  databaseHealth: DatabaseHealth = { ok: true },
  redisHealth: RedisHealth = { ok: true },
): AppDependencies => ({
  config: testConfig,
  infrastructure: {
    database: {} as DatabaseClient,
    redis: {} as RedisClient,
  },
  checkDatabase: vi.fn().mockResolvedValue(databaseHealth),
  checkRedis: vi.fn().mockResolvedValue(redisHealth),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
  closeRedis: vi.fn().mockResolvedValue(undefined),
  logger: false,
});

describe('API smoke', () => {
  it('returns 200 from /health', async () => {
    const app = buildApp(createDependencies());

    try {
      const response = await app.inject({ method: 'GET', url: '/health' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    } finally {
      await app.close();
    }
  });

  it('returns 200 from /ready when DB and Redis are healthy', async () => {
    const dependencies = createDependencies();
    const app = buildApp(dependencies);

    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        status: 'ready',
        dependencies: { database: 'ok', redis: 'ok' },
      });
    } finally {
      await app.close();
    }
  });

  it('returns 503 from /ready when the database is unavailable', async () => {
    const app = buildApp(createDependencies({ ok: false, error: new Error('database secret') }));

    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        status: 'not_ready',
        dependencies: { database: 'unavailable', redis: 'ok' },
      });
    } finally {
      await app.close();
    }
  });

  it('returns 503 from /ready when Redis is unavailable', async () => {
    const app = buildApp(
      createDependencies({ ok: true }, { ok: false, error: new Error('redis secret') }),
    );

    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        status: 'not_ready',
        dependencies: { database: 'ok', redis: 'unavailable' },
      });
    } finally {
      await app.close();
    }
  });

  it('does not expose infrastructure secrets in response bodies', async () => {
    const app = buildApp(
      createDependencies(
        { ok: false, error: new Error('super-secret') },
        { ok: false, error: new Error('super-secret') },
      ),
    );

    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });

      expect(response.statusCode).toBe(503);
      expect(response.body).not.toContain('super-secret');
      expect(response.body).not.toContain('DATABASE_URL');
      expect(response.body).not.toContain('REDIS_URL');
    } finally {
      await app.close();
    }
  });

  it('closes both infrastructure clients during Fastify shutdown', async () => {
    const dependencies = createDependencies();
    const app = buildApp(dependencies);

    await app.close();

    expect(dependencies.closeDatabase).toHaveBeenCalledOnce();
    expect(dependencies.closeRedis).toHaveBeenCalledOnce();
  });
});
