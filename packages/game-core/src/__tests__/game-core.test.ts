import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SLIME_ELEMENTS, isSlimeElement } from '../index.js';

describe('SlimeElement', () => {
  it('accepts the minimal shared element values and rejects unknown values', () => {
    expect(SLIME_ELEMENTS).toEqual(['fire', 'water', 'earth', 'air']);
    expect(isSlimeElement('fire')).toBe(true);
    expect(isSlimeElement('void')).toBe(false);
    expect(isSlimeElement(null)).toBe(false);
  });
});

describe('game-core boundary', () => {
  it('has no runtime dependencies on UI or infrastructure libraries', async () => {
    const packagePath = fileURLToPath(new URL('../../package.json', import.meta.url));
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as {
      dependencies?: Record<string, unknown>;
      optionalDependencies?: Record<string, unknown>;
      peerDependencies?: Record<string, unknown>;
    };
    const dependencyNames = Object.keys({
      ...packageJson.dependencies,
      ...packageJson.optionalDependencies,
      ...packageJson.peerDependencies,
    });
    const forbidden = [
      'react',
      'react-dom',
      'phaser',
      'postgres',
      'pg',
      'ioredis',
      'fastify',
      'colyseus',
      '@colyseus/schema',
      '@slime-hunter/database',
      '@slime-hunter/event-bus',
      '@slime-hunter/config',
    ];

    expect(dependencyNames.filter((name) => forbidden.includes(name))).toEqual([]);
  });
});
