import type { FastifyInstance } from 'fastify';
import {
  type DatabaseClient,
  type DatabaseHealth,
} from '@slime-hunter/database';
import {
  type RedisClient,
  type RedisHealth,
} from '@slime-hunter/event-bus';

interface ReadyDependencies {
  database: DatabaseClient;
  redis: RedisClient;
  checkDatabase: (database: DatabaseClient) => Promise<DatabaseHealth>;
  checkRedis: (redis: RedisClient) => Promise<RedisHealth>;
}

export const registerReadyRoutes = (
  app: FastifyInstance,
  dependencies: ReadyDependencies,
): void => {
  app.get('/ready', async (_request, reply) => {
    const [database, redis] = await Promise.all([
      dependencies.checkDatabase(dependencies.database),
      dependencies.checkRedis(dependencies.redis),
    ]);
    const ready = database.ok && redis.ok;

    if (!ready) {
      return reply.code(503).send({
        status: 'not_ready',
        dependencies: {
          database: database.ok ? 'ok' : 'unavailable',
          redis: redis.ok ? 'ok' : 'unavailable',
        },
      });
    }

    return reply.send({
      status: 'ready',
      dependencies: {
        database: 'ok',
        redis: 'ok',
      },
    });
  });
};
