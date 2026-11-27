import type { DomainEvent, ProductMode } from "./types.js";

export interface Card {
  id: string;
  label: string;
  unit: "ratio" | "ms" | "count";
  value: number | null;
  numerator: number;
  denominator: number;
}

export interface Dashboard {
  cards: Card[];
  openElapsedMs: number | null;
}

const LABELS: { id: string; label: string; unit: Card["unit"] }[] = [
  { id: "interaction_rate", label: "Interaction rate", unit: "ratio" },
  { id: "response_latency", label: "Average response latency", unit: "ms" },
  { id: "suggestion_rate", label: "Suggested response selection rate", unit: "ratio" },
  { id: "freeform_voice_rate", label: "Freeform voice response rate", unit: "ratio" },
  { id: "guided_voice_rate", label: "Guided voice response rate", unit: "ratio" },
  { id: "ai_success_rate", label: "AI response success rate", unit: "ratio" },
  { id: "completion_rate", label: "Story completion rate", unit: "ratio" },
  { id: "session_duration", label: "Average session duration", unit: "ms" },
  { id: "interactions_per_session", label: "Interactions per session", unit: "count" },
];

function card(id: string, value: number | null, numerator = 0, denominator = 0): Card {
  const spec = LABELS.find((item) => item.id === id);
  if (!spec) throw new Error(`unknown card ${id}`);
  return { ...spec, value: denominator === 0 ? null : value, numerator, denominator };
}

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

export function liveEvents(events: DomainEvent[]): DomainEvent[] {
  return events.filter((event) => !event.simulated);
}

export function computeMetrics(events: DomainEvent[], now = 0): Dashboard {
  const points = events.filter((event) => event.name === "interaction_point_reached");
  const resolved = events.filter((event) => event.name === "interaction_resolved");
  const successes = resolved.filter((event) => event.value === 1);
  const guidedPoints = points.filter((event) => event.variant === "guided").length;
  const freeformPoints = points.filter((event) => event.variant === "freeform").length;
  const suggestions = events.filter((event) => event.name === "suggestion_selected").length;
  const voice = (mode: ProductMode) =>
    events.filter((event) => event.name === "voice_response_completed" && event.variant === mode).length;
  const latched =
    suggestions +
    events.filter((event) => event.name === "voice_response_completed").length +
    events.filter((event) => event.name === "text_response_submitted").length;
  const ai = events.filter((event) => event.name === "ai_response_completed").length;
  const starts = uniqueSessions(events, "session_started");
  const completions = uniqueSessions(events, "story_completed");
  const durations = sessionDurations(events);

  const latencyValues = successes
    .map((event) => event.latencyMs)
    .filter((value): value is number => typeof value === "number");

  const cards = [
    card("interaction_rate", rate(successes.length, points.length), successes.length, points.length),
    card(
      "response_latency",
      latencyValues.length === 0 ? null : latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length,
      latencyValues.reduce((sum, value) => sum + value, 0),
      latencyValues.length,
    ),
    card("suggestion_rate", rate(suggestions, guidedPoints), suggestions, guidedPoints),
    card("freeform_voice_rate", rate(voice("freeform"), freeformPoints), voice("freeform"), freeformPoints),
    card("guided_voice_rate", rate(voice("guided"), guidedPoints), voice("guided"), guidedPoints),
    card("ai_success_rate", rate(ai, latched), ai, latched),
    card("completion_rate", rate(completions.length, starts.length), completions.length, starts.length),
    card(
      "session_duration",
      durations.length === 0 ? null : durations.reduce((sum, value) => sum + value, 0) / durations.length,
      durations.reduce((sum, value) => sum + value, 0),
      durations.length,
    ),
    card("interactions_per_session", rate(latched, starts.length), latched, starts.length),
  ];

  return { cards, openElapsedMs: openElapsed(events, now) };
}

export function metricsByMode(events: DomainEvent[], now = 0): Record<ProductMode | "pooled", Dashboard> {
  return {
    pooled: computeMetrics(events, now),
    freeform: computeMetrics(events.filter((event) => event.variant === "freeform"), now),
    guided: computeMetrics(events.filter((event) => event.variant === "guided"), now),
  };
}

function uniqueSessions(events: DomainEvent[], name: DomainEvent["name"]): string[] {
  return [...new Set(events.filter((event) => event.name === name).map((event) => event.sessionId))];
}

function sessionDurations(events: DomainEvent[]): number[] {
  const starts = new Map<string, number>();
  const ends = new Map<string, number>();
  for (const event of events) {
    if (event.name === "session_started" && !starts.has(event.sessionId)) starts.set(event.sessionId, event.at);
    if (event.name === "story_completed" || event.name === "session_abandoned") ends.set(event.sessionId, event.at);
  }
  const durations: number[] = [];
  for (const [sessionId, end] of ends) {
    const start = starts.get(sessionId);
    if (start !== undefined) durations.push(end - start);
  }
  return durations;
}

function openElapsed(events: DomainEvent[], now: number): number | null {
  const finished = new Set(
    events.filter((event) => event.name === "story_completed" || event.name === "session_abandoned").map((event) => event.sessionId),
  );
  const open = events.filter((event) => event.name === "session_started" && !finished.has(event.sessionId));
  const latest = open.at(-1);
  if (!latest || now <= 0) return null;
  return now - latest.at;
}
