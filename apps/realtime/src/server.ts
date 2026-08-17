import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { config, type Config } from '@slime-hunter/config';
import { FoundationRoom } from './rooms/FoundationRoom.js';

export interface RealtimeServerOptions {
  config?: Config;
  logger?: Pick<Console, 'info' | 'error'>;
}

export interface RealtimeServer {
  server: Server;
  start: () => Promise<void>;
  shutdown: () => Promise<void>;
}

export const createRealtimeServer = (options: RealtimeServerOptions = {}): RealtimeServer => {
  const runtimeConfig = options.config ?? config;
  const logger = options.logger ?? console;
  const server = new Server({
    transport: new WebSocketTransport(),
  });

  server.define('foundation_room', FoundationRoom);

  return {
    server,
    start: async () => {
      await server.listen(runtimeConfig.REALTIME_PORT, runtimeConfig.REALTIME_HOST);
      logger.info(
        `realtime server listening on ${runtimeConfig.REALTIME_HOST}:${runtimeConfig.REALTIME_PORT}`,
      );
    },
    shutdown: async () => {
      await server.gracefullyShutdown(false);
      logger.info('realtime server shut down');
    },
  };
};
