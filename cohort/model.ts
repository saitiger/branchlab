import type { ProductMode } from "../src/types.js";

export interface Draw {
  channel: "suggestion" | "voice" | "text" | "unanswered";
  latencyMs: number | null;
}

/** Published behavior model. Frequencies are sampled per point. They are not pasted totals. */
export function drawPoint(mode: ProductMode, rng: () => number): Draw {
  const roll = rng();
  if (mode === "guided") {
    if (roll < 0.7) return { channel: "suggestion", latencyMs: 800 };
    if (roll < 0.9) return { channel: "voice", latencyMs: 2400 };
    return { channel: "unanswered", latencyMs: null };
  }
  if (roll < 0.5) return { channel: "voice", latencyMs: 2400 };
  if (roll < 0.8) return { channel: "text", latencyMs: 1800 };
  return { channel: "unanswered", latencyMs: null };
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
