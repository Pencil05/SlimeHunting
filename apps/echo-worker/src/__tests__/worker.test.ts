import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import type { DatabaseClient } from '@slime-hunter/database';
import type { RedisClient } from '@slime-hunter/event-bus';
vi.hoisted(() => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LOG_LEVEL', 'debug');
  vi.stubEnv('WEB_ORIGIN', 'http://localhost:3000');
  vi.stubEnv('API_HOST', '127.0.0.1');
  vi.stubEnv('API_PORT', '4000');
  vi.stubEnv('REALTIME_HOST', '127.0.0.1');
  vi.stubEnv('REALTIME_PORT', '4001');
  vi.stubEnv('VITE_API_URL', 'http://localhost:4000');
  vi.stubEnv('VITE_REALTIME_URL', 'ws://localhost:4001');
  vi.stubEnv('DATABASE_URL', 'postgresql://slime_hunter:slime_hunter@localhost:5432/slime_hunter');
  vi.stubEnv('REDIS_URL', 'redis://localhost:6379');
});

import { createEchoWorker, type WorkerAdapters } from '../worker.js';

const database = {} as DatabaseClient;
const redis = {} as RedisClient;

const healthyAdapters = (overrides: Partial<WorkerAdapters> = {}): WorkerAdapters => ({
  connectDatabase: vi.fn(async () => database),
  disconnectDatabase: vi.fn(async () => undefined),
  checkDatabaseHealth: vi.fn(async () => ({ ok: true as const })),
  connectRedis: vi.fn(async () => redis),
  disconnectRedis: vi.fn(async () => undefined),
  checkRedisHealth: vi.fn(async () => ({ ok: true as const })),
  ...overrides,
});

describe('echo-worker lifecycle', () => {
  it('starts and shuts down cleanly with healthy infrastructure', async () => {
    const adapters = healthyAdapters();
    const worker = createEchoWorker({ adapters, logger: pino({ enabled: false }) });

    await worker.start();
    await worker.start();
    expect(worker.isStarted()).toBe(true);

    await worker.stop();
    await worker.stop();
    expect(worker.isStarted()).toBe(false);
    expect(adapters.disconnectDatabase).toHaveBeenCalledTimes(1);
    expect(adapters.disconnectRedis).toHaveBeenCalledTimes(1);
  });

  it('fails safely and disconnects partially initialized infrastructure', async () => {
    const adapters = healthyAdapters({
      checkRedisHealth: vi.fn(async () => ({ ok: false, error: new Error('redis unavailable') })),
    });
    const worker = createEchoWorker({ adapters, logger: pino({ enabled: false }) });

    await expect(worker.start()).rejects.toThrow('echo-worker startup failed');
    expect(worker.isStarted()).toBe(false);
    expect(adapters.disconnectDatabase).toHaveBeenCalledTimes(1);
    expect(adapters.disconnectRedis).toHaveBeenCalledTimes(1);
  });
});
