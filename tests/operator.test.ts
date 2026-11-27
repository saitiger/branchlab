import assert from "node:assert/strict";
import test from "node:test";
import { parseShipArgs } from "../operator/args.js";
import { environmentKey } from "../operator/cli.js";
import { shipPlan, type ExperimentFile } from "../operator/experiment.js";

const experiment: ExperimentFile = {
  feature: "interaction_mode",
  experimentName: "interaction_mode_experiment",
  experimentId: 9,
  controlValue: "freeform",
  treatmentKey: "guided",
  treatmentValue: "guided",
  primaryEvent: "interaction_resolved",
};

test("shipping requires a named variation and stays quiet without confirm", () => {
  assert.equal(parseShipArgs(["confirm"]).variation, null);
  const named = parseShipArgs(["guided"]);
  assert.equal(named.variation, "guided");
  assert.equal(named.yes, false);
  assert.equal(parseShipArgs(["guided", "confirm"]).yes, true);
  assert.equal(parseShipArgs(["--variation", "guided", "--yes"]).yes, true);
  assert.match(shipPlan(experiment, "guided"), /guided/);
});

test("environment output is parsed without being returned as a log line", () => {
  const key = environmentKey(JSON.stringify({ api_key: "ser.secret", name: "Development" }));
  assert.equal(key, "ser.secret");
});
