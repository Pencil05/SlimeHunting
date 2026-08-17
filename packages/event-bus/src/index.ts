import { randomUUID } from 'node:crypto';
import { Redis as RedisConstructor, type Redis as RedisClientType } from 'ioredis';
import { config } from '@slime-hunter/config';

export interface EventEnvelope<T = unknown> {
  id: string;
  type: string;
  timestamp: number;
  payload: T;
  metadata?: Record<string, unknown>;
}

export interface ConsumedEvent<T = unknown> {
  id: string;
  event: EventEnvelope<T>;
}

export type RedisClient = RedisClientType;

export type RedisHealth =
  | { ok: true }
  | { ok: false; error: unknown };

export interface ConsumeOptions {
  lastId?: string;
  count?: number;
  blockMs?: number;
}

export const streamKey = (name: string): string => {
  const normalized = name.trim();

  if (!normalized) {
    throw new Error('Stream name is required');
  }

  if (!/^[a-zA-Z0-9:_-]+$/.test(normalized)) {
    throw new Error('Stream name may contain only letters, numbers, colon, underscore, and hyphen');
  }

  return `slime-hunter:stream:${normalized}`;
};

export const createEvent = <T>(
  type: string,
  payload: T,
  metadata?: Record<string, unknown>,
): EventEnvelope<T> => {
  const normalizedType = type.trim();

  if (!normalizedType) {
    throw new Error('Event type is required');
  }

  const event: EventEnvelope<T> = {
    id: randomUUID(),
    type: normalizedType,
    timestamp: Date.now(),
    payload,
  };

  if (metadata !== undefined) {
    event.metadata = metadata;
  }

  return event;
};

export const validateEvent = <T>(value: unknown): EventEnvelope<T> => {
  if (typeof value !== 'object' || value === null) {
    throw new Error('Invalid event envelope: expected an object');
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== 'string' || candidate.id.length === 0) {
    throw new Error('Invalid event envelope: id is required');
  }
  if (typeof candidate.type !== 'string' || candidate.type.length === 0) {
    throw new Error('Invalid event envelope: type is required');
  }
  if (typeof candidate.timestamp !== 'number' || !Number.isFinite(candidate.timestamp)) {
    throw new Error('Invalid event envelope: timestamp must be a finite number');
  }
  if ('metadata' in candidate && candidate.metadata !== undefined) {
    if (typeof candidate.metadata !== 'object' || candidate.metadata === null || Array.isArray(candidate.metadata)) {
      throw new Error('Invalid event envelope: metadata must be an object');
    }
  }

  return candidate as unknown as EventEnvelope<T>;
};

export const serializeEvent = <T>(event: EventEnvelope<T>): string => {
  return JSON.stringify(validateEvent(event));
};

export const deserializeEvent = <T>(serialized: string): EventEnvelope<T> => {
  try {
    return validateEvent<T>(JSON.parse(serialized) as unknown);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid event envelope: payload is not valid JSON', { cause: error });
    }
    throw error;
  }
};

export const createRedisClient = (url = config.REDIS_URL): RedisClient => {
  return new RedisConstructor(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
};

export const connectRedis = async (url = config.REDIS_URL): Promise<RedisClient> => {
  const client = createRedisClient(url);

  try {
    await client.connect();
    return client;
  } catch (error) {
    client.disconnect();
    throw new Error('Redis connection failed', { cause: error });
  }
};

export const disconnectRedis = async (client: RedisClient): Promise<void> => {
  if (client.status === 'end') {
    return;
  }

  await client.quit();
};

export const checkRedisHealth = async (client: RedisClient): Promise<RedisHealth> => {
  try {
    await client.ping();
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

export const publishEvent = async <T>(
  client: RedisClient,
  stream: string,
  event: EventEnvelope<T>,
): Promise<string> => {
  const id = await client.xadd(streamKey(stream), '*', 'event', serializeEvent(event));

  if (id === null) {
    throw new Error('Redis did not return a stream entry ID');
  }

  return id;
};

export const consumeEvents = async <T>(
  client: RedisClient,
  stream: string,
  options: ConsumeOptions = {},
): Promise<ConsumedEvent<T>[]> => {
  const key = streamKey(stream);
  const lastId = options.lastId ?? '0-0';
  const count = options.count ?? 10;
  const result = options.blockMs === undefined
    ? await client.xread('COUNT', count, 'STREAMS', key, lastId)
    : await client.xread('COUNT', count, 'BLOCK', options.blockMs, 'STREAMS', key, lastId);

  if (!result) {
    return [];
  }

  const records: ConsumedEvent<T>[] = [];
  for (const [, entries] of result) {
    for (const [id, fields] of entries) {
      const eventIndex = fields.indexOf('event');
      const serialized = eventIndex >= 0 ? fields[eventIndex + 1] : undefined;
      if (serialized === undefined) {
        throw new Error(`Invalid Redis stream entry ${id}: event field is missing`);
      }
      records.push({
        id,
        event: deserializeEvent<T>(serialized),
      });
    }
  }

  return records;
};
