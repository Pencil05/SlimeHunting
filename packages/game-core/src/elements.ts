export const SLIME_ELEMENTS = ['fire', 'water', 'earth', 'air'] as const;

export type SlimeElement = (typeof SLIME_ELEMENTS)[number];

export const isSlimeElement = (value: unknown): value is SlimeElement => {
  return typeof value === 'string' && (SLIME_ELEMENTS as readonly string[]).includes(value);
};
