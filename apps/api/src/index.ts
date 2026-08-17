import { pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { config } from '@slime-hunter/config';
import { buildApp } from './app.js';

export const registerShutdownHandlers = (
  app: FastifyInstance,
  signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'],
): (() => void) => {
  const handler = async (signal: NodeJS.Signals): Promise<void> => {
    app.log.info({ signal }, 'shutdown requested');

    try {
      await app.close();
    } catch (error) {
      app.log.error({ err: error }, 'shutdown failed');
      process.exitCode = 1;
    }
  };

  for (const signal of signals) {
    process.once(signal, handler);
  }

  return () => {
    for (const signal of signals) {
      process.off(signal, handler);
    }
  };
};

export const startServer = async (): Promise<FastifyInstance> => {
  const app = buildApp();
  const removeShutdownHandlers = registerShutdownHandlers(app);

  try {
    await app.listen({ host: config.API_HOST, port: config.API_PORT });
    app.log.info({ host: config.API_HOST, port: config.API_PORT }, 'API server listening');
    return app;
  } catch (error) {
    removeShutdownHandlers();
    await app.close();
    throw error;
  }
};

const isMainModule = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMainModule) {
  startServer().catch((error: unknown) => {
    console.error('API server failed to start', error);
    process.exitCode = 1;
  });
}
