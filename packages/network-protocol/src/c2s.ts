import { z } from 'zod';
import { PROTOCOL_VERSION } from './version.js';

export const pingSchema = z.object({
  v: z.literal(PROTOCOL_VERSION),
  type: z.literal('ping'),
  timestamp: z.number().int().nonnegative(),
});

export const c2sMessageSchema = z.discriminatedUnion('type', [pingSchema]);

export type PingMessage = z.infer<typeof pingSchema>;
export type C2SMessage = z.infer<typeof c2sMessageSchema>;
