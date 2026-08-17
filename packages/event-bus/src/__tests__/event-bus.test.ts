import { describe, expect, it, vi } from 'vitest';
import type { RedisClient } from '../index.js';

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

const {
  checkRedisHealth,
  consumeEvents,
  createEvent,
  deserializeEvent,
  publishEvent,
  serializeEvent,
  streamKey,
  validateEvent,
} = await import('../index.js');

describe('event bus baseline', () => {
  it('creates, validates, serializes, and deserializes a typed event envelope', () => {
    const event = createEvent('slime.spawned', { slimeId: 'slime-1' }, { source: 'test' });
    const roundTripped = deserializeEvent<{ slimeId: string }>(serializeEvent(event));

    expect(event.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(event.type).toBe('slime.spawned');
    expect(event.timestamp).toBeGreaterThan(0);
    expect(roundTripped).toEqual(event);
    expect(validateEvent(roundTripped)).toEqual(event);
  });

  it('rejects malformed event envelopes with clear errors', () => {
    expect(() =>
      validateEvent({ type: 'missing-id', timestamp: Date.now(), payload: {} }),
    ).toThrowError('Invalid event envelope: id is required');
    expect(() => deserializeEvent('{not-json')).toThrowError(
      'Invalid event envelope: payload is not valid JSON',
    );
  });

  it('uses the project stream key convention and validates names', () => {
    expect(streamKey('world-events')).toBe('slime-hunter:stream:world-events');
    expect(streamKey('world_events:v1')).toBe('slime-hunter:stream:world_events:v1');
    expect(() => streamKey('')).toThrowError('Stream name is required');
    expect(() => streamKey('world events')).toThrowError(/may contain only/);
  });

  it('publishes and consumes a Redis Stream event through the adapter contract', async () => {
    const xadd = vi.fn().mockResolvedValue('1710000000000-0');
    const xread = vi.fn();
    const client = { xadd, xread } as unknown as RedisClient;
    const event = createEvent('world.tick', { tick: 1 });
    xread.mockResolvedValue([
      [streamKey('world-events'), [['1710000000000-0', ['event', serializeEvent(event)]]]],
    ]);

    await expect(publishEvent(client, 'world-events', event)).resolves.toBe('1710000000000-0');
    await expect(consumeEvents(client, 'world-events', { count: 1 })).resolves.toEqual([
      { id: '1710000000000-0', event },
    ]);
    expect(xadd).toHaveBeenCalledWith(
      'slime-hunter:stream:world-events',
      '*',
      'event',
      serializeEvent(event),
    );
    expect(xread).toHaveBeenCalledWith(
      'COUNT',
      1,
      'STREAMS',
      'slime-hunter:stream:world-events',
      '0-0',
    );
  });

  it('returns a graceful health result when Redis is unavailable', async () => {
    const failure = new Error('connection refused');
    const client = {
      ping: vi.fn().mockRejectedValue(failure),
    } as unknown as RedisClient;

    await expect(checkRedisHealth(client)).resolves.toEqual({ ok: false, error: failure });
  });
});
