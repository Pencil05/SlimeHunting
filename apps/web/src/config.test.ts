import { describe, expect, it } from 'vitest';
import { getWebRuntimeConfig } from './config.js';

describe('web runtime configuration', () => {
  it('uses safe local defaults', () => {
    expect(getWebRuntimeConfig({})).toEqual({
      apiUrl: 'http://localhost:3000',
      realtimeUrl: 'ws://localhost:2567',
    });
  });

  it('uses Vite environment values when supplied', () => {
    expect(getWebRuntimeConfig({
      VITE_API_URL: 'https://api.example.test',
      VITE_REALTIME_URL: 'wss://realtime.example.test',
    })).toEqual({
      apiUrl: 'https://api.example.test',
      realtimeUrl: 'wss://realtime.example.test',
    });
  });
});
