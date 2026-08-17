import { describe, expect, it, vi } from 'vitest';
import { PROTOCOL_VERSION, parseS2CMessage } from '@slime-hunter/network-protocol';
import { FoundationRoom } from '../rooms/FoundationRoom.js';

interface FakeClient {
  sessionId: string;
  send: ReturnType<typeof vi.fn>;
}

const createClient = (sessionId: string): FakeClient => ({
  sessionId,
  send: vi.fn(),
});

const createRoom = (): FoundationRoom => {
  const room = new FoundationRoom({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  });
  room.broadcast = vi.fn();
  room.onCreate();
  return room;
};

describe('FoundationRoom', () => {
  it('creates an authoritative room with an empty player state', () => {
    const room = createRoom();

    expect(room.state.players.size).toBe(0);
  });

  it('tracks two clients joining and leaving and exposes synchronized state', () => {
    const room = createRoom();
    const first = createClient('player-1');
    const second = createClient('player-2');

    room.onJoin(first as never);
    room.onJoin(second as never);

    expect(Array.from(room.state.players.keys())).toEqual(['player-1', 'player-2']);
    expect(room.stateSyncMessage()).toEqual({
      v: PROTOCOL_VERSION,
      type: 'state_sync',
      players: [{ id: 'player-1' }, { id: 'player-2' }],
    });

    room.onLeave(first as never);

    expect(Array.from(room.state.players.keys())).toEqual(['player-2']);
    expect(room.stateSyncMessage()).toEqual({
      v: PROTOCOL_VERSION,
      type: 'state_sync',
      players: [{ id: 'player-2' }],
    });
  });

  it('validates ping and sends a protocol-valid pong', () => {
    const room = createRoom();
    const client = createClient('player-1');

    room.handlePing(client as never, { v: PROTOCOL_VERSION, timestamp: 42 });

    expect(client.send).toHaveBeenCalledWith('pong', expect.objectContaining({
      v: PROTOCOL_VERSION,
      type: 'pong',
      clientTimestamp: 42,
      serverTimestamp: expect.any(Number),
    }));
    expect(parseS2CMessage(client.send.mock.calls[0]?.[1])).toMatchObject({
      type: 'pong',
      clientTimestamp: 42,
    });
  });

  it('rejects invalid ping payloads without throwing and sends a safe error', () => {
    const room = createRoom();
    const client = createClient('player-1');

    expect(() => room.handlePing(client as never, { timestamp: 'not-a-number' })).not.toThrow();
    expect(client.send).toHaveBeenCalledWith('error', {
      v: PROTOCOL_VERSION,
      type: 'error',
      code: 'INVALID_PAYLOAD',
      message: 'Invalid ping payload',
    });
  });
});
