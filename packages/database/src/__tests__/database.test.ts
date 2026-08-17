import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { DatabaseClient } from '../index.js';

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

const { checkDatabaseHealth, discoverMigrations, parseDatabaseUrl, runMigrations } = await import('../index.js');

describe('database baseline', () => {
  it('parses PostgreSQL DATABASE_URL values', () => {
    const parsed = parseDatabaseUrl(
      'postgresql://slime_hunter:secret@db.example.test:5432/slime_hunter?sslmode=require',
    );

    expect(parsed.protocol).toBe('postgresql:');
    expect(parsed.hostname).toBe('db.example.test');
    expect(parsed.port).toBe('5432');
    expect(parsed.pathname).toBe('/slime_hunter');
  });

  it('rejects non-PostgreSQL connection URLs clearly', () => {
    expect(() => parseDatabaseUrl('https://example.test/database')).toThrowError(
      'Invalid DATABASE_URL: protocol must be postgresql: or postgres:',
    );
  });

  it('discovers numbered SQL migrations in deterministic order', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'slime-hunter-migrations-'));

    try {
      await writeFile(join(directory, '002_second.sql'), 'SELECT 2;');
      await writeFile(join(directory, '001_first.sql'), 'SELECT 1;');
      await writeFile(join(directory, 'README.md'), 'not a migration');

      const migrations = await discoverMigrations(directory);

      expect(migrations.map((migration) => migration.name)).toEqual([
        '001_first.sql',
        '002_second.sql',
      ]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('runs unapplied migrations and records the proof migration', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'slime-hunter-runner-'));
    const transactionUnsafe = vi.fn().mockResolvedValue(undefined);
    const database = {
      unsafe: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      begin: vi.fn(async (callback: (transaction: { unsafe: typeof transactionUnsafe }) => Promise<void>) =>
        callback({ unsafe: transactionUnsafe }),
      ),
    } as unknown as DatabaseClient;

    try {
      await writeFile(join(directory, '001_proof.sql'), 'CREATE TABLE proof (id INTEGER);');

      const applied = await runMigrations(database, directory);

      expect(applied).toEqual(['001_proof.sql']);
      expect(database.unsafe).toHaveBeenCalledTimes(2);
      expect(transactionUnsafe).toHaveBeenCalledTimes(2);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('returns a graceful health result when the connection fails', async () => {
    const failure = new Error('connection refused');
    const failingDatabase = (async () => {
      throw failure;
    }) as unknown as DatabaseClient;

    await expect(checkDatabaseHealth(failingDatabase)).resolves.toEqual({
      ok: false,
      error: failure,
    });
  });
});
