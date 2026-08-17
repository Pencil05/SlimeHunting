import { describe, expect, it } from 'vitest';
import { placeholder } from './index.js';

describe('placeholder workspace entrypoint', () => {
  it('is available during bootstrap', () => {
    expect(placeholder).toBe(true);
  });
});
