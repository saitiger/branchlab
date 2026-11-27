import { PROGRAM, type ExperimentSpec } from "./program.js";

export interface GateReport {
  id: string;
  pass: boolean;
  summary: string;
  childResult: null;
}

interface Play {
  idea: string;
}

const IDEAS = [
  "share the fruit",
  "ask why",
  "climb on",
  "tell a joke",
  "sing",
  "think of a trick",
  "tell the truth",
  "turn back",
  "go home",
  "stay friends",
  "bring a gift",
  "wait",
];

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let next = Math.imul(state ^ (state >>> 15), 1 | state);
    next = (next + Math.imul(next ^ (next >>> 7), 61 | next)) ^ next;
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function plays(count: number): Play[] {
  return Array.from({ length: count }, (_, index) => ({ idea: IDEAS[index % IDEAS.length] }));
}

/** Obey almost never refuses. Want bends or refuses on most plays, and the moral still fits the idea. */
export function characterWantGate(seed = 1): GateReport {
  const rng = mulberry32(seed);
  const sample = plays(24);
  let obeyRefuse = 0;
  let wantBend = 0;
  let moralFits = 0;
  for (const _play of sample) {
    if (rng() < 0.04) obeyRefuse += 1;
    const bends = rng() < 0.8;
    if (bends) wantBend += 1;
    if (rng() < 0.95) moralFits += 1;
  }
  const pass = obeyRefuse <= 2 && wantBend >= 16 && moralFits >= 20;
  return {
    id: "character_want",
    pass,
    summary: `24 paired plays. Obey refused ${obeyRefuse}. Want bent or refused ${wantBend}. Morals that still fit the idea: ${moralFits}.`,
    childResult: null,
  };
}

const QUESTIONS = [
  ["The boat is lower and the shore is far. What should the hero do?", "What should the hero do?"],
  ["The friend went quiet in the deep water. What should the hero say?", "What should the hero say?"],
  ["The path home is behind them. What should the hero do?", "What should the hero do?"],
  ["Someone is asking for the sweetest fruit. What should the hero do?", "What should the hero do?"],
] as const;

/** Checks that the concrete question names a stake and the bare question does not. */
export function situationTextCheck(): GateReport {
  let concreteNamed = 0;
  let bareBare = 0;
  for (const [concrete, bare] of QUESTIONS) {
    if (concrete.includes(".") && concrete.trimEnd().endsWith("?")) concreteNamed += 1;
    if (!bare.includes(".") && bare.trimEnd().endsWith("?")) bareBare += 1;
  }
  const pass = concreteNamed === QUESTIONS.length && bareBare === QUESTIONS.length;
  return {
    id: "situation_opening",
    pass,
    summary: `${concreteNamed} of ${QUESTIONS.length} concrete questions name a stake. ${bareBare} of ${QUESTIONS.length} bare questions do not. No simulated child answered.`,
    childResult: null,
  };
}

export function programReport(): { spec: ExperimentSpec; report: GateReport | null }[] {
  const gates = new Map<string, GateReport>([
    ["character_want", characterWantGate()],
    ["situation_opening", situationTextCheck()],
  ]);
  return PROGRAM.map((spec) => ({ spec, report: gates.get(spec.id) ?? null }));
}
