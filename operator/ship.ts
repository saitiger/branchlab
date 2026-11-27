import { environmentKey, runFlagsmith } from "./cli.js";
import { parseShipArgs } from "./args.js";
import { readExperiment, shipPlan } from "./experiment.js";

async function main() {
  const args = parseShipArgs(process.argv.slice(2));
  const experiment = await readExperiment();
  if (!args.variation) {
    console.error("Name the variation to ship: npm run ship -- guided confirm");
    process.exit(1);
  }
  console.log(shipPlan(experiment, args.variation));
  if (!args.yes) {
    console.log("Nothing was changed. Re-run with confirm after the variation name when you mean to ship it.");
    return;
  }
  if (!experiment.experimentId) {
    console.error("Set experimentId in experiment.json before shipping.");
    process.exit(1);
  }
  const env = await runFlagsmith(["environment", "get", "--json"]);
  if (env.code !== 0) {
    console.error(env.stderr.trim() || "flagsmith environment get failed.");
    process.exit(1);
  }
  const key = environmentKey(env.stdout);
  const complete = await runFlagsmith(
    ["api", "POST", `api/v1/environments/${key}/experiments/${experiment.experimentId}/complete/`, "--input", "-"],
    "{}",
  );
  if (complete.code !== 0) {
    console.error(complete.stderr.trim() || complete.stdout.trim() || "Could not end the experiment.");
    process.exit(1);
  }
  const value = args.variation === experiment.treatmentKey ? experiment.treatmentValue : args.variation;
  const update = await runFlagsmith([
    "flag",
    "update",
    experiment.feature,
    "--value",
    value,
    "--type",
    "string",
    "--enable",
  ]);
  if (update.code !== 0) {
    console.error(update.stderr.trim() || "The experiment ended, and the flag update failed. The flag was not deleted.");
    process.exit(1);
  }
  console.log(`Shipped "${value}" on ${experiment.feature}. Status: complete.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Ship failed.");
  process.exit(1);
});
