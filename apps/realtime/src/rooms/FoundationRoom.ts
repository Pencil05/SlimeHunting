import { Client, Room } from 'colyseus';
import { defineTypes, MapSchema, Schema } from '@colyseus/schema';
import {
  PROTOCOL_VERSION,
  parseC2SMessage,
  type C2SMessage,
  type Player,
  type S2CMessage,
} from '@slime-hunter/network-protocol';

export class FoundationPlayerState extends Schema<string> {
  id = '';

  constructor(id = '') {
    super();
    this.id = id;
  }
}

defineTypes(FoundationPlayerState as unknown as typeof Schema, {
  id: 'string',
});

export class FoundationState extends Schema {
  players = new MapSchema<FoundationPlayerState>();
}

defineTypes(FoundationState, {
  players: { map: FoundationPlayerState },
});

export type FoundationRoomLogger = Pick<Console, 'info' | 'warn' | 'error'>;

export class FoundationRoom extends Room<{ state: FoundationState }> {
  private readonly logger: FoundationRoomLogger;

  constructor(logger: FoundationRoomLogger = console) {
    super();
    this.logger = logger;
  }

  public override onCreate(): void {
    this.setState(new FoundationState());
    this.onMessage('ping', (client, payload: unknown) => {
      this.handlePing(client, payload);
    });
    this.logger.info('foundation_room created');
  }

  public override onJoin(client: Client): void {
    const player = new FoundationPlayerState(client.sessionId);
    this.state.players.set(client.sessionId, player);
    this.broadcast('player_joined', this.playerJoinedMessage(player));
    this.broadcast('state_sync', this.stateSyncMessage());
    this.logger.info(`player joined: ${client.sessionId}`);
  }

  public override onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.broadcast('player_left', {
      v: PROTOCOL_VERSION,
      type: 'player_left',
      playerId: client.sessionId,
    } satisfies S2CMessage);
    this.broadcast('state_sync', this.stateSyncMessage());
    this.logger.info(`player left: ${client.sessionId}`);
  }

  public handlePing(client: Client, payload: unknown): void {
    try {
      const message = parseC2SMessage({
        ...(typeof payload === 'object' && payload !== null ? payload : {}),
        type: 'ping',
      });
      client.send('pong', {
        v: PROTOCOL_VERSION,
        type: 'pong',
        clientTimestamp: message.timestamp,
        serverTimestamp: Date.now(),
      } satisfies S2CMessage);
    } catch (error) {
      this.logger.warn(`invalid ping payload from ${client.sessionId}`);
      client.send('error', {
        v: PROTOCOL_VERSION,
        type: 'error',
        code: 'INVALID_PAYLOAD',
        message: 'Invalid ping payload',
      } satisfies S2CMessage);
      void error;
    }
  }

  public stateSyncMessage(): S2CMessage {
    const players: Player[] = Array.from(this.state.players.values()).map((player) => ({
      id: player.id,
    }));
    return {
      v: PROTOCOL_VERSION,
      type: 'state_sync',
      players,
    };
  }

  private playerJoinedMessage(player: FoundationPlayerState): S2CMessage {
    return {
      v: PROTOCOL_VERSION,
      type: 'player_joined',
      player: { id: player.id },
    };
  }
}
