import assert from "node:assert/strict";
import test from "node:test";
import { characterWantGate, situationTextCheck } from "../experiments/gates.ts";
import { PROGRAM, syntheticAllowed } from "../experiments/program.ts";

test("the program has the five experiments and only two allow a synthetic check", () => {
  assert.deepEqual(PROGRAM.map((spec) => spec.id), [
    "character_want",
    "situation_opening",
    "hero_address",
    "interaction_mode",
    "shelf_copy",
  ]);
  const allowed = PROGRAM.filter(syntheticAllowed).map((spec) => spec.id);
  assert.deepEqual(allowed, ["character_want", "situation_opening"]);
});

test("the character-want gate passes and does not invent a child result", () => {
  const gate = characterWantGate(1);
  assert.equal(gate.pass, true);
  assert.equal(gate.childResult, null);
  assert.match(gate.summary, /24 paired plays/);
});

test("the situation check looks at the question text and not a simulated answer", () => {
  const gate = situationTextCheck();
  assert.equal(gate.pass, true);
  assert.equal(gate.childResult, null);
  assert.match(gate.summary, /No simulated child answered/);
});
