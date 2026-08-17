import { z } from 'zod';
import { PROTOCOL_VERSION } from './version.js';

const versioned = z.object({
  v: z.literal(PROTOCOL_VERSION),
});

export const pongSchema = versioned.extend({
  type: z.literal('pong'),
  clientTimestamp: z.number().int().nonnegative(),
  serverTimestamp: z.number().int().nonnegative(),
});

export const playerSchema = z.object({
  id: z.string().min(1),
});

export const playerJoinedSchema = versioned.extend({
  type: z.literal('player_joined'),
  player: playerSchema,
});

export const playerLeftSchema = versioned.extend({
  type: z.literal('player_left'),
  playerId: z.string().min(1),
});

export const stateSyncSchema = versioned.extend({
  type: z.literal('state_sync'),
  players: z.array(playerSchema),
});

export const errorSchema = versioned.extend({
  type: z.literal('error'),
  code: z.string().min(1),
  message: z.string().min(1),
});

export const s2cMessageSchema = z.discriminatedUnion('type', [
  pongSchema,
  playerJoinedSchema,
  playerLeftSchema,
  stateSyncSchema,
  errorSchema,
]);

export type PongMessage = z.infer<typeof pongSchema>;
export type Player = z.infer<typeof playerSchema>;
export type PlayerJoinedMessage = z.infer<typeof playerJoinedSchema>;
export type PlayerLeftMessage = z.infer<typeof playerLeftSchema>;
export type StateSyncMessage = z.infer<typeof stateSyncSchema>;
export type ErrorMessage = z.infer<typeof errorSchema>;
export type S2CMessage = z.infer<typeof s2cMessageSchema>;
