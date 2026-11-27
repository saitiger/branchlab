import assert from "node:assert/strict";
import test from "node:test";
import { createSession, reduce } from "../src/session.js";

function play(mode: "freeform" | "guided", channel: "voice" | "text" | "suggestion") {
  let step = createSession({ participantId: "p1", sessionId: "s1", mode, record: true, at: 0 });
  const domain = [...step.domain];
  const metrics = [...step.metrics];
  for (let point = 0; point < 3; point += 1) {
    const reached = reduce(step.session, { type: "reach" }, 10 + point * 100);
    const latched = reduce(reached.session, { type: "latch", channel }, 20 + point * 100);
    const done = reduce(latched.session, { type: "mock-ok" }, 30 + point * 100);
    step = done;
    domain.push(...reached.domain, ...latched.domain, ...done.domain);
    metrics.push(...reached.metrics, ...latched.metrics, ...done.metrics);
  }
  return { session: step.session, domain, metrics };
}

test("three successful points complete one session and resolve each point once", () => {
  const { session, domain, metrics } = play("freeform", "text");
  assert.equal(session.completed, true);
  assert.equal(domain.filter((event) => event.name === "interaction_resolved" && event.value === 1).length, 3);
  assert.equal(metrics.filter((event) => event.name === "interaction_resolved").length, 3);
  assert.equal(metrics.filter((event) => event.name === "story_completed").length, 1);
  assert.equal(domain.some((event) => event.name === "session_abandoned"), false);
  assert.equal("utterance" in domain[0], false);
});

test("a suggestion is not voice, and freeform voice is not a suggestion", () => {
  const guided = play("guided", "suggestion");
  assert.equal(guided.domain.some((event) => event.name === "suggestion_selected"), true);
  assert.equal(guided.domain.some((event) => event.name === "voice_response_completed"), false);
  const freeform = play("freeform", "voice");
  assert.equal(freeform.domain.some((event) => event.name === "voice_response_completed"), true);
  assert.equal(freeform.domain.some((event) => event.name === "suggestion_selected"), false);
});

test("pagehide does not abandon, idle does, and a second load does not send twice", () => {
  let step = createSession({ participantId: "p1", sessionId: "s1", mode: "freeform", record: true, at: 0 });
  step = reduce(step.session, { type: "reach" }, 0);
  const hidden = reduce(step.session, { type: "pagehide" }, 10);
  assert.equal(hidden.domain.length, 0);
  const abandoned = reduce(step.session, { type: "tick" }, 60_000);
  assert.equal(abandoned.session.abandoned, true);
  assert.equal(abandoned.metrics.some((event) => event.name === "interaction_resolved" && event.value === 0), true);
  const again = reduce(abandoned.session, { type: "tab-missing" }, 90_000);
  assert.equal(again.metrics.length, 0);
});

test("a later load abandons a non-terminal session once", () => {
  let step = createSession({ participantId: "p1", sessionId: "s1", mode: "freeform", record: true, at: 0 });
  step = reduce(step.session, { type: "reach" }, 0);
  const abandoned = reduce(step.session, { type: "tab-missing" }, 5);
  assert.equal(abandoned.domain.some((event) => event.name === "session_abandoned"), true);
  const completed = play("freeform", "text");
  const quiet = reduce(completed.session, { type: "tab-missing" }, 999);
  assert.equal(quiet.domain.length, 0);
});

test("mock failure resolves to zero and does not complete the story", () => {
  let step = createSession({ participantId: "p1", sessionId: "s1", mode: "freeform", record: true, at: 0 });
  step = reduce(step.session, { type: "reach" }, 1);
  step = reduce(step.session, { type: "latch", channel: "text" }, 2);
  const failed = reduce(step.session, { type: "mock-fail" }, 3);
  assert.equal(failed.session.failed, true);
  assert.equal(failed.metrics.some((event) => event.value === 0), true);
  assert.equal(failed.domain.some((event) => event.name === "story_completed"), false);
  assert.equal(failed.domain.some((event) => event.name === "ai_response_completed"), false);
});

test("play again keeps the participant and starts a new session ledger", () => {
  const first = play("freeform", "text");
  const second = createSession({
    participantId: first.session.participantId,
    sessionId: "s2",
    mode: "freeform",
    record: true,
    at: 500,
  });
  assert.equal(second.session.participantId, "p1");
  assert.notEqual(second.session.sessionId, first.session.sessionId);
  assert.deepEqual(second.session.ledger, {});
});

test("an unrecorded preview keeps the beat moving and writes nothing", () => {
  let step = createSession({ participantId: "p1", sessionId: "s1", mode: "guided", record: false, at: 0 });
  step = reduce(step.session, { type: "reach" }, 1);
  step = reduce(step.session, { type: "latch", channel: "suggestion" }, 2);
  const done = reduce(step.session, { type: "mock-ok" }, 3);
  assert.equal(done.domain.length, 0);
  assert.equal(done.metrics.length, 0);
  assert.equal(done.session.beat, 1);
});
