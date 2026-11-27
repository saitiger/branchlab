import assert from "node:assert/strict";
import test from "node:test";
import { loadLive, sendMetrics } from "../src/flagsmith.js";
import type { ExperimentClient, FlagView, MetricIntent } from "../src/types.js";

function client(flag: FlagView | null, options: { failIdentify?: boolean; failFlag?: boolean } = {}) {
  const calls: string[] = [];
  const fake: ExperimentClient = {
    async identify() {
      calls.push("identify");
      if (options.failIdentify) throw new Error("identify failed");
    },
    getExperimentFlag() {
      calls.push("flag");
      if (options.failFlag) throw new Error("flag failed");
      return flag;
    },
    trackEvent(name, value) {
      calls.push(`track:${name}:${value ?? ""}`);
    },
    async flush() {
      calls.push("flush");
    },
  };
  return { fake, calls };
}

const enrolled: FlagView = { enabled: true, variant: "guided", inExperiment: true, source: "server" };

test("an enrolled guided identity exposes once and converts once", async () => {
  const { fake, calls } = client(enrolled);
  const live = await loadLive(fake, "person-1");
  assert.equal(live.mode, "guided");
  assert.equal(live.recording, true);
  const intent: MetricIntent = { name: "interaction_resolved", point: 0, value: 1 };
  let sent = await sendMetrics(fake, live, [intent], new Set());
  sent = await sendMetrics(fake, live, [intent], sent);
  assert.deepEqual(calls.filter((call) => call.startsWith("track")), ["track:interaction_resolved:1"]);
  assert.equal(calls.filter((call) => call === "flag").length, 1);
});

test("any enrolled variation other than guided is freeform and still exposes", async () => {
  const { fake, calls } = client({ ...enrolled, variant: "control" });
  const live = await loadLive(fake, "person-1");
  assert.equal(live.mode, "freeform");
  assert.equal(live.exposed, true);
  assert.equal(calls.includes("flag"), true);
});

test("a missing identity does not expose", async () => {
  const { fake, calls } = client(enrolled);
  const live = await loadLive(fake, "");
  assert.equal(live.status, "unrecorded");
  assert.equal(calls.includes("flag"), false);
  assert.equal(calls.includes("identify"), false);
});

test("someone outside the experiment is unrecorded and does not convert", async () => {
  const { fake, calls } = client({ ...enrolled, inExperiment: false });
  const live = await loadLive(fake, "person-1");
  assert.equal(live.recording, false);
  await sendMetrics(fake, live, [{ name: "interaction_resolved", point: 0, value: 1 }], new Set());
  assert.equal(calls.some((call) => call.startsWith("track")), false);
});

test("identify and flag failures stay unrecorded", async () => {
  for (const options of [{ failIdentify: true }, { failFlag: true }]) {
    const { fake, calls } = client(enrolled, options);
    const live = await loadLive(fake, "person-1");
    assert.equal(live.status, "unrecorded");
    assert.equal(calls.some((call) => call.startsWith("track")), false);
  }
});

test("a conversion before exposure can still be sent once exposure exists", async () => {
  const { fake, calls } = client(enrolled);
  const pending: MetricIntent = { name: "interaction_resolved", point: 1, value: 1 };
  const hidden = { mode: "freeform" as const, recording: false, variantKey: null, status: "unrecorded" as const, exposed: false };
  await sendMetrics(fake, hidden, [pending], new Set());
  assert.equal(calls.some((call) => call.startsWith("track")), false);
  const live = await loadLive(fake, "person-1");
  await sendMetrics(fake, live, [pending], new Set());
  assert.equal(calls.filter((call) => call.startsWith("track")).length, 1);
});
