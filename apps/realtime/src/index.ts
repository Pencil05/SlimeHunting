import { pathToFileURL } from 'node:url';
import type { RealtimeServer } from './server.js';
import { createRealtimeServer } from './server.js';

export const registerShutdownHandlers = (
  realtime: RealtimeServer,
  signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'],
): (() => void) => {
  const handler = async (signal: NodeJS.Signals): Promise<void> => {
    console.info({ signal }, 'realtime shutdown requested');
    try {
      await realtime.shutdown();
    } catch (error) {
      console.error('realtime shutdown failed', error);
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

export const startServer = async (): Promise<RealtimeServer> => {
  const realtime = createRealtimeServer();
  const removeShutdownHandlers = registerShutdownHandlers(realtime);

  try {
    await realtime.start();
    return realtime;
  } catch (error) {
    removeShutdownHandlers();
    await realtime.shutdown();
    throw error;
  }
};

const isMainModule = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isMainModule) {
  startServer().catch((error: unknown) => {
    console.error('realtime server failed to start', error);
    process.exitCode = 1;
  });
}
