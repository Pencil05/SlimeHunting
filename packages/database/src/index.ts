import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import postgres, { type Sql } from 'postgres';
import { config } from '@slime-hunter/config';

export type DatabaseClient = Sql<{}>;

export interface MigrationFile {
  name: string;
  path: string;
}

export type DatabaseHealth =
  | { ok: true }
  | { ok: false; error: unknown };

const migrationNamePattern = /^\d+_[a-z0-9_-]+\.sql$/;

export const parseDatabaseUrl = (value: string): URL => {
  let url: URL;

  try {
    url = new URL(value);
  } catch (error) {
    throw new Error('Invalid DATABASE_URL: must be a valid URL', { cause: error });
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new Error('Invalid DATABASE_URL: protocol must be postgresql: or postgres:');
  }

  if (!url.hostname) {
    throw new Error('Invalid DATABASE_URL: hostname is required');
  }

  return url;
};

export const createDatabase = (connectionString = config.DATABASE_URL): DatabaseClient => {
  const url = parseDatabaseUrl(connectionString);

  return postgres(url.toString(), {
    max: 10,
    connect_timeout: 10,
    idle_timeout: 20,
  });
};

export const connectDatabase = createDatabase;

export const disconnectDatabase = async (database: DatabaseClient): Promise<void> => {
  await database.end({ timeout: 5 });
};

export const checkDatabaseHealth = async (
  database: DatabaseClient,
): Promise<DatabaseHealth> => {
  try {
    await database`SELECT 1`;
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

export const discoverMigrations = async (directory: string): Promise<MigrationFile[]> => {
  const entries = await readdir(directory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && migrationNamePattern.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, 'en'))
    .map((entry) => ({
      name: entry.name,
      path: `${directory}/${entry.name}`,
    }));
};

const defaultMigrationsDirectory = fileURLToPath(
  new URL('../migrations/', import.meta.url),
);

export const runMigrations = async (
  database: DatabaseClient,
  directory = defaultMigrationsDirectory,
): Promise<string[]> => {
  const migrations = await discoverMigrations(directory);

  await database.unsafe(`
    CREATE TABLE IF NOT EXISTS _slime_hunter_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const appliedRows = await database.unsafe<{ name: string }[]>(
    'SELECT name FROM _slime_hunter_migrations ORDER BY name',
  );
  const applied = new Set(appliedRows.map((row) => row.name));
  const newlyApplied: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.name)) {
      continue;
    }

    const sql = await readFile(migration.path, 'utf8');
    await database.begin(async (transaction) => {
      await transaction.unsafe(sql);
      await transaction.unsafe(
        'INSERT INTO _slime_hunter_migrations (name) VALUES ($1)',
        [migration.name],
      );
    });
    newlyApplied.push(migration.name);
  }

  return newlyApplied;
};
