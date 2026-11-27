import assert from "node:assert/strict";
import test from "node:test";
import { mulberry32 } from "../cohort/model.js";
import { ASSUMED_CLICK_RATE, drawClick } from "../copy/model.js";
import { runCopyDry } from "../copy/run.js";
import { compareProportions } from "../copy/stats.js";

test("labeled draws stay near the assumed click rates", () => {
  const rng = mulberry32(4);
  const draws = 20_000;
  let listen = 0;
  let next = 0;
  for (let i = 0; i < draws; i += 1) {
    listen += drawClick("listen", rng);
    next += drawClick("next", rng);
  }
  assert.ok(Math.abs(listen / draws - ASSUMED_CLICK_RATE.listen) < 0.015);
  assert.ok(Math.abs(next / draws - ASSUMED_CLICK_RATE.next) < 0.015);
});

test("the seeded dry run shows the planted gap", () => {
  const summary = runCopyDry(200, 11);
  assert.equal(summary.simulated, true);
  assert.equal(summary.transport, "dry-run");
  assert.equal(summary.visitorsPerCopy, 200);
  assert.equal(summary.result.controlVisitors, 200);
  assert.equal(summary.result.treatmentVisitors, 200);
  assert.ok(summary.result.treatmentClicks > summary.result.controlClicks);
  assert.ok(summary.result.z > 2);
  assert.ok(summary.result.twoSidedP < 0.05);
  const again = compareProportions(
    summary.result.controlClicks,
    summary.result.controlVisitors,
    summary.result.treatmentClicks,
    summary.result.treatmentVisitors,
  );
  assert.equal(again.z, summary.result.z);
});
