import assert from "node:assert/strict";
import test from "node:test";
import { computeMetrics, liveEvents } from "../src/metrics.js";
import { EXPERIMENT_ID, type DomainEvent, type ProductMode } from "../src/types.js";

function event(name: DomainEvent["name"], extra: Partial<DomainEvent> = {}): DomainEvent {
  return {
    experimentId: EXPERIMENT_ID,
    variant: "freeform",
    participantId: "p",
    sessionId: "s",
    at: 0,
    name,
    ...extra,
  };
}

function completed(mode: ProductMode, sessionId: string, channel: "voice" | "text" | "suggestion"): DomainEvent[] {
  const events: DomainEvent[] = [event("session_started", { variant: mode, sessionId, at: 0 })];
  for (let point = 0; point < 3; point += 1) {
    const at = 10 + point * 50;
    events.push(event("interaction_point_reached", { variant: mode, sessionId, point, at }));
    if (channel === "suggestion") events.push(event("suggestion_selected", { variant: mode, sessionId, point, at: at + 5 }));
    if (channel === "voice") events.push(event("voice_response_completed", { variant: mode, sessionId, point, at: at + 5 }));
    if (channel === "text") events.push(event("text_response_submitted", { variant: mode, sessionId, point, at: at + 5 }));
    events.push(event("ai_response_completed", { variant: mode, sessionId, point, at: at + 10 }));
    events.push(event("interaction_resolved", { variant: mode, sessionId, point, at: at + 10, value: 1, latencyMs: 10 }));
  }
  events.push(event("story_completed", { variant: mode, sessionId, at: 200 }));
  return events;
}

function valueOf(events: DomainEvent[], id: string) {
  return computeMetrics(events).cards.find((card) => card.id === id)?.value ?? null;
}

test("a completed freeform session and a guided suggestion session fill the rates", () => {
  const events = [...completed("freeform", "s1", "voice"), ...completed("guided", "s2", "suggestion")];
  assert.equal(valueOf(events, "interaction_rate"), 1);
  assert.equal(valueOf(events, "freeform_voice_rate"), 1);
  assert.equal(valueOf(events, "suggestion_rate"), 1);
  assert.equal(valueOf(events, "guided_voice_rate"), 0);
  assert.equal(valueOf(events, "completion_rate"), 1);
  assert.equal(valueOf(events, "interactions_per_session"), 3);
});

test("an empty log yields empty metrics", () => {
  for (const card of computeMetrics([]).cards) assert.equal(card.value, null);
});

test("a one-sided log leaves the other mode rate empty", () => {
  const guided = completed("guided", "s", "suggestion");
  assert.equal(valueOf(guided, "freeform_voice_rate"), null);
  const freeform = completed("freeform", "s", "text");
  assert.equal(valueOf(freeform, "suggestion_rate"), null);
});

test("an open session is outside the duration mean and reports its own elapsed time", () => {
  const events = [event("session_started", { at: 1_000 })];
  const dashboard = computeMetrics(events, 4_000);
  assert.equal(valueOf(events, "session_duration"), null);
  assert.equal(dashboard.openElapsedMs, 3_000);
});

test("simulated rows do not change the live interaction rate", () => {
  const live = completed("freeform", "live", "text");
  const simulated = completed("guided", "sim", "suggestion").map((event) => ({ ...event, simulated: true as const }));
  assert.equal(valueOf(liveEvents([...live, ...simulated]), "interaction_rate"), 1);
  assert.equal(liveEvents([...live, ...simulated]).some((event) => event.variant === "guided"), false);
});
