import { describe, expect, it } from 'vitest';
import {
  PROTOCOL_VERSION,
  parseC2SMessage,
  parseS2CMessage,
  safeParseC2SMessage,
} from '../index.js';

describe('network protocol', () => {
  it('exports the current protocol version', () => {
    expect(PROTOCOL_VERSION).toBe('v1');
  });

  it('parses valid client and server messages', () => {
    expect(parseC2SMessage({
      v: PROTOCOL_VERSION,
      type: 'ping',
      timestamp: 123,
    })).toEqual({
      v: PROTOCOL_VERSION,
      type: 'ping',
      timestamp: 123,
    });

    expect(parseS2CMessage({
      v: PROTOCOL_VERSION,
      type: 'state_sync',
      players: [{ id: 'player-1' }],
    })).toEqual({
      v: PROTOCOL_VERSION,
      type: 'state_sync',
      players: [{ id: 'player-1' }],
    });
  });

  it('rejects invalid messages with clear errors', () => {
    const result = safeParseC2SMessage({
      v: PROTOCOL_VERSION,
      type: 'ping',
      timestamp: -1,
    });

    expect(result.success).toBe(false);
    expect(() => parseC2SMessage({ type: 'ping', timestamp: 'now' })).toThrow(/Invalid C2S message/);
  });
});
