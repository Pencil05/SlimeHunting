import { z } from 'zod';
import { c2sMessageSchema, type C2SMessage } from './c2s.js';
import { s2cMessageSchema, type S2CMessage } from './s2c.js';

const formatIssues = (error: z.ZodError): string => {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'message'}: ${issue.message}`)
    .join('; ');
};

export const parseC2SMessage = (value: unknown): C2SMessage => {
  const result = c2sMessageSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid C2S message: ${formatIssues(result.error)}`, { cause: result.error });
  }
  return result.data;
};

export const safeParseC2SMessage = (value: unknown) => {
  return c2sMessageSchema.safeParse(value);
};

export const parseS2CMessage = (value: unknown): S2CMessage => {
  const result = s2cMessageSchema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid S2C message: ${formatIssues(result.error)}`, { cause: result.error });
  }
  return result.data;
};

export const safeParseS2CMessage = (value: unknown) => {
  return s2cMessageSchema.safeParse(value);
};
