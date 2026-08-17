import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { config, type Config } from '@slime-hunter/config';
import {
  checkDatabaseHealth,
  createDatabase,
  disconnectDatabase,
  type DatabaseClient,
} from '@slime-hunter/database';
import {
  checkRedisHealth,
  createRedisClient,
  disconnectRedis,
  type RedisClient,
} from '@slime-hunter/event-bus';
import { registerHealthRoutes } from './routes/health.js';
import { registerReadyRoutes } from './routes/ready.js';

export interface AppInfrastructure {
  database: DatabaseClient;
  redis: RedisClient;
}

export interface AppDependencies {
  config?: Config;
  infrastructure?: AppInfrastructure;
  checkDatabase?: typeof checkDatabaseHealth;
  checkRedis?: typeof checkRedisHealth;
  closeDatabase?: typeof disconnectDatabase;
  closeRedis?: typeof disconnectRedis;
  logger?: FastifyServerOptions['logger'];
}

export type ApiApp = FastifyInstance;

export const buildApp = (dependencies: AppDependencies = {}): ApiApp => {
  const runtimeConfig = dependencies.config ?? config;
  const infrastructure = dependencies.infrastructure ?? {
    database: createDatabase(runtimeConfig.DATABASE_URL),
    redis: createRedisClient(runtimeConfig.REDIS_URL),
  };
  const checkDatabase = dependencies.checkDatabase ?? checkDatabaseHealth;
  const checkRedis = dependencies.checkRedis ?? checkRedisHealth;
  const closeDatabase = dependencies.closeDatabase ?? disconnectDatabase;
  const closeRedis = dependencies.closeRedis ?? disconnectRedis;

  const logger: FastifyServerOptions['logger'] = {
    level: runtimeConfig.LOG_LEVEL,
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        '*.password',
        '*.token',
        '*.secret',
      ],
      censor: '[REDACTED]',
    },
  };
  const app = Fastify({ logger: dependencies.logger ?? logger });

  registerHealthRoutes(app);
  registerReadyRoutes(app, {
    database: infrastructure.database,
    redis: infrastructure.redis,
    checkDatabase,
    checkRedis,
  });

  app.addHook('onClose', async () => {
    await Promise.all([closeDatabase(infrastructure.database), closeRedis(infrastructure.redis)]);
  });

  return app;
};
