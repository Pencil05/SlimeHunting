import pino from 'pino';
import { config } from '@slime-hunter/config';
import { createWorldWorker } from './worker.js';

const logger = pino({ level: config.LOG_LEVEL });
const worker = createWorldWorker({ config, logger });
let stopping = false;

const shutdown = async (signal: string): Promise<void> => {
  if (stopping) return;
  stopping = true;
  logger.info({ worker: worker.name, signal }, 'shutdown signal received');
  try {
    await worker.stop();
    logger.info({ worker: worker.name }, 'shutdown complete');
    process.exitCode = 0;
  } catch (error) {
    logger.error(
      { worker: worker.name, error: error instanceof Error ? error.message : 'unknown error' },
      'shutdown failed',
    );
    process.exitCode = 1;
  }
};

process.once('SIGINT', () => void shutdown('SIGINT'));
process.once('SIGTERM', () => void shutdown('SIGTERM'));

try {
  await worker.start();
} catch {
  process.exitCode = 1;
}
