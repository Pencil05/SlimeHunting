import { describe, expect, it, vi } from 'vitest';
import type { ConfigEnv } from '../index.js';

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

const { parseConfig } = await import('../index.js');

const validEnvironment: ConfigEnv = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'debug',
  WEB_ORIGIN: 'http://localhost:3000',
  API_HOST: '127.0.0.1',
  API_PORT: '4000',
  REALTIME_HOST: '127.0.0.1',
  REALTIME_PORT: '4001',
  VITE_API_URL: 'http://localhost:4000',
  VITE_REALTIME_URL: 'ws://localhost:4001',
  DATABASE_URL: 'postgresql://slime_hunter:slime_hunter@localhost:5432/slime_hunter',
  REDIS_URL: 'redis://localhost:6379',
};

describe('parseConfig', () => {
  it('parses a valid environment into typed configuration', () => {
    const parsed = parseConfig(validEnvironment);

    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.LOG_LEVEL).toBe('debug');
    expect(parsed.API_PORT).toBe(4000);
    expect(parsed.REALTIME_PORT).toBe(4001);
    expect(parsed.DATABASE_URL).toBe(validEnvironment.DATABASE_URL);
  });

  it('fails clearly when required configuration is missing', () => {
    const missingEnvironment = { ...validEnvironment };
    delete missingEnvironment.REDIS_URL;

    expect(() => parseConfig(missingEnvironment)).toThrowError(
      /Invalid configuration:[\s\S]*REDIS_URL: is required/,
    );
  });

  it('fails clearly for invalid URL values', () => {
    const invalidEnvironment = { ...validEnvironment, WEB_ORIGIN: 'not-a-url' };

    expect(() => parseConfig(invalidEnvironment)).toThrowError(
      /Invalid configuration:[\s\S]*WEB_ORIGIN: must be a valid URL/,
    );
  });

  it('fails clearly for invalid port values', () => {
    const invalidEnvironment = { ...validEnvironment, API_PORT: '70000' };

    expect(() => parseConfig(invalidEnvironment)).toThrowError(
      /Invalid configuration:[\s\S]*API_PORT: must be at most 65535/,
    );
  });
});
