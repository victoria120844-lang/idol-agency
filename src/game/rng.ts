/**
 * Seeded random number generation.
 *
 * Every random decision in the game goes through this module. The generator is
 * mulberry32: fast, 32-bit, and dependency free. The position is tracked as a
 * `cursor` so a save file only needs to store `{ seed, cursor }` — replaying
 * `cursor` draws from `seed` restores the exact stream position, which makes a
 * whole playthrough reproducible from the save.
 */

import type { RngState } from './types';

export interface Rng {
  readonly seed: number;
  /** Values drawn so far. Read this back into the save via `snapshot`. */
  cursor: number;
  /** Next float in [0, 1). */
  next(): number;
}

/** Core mulberry32 step. Pure: same input always yields the same output. */
function mulberry32Step(state: number): number {
  let t = (state + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Build a generator positioned at `cursor` draws past `seed`.
 *
 * The returned object is mutable by design — it is a cursor over a stream, not
 * game state. Never store it inside the Zustand store; create it from
 * `state.rng`, use it, then write `snapshot(rng)` back.
 */
export function createRng({ seed, cursor = 0 }: RngState): Rng {
  let state = seed | 0;
  for (let i = 0; i < cursor; i += 1) {
    state = (state + 0x6d2b79f5) | 0;
  }
  return {
    seed,
    cursor,
    next() {
      const value = mulberry32Step(state);
      state = (state + 0x6d2b79f5) | 0;
      this.cursor += 1;
      return value;
    },
  };
}

/** Read the generator position back out for persisting. */
export function snapshot(rng: Rng): RngState {
  return { seed: rng.seed, cursor: rng.cursor };
}

/** Fresh seed for a brand new playthrough. */
export function createSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

/**
 * Turn a string into a stable 32-bit seed (FNV-1a), so a player can share a
 * seed phrase and get the identical playthrough.
 */
export function seedFromString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Integer in [min, max], both inclusive. */
export function randInt(rng: Rng, min: number, max: number): number {
  if (max < min) return min;
  return min + Math.floor(rng.next() * (max - min + 1));
}

/** Float in [min, max). */
export function randFloat(rng: Rng, min: number, max: number): number {
  return min + rng.next() * (max - min);
}

/** True with probability `p` (0-1). */
export function randChance(rng: Rng, p: number): boolean {
  return rng.next() < p;
}

/** Uniform pick from a non-empty array. */
export function randPick<T>(rng: Rng, items: readonly T[]): T {
  if (items.length === 0) {
    throw new Error('randPick: empty array');
  }
  return items[randInt(rng, 0, items.length - 1)];
}

/**
 * Weighted pick. `weight` maps an item to a non-negative relative likelihood;
 * items weighted 0 are never selected.
 */
export function randWeighted<T>(
  rng: Rng,
  items: readonly T[],
  weight: (item: T) => number,
): T {
  if (items.length === 0) {
    throw new Error('randWeighted: empty array');
  }
  let total = 0;
  for (const item of items) {
    total += Math.max(0, weight(item));
  }
  if (total <= 0) return randPick(rng, items);

  let roll = rng.next() * total;
  for (const item of items) {
    roll -= Math.max(0, weight(item));
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

/**
 * Normally distributed value via Box-Muller. Used for stat rolls so most
 * trainees land near average and standouts stay rare.
 */
export function gaussian(rng: Rng, mean = 0, stdDev = 1): number {
  // u must be non-zero for the log.
  const u = 1 - rng.next();
  const v = rng.next();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * stdDev;
}

/** Gaussian roll clamped into a range, the usual way to generate a stat. */
export function gaussianClamped(
  rng: Rng,
  mean: number,
  stdDev: number,
  min: number,
  max: number,
): number {
  const value = gaussian(rng, mean, stdDev);
  return Math.round(Math.min(max, Math.max(min, value)));
}

/** Fisher-Yates shuffle returning a new array; the input is untouched. */
export function shuffle<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, 0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pick `count` distinct items. Returns fewer if the pool is smaller. */
export function randSample<T>(rng: Rng, items: readonly T[], count: number): T[] {
  return shuffle(rng, items).slice(0, Math.max(0, count));
}

/** Short id drawn from the seeded stream, so ids are reproducible too. */
export function randId(rng: Rng, prefix: string): string {
  const n = randInt(rng, 0, 0xffffff).toString(36).padStart(5, '0');
  return `${prefix}_${n}`;
}
