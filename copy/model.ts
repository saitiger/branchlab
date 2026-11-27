import type { CopyKey } from "./variants.js";

/**
 * Assumed click rates for a labeled synthetic visitor.
 * These are not measurements of parents or children.
 * listen is the poetic tagline. next is the concrete line.
 * The gap is large enough that 200 visitors a side should show it,
 * which is the point of this dry run.
 */
export const ASSUMED_CLICK_RATE: Record<CopyKey, number> = {
  listen: 0.22,
  next: 0.34,
};

export function drawClick(key: CopyKey, rng: () => number): 0 | 1 {
  return rng() < ASSUMED_CLICK_RATE[key] ? 1 : 0;
}
