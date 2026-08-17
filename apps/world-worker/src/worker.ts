import pino, { type Logger } from 'pino';
import {
  checkDatabaseHealth,
  connectDatabase,
  disconnectDatabase,
  type DatabaseClient,
  type DatabaseHealth,
} from '@slime-hunter/database';
import {
  checkRedisHealth,
  connectRedis,
  disconnectRedis,
  type RedisClient,
  type RedisHealth,
} from '@slime-hunter/event-bus';
import { config, type Config } from '@slime-hunter/config';

export interface WorkerAdapters {
  connectDatabase: () => Promise<DatabaseClient>;
  disconnectDatabase: (client: DatabaseClient) => Promise<void>;
  checkDatabaseHealth: (client: DatabaseClient) => Promise<DatabaseHealth>;
  connectRedis: () => Promise<RedisClient>;
  disconnectRedis: (client: RedisClient) => Promise<void>;
  checkRedisHealth: (client: RedisClient) => Promise<RedisHealth>;
}

export interface WorkerOptions {
  config?: Config;
  logger?: Logger;
  adapters?: Partial<WorkerAdapters>;
}

export interface Worker {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  isStarted(): boolean;
}

const defaultAdapters: WorkerAdapters = {
  connectDatabase: async () => connectDatabase(),
  disconnectDatabase,
  checkDatabaseHealth,
  connectRedis: () => connectRedis(),
  disconnectRedis,
  checkRedisHealth,
};

const safeErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted]')
      .replace(/redis:\/\/[^\s]+/gi, '[redacted]');
  }
  return 'unknown infrastructure error';
};

export const createWorldWorker = (options: WorkerOptions = {}): Worker => {
  const workerName = 'world-worker';
  const workerConfig = options.config ?? config;
  const logger = options.logger ?? pino({ level: workerConfig.LOG_LEVEL });
  const adapters = { ...defaultAdapters, ...options.adapters };
  let database: DatabaseClient | undefined;
  let redis: RedisClient | undefined;
  let started = false;

  return {
    name: workerName,
    isStarted: () => started,
    start: async () => {
      if (started) return;
      logger.info({ worker: workerName, environment: workerConfig.NODE_ENV }, 'worker starting');
      try {
        database = await adapters.connectDatabase();
        redis = await adapters.connectRedis();
        const [databaseHealth, redisHealth] = await Promise.all([
          adapters.checkDatabaseHealth(database),
          adapters.checkRedisHealth(redis),
        ]);
        if (!databaseHealth.ok || !redisHealth.ok) {
          throw new Error('required infrastructure health check failed');
        }
        started = true;
        logger.info({ worker: workerName }, 'worker started');
      } catch (error) {
        await Promise.allSettled([
          redis ? adapters.disconnectRedis(redis) : Promise.resolve(),
          database ? adapters.disconnectDatabase(database) : Promise.resolve(),
        ]);
        redis = undefined;
        database = undefined;
        logger.error(
          { worker: workerName, error: safeErrorMessage(error) },
          'worker startup failed',
        );
        throw new Error(`${workerName} startup failed`, { cause: error });
      }
    },
    stop: async () => {
      if (!started && !database && !redis) return;
      logger.info({ worker: workerName }, 'worker stopping');
      const activeRedis = redis;
      const activeDatabase = database;
      redis = undefined;
      database = undefined;
      started = false;
      await Promise.all([
        activeRedis ? adapters.disconnectRedis(activeRedis) : Promise.resolve(),
        activeDatabase ? adapters.disconnectDatabase(activeDatabase) : Promise.resolve(),
      ]);
      logger.info({ worker: workerName }, 'worker stopped');
    },
  };
};
