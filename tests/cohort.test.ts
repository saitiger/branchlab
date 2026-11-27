import assert from "node:assert/strict";
import test from "node:test";
import { drawPoint, mulberry32 } from "../cohort/model.js";
import { playIdentity } from "../cohort/play.js";
import type { ExperimentClient, FlagView } from "../src/types.js";

test("the published model stays inside its frequencies", () => {
  const rng = mulberry32(7);
  const guided = { suggestion: 0, voice: 0, unanswered: 0, text: 0 };
  const freeform = { suggestion: 0, voice: 0, unanswered: 0, text: 0 };
  for (let i = 0; i < 10_000; i += 1) {
    const g = drawPoint("guided", rng);
    guided[g.channel] += 1;
    const f = drawPoint("freeform", rng);
    freeform[f.channel] += 1;
    if (g.channel === "suggestion") assert.ok((g.latencyMs ?? 0) < 2400);
  }
  assert.ok(Math.abs(guided.suggestion / 10_000 - 0.7) < 0.02);
  assert.ok(Math.abs(guided.voice / 10_000 - 0.2) < 0.02);
  assert.equal(guided.text, 0);
  assert.ok(Math.abs(freeform.voice / 10_000 - 0.5) < 0.02);
  assert.ok(Math.abs(freeform.text / 10_000 - 0.3) < 0.02);
  assert.equal(freeform.suggestion, 0);
});

test("synthetic ids are unique and are not the browser id", async () => {
  const seen = new Set<string>();
  const fake: ExperimentClient = {
    async identify(id) {
      seen.add(id);
    },
    getExperimentFlag(): FlagView {
      return { enabled: true, variant: "guided", inExperiment: true, source: "server" };
    },
    trackEvent() {},
    async flush() {},
  };
  const rng = mulberry32(3);
  const first = await playIdentity(fake, "synth-a", rng);
  const second = await playIdentity(fake, "synth-b", rng);
  assert.equal(first.events[0]?.simulated, true);
  assert.equal(first.events.some((event) => "utterance" in event), false);
  assert.equal(seen.has("browser-person"), false);
  assert.deepEqual([...seen], ["synth-a", "synth-b"]);
  assert.equal(first.assignment.variantKey, "guided");
  assert.notEqual(second.participantId, "browser-person");
});
