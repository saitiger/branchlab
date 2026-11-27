import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mulberry32 } from "../cohort/model.js";
import { drawClick } from "./model.js";
import { compareProportions } from "./stats.js";
import { COPIES, COPY_EXPERIMENT, COPY_FEATURE } from "./variants.js";

const HYPOTHESIS =
  "A concrete line about the child speaking gets more people to start a Kahani story than the poetic tagline.";

const NOTE =
  "Synthetic visitors drawn from copy/model.ts. Flagsmith was not called. These rates are not evidence about children or parents.";

export function runCopyDry(visitorsPerCopy: number, seed: number) {
  const rng = mulberry32(seed);
  let controlClicks = 0;
  let treatmentClicks = 0;
  for (let index = 0; index < visitorsPerCopy; index += 1) {
    controlClicks += drawClick("listen", rng);
    treatmentClicks += drawClick("next", rng);
  }
  return {
    simulated: true as const,
    transport: "dry-run" as const,
    feature: COPY_FEATURE,
    experiment: COPY_EXPERIMENT,
    hypothesis: HYPOTHESIS,
    copies: COPIES,
    seed,
    visitorsPerCopy,
    result: compareProportions(controlClicks, visitorsPerCopy, treatmentClicks, visitorsPerCopy),
    note: NOTE,
  };
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && path.resolve(entry) === fileURLToPath(import.meta.url);
}

function readPositive(args: string[], index: number, fallback: number): number {
  const numbers = args.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return numbers[index] ?? fallback;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const visitorsPerCopy = readPositive(args, 0, 200);
  const seed = readPositive(args, 1, 11);
  const summary = runCopyDry(visitorsPerCopy, seed);
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "last-dry-run.json");
  await writeFile(file, `${JSON.stringify(summary, null, 2)}\n`);
  const { controlClicks, controlVisitors, treatmentClicks, treatmentVisitors } = summary.result;
  const controlPct = ((controlClicks / controlVisitors) * 100).toFixed(1);
  const treatmentPct = ((treatmentClicks / treatmentVisitors) * 100).toFixed(1);
  console.log(
    `Listen ${controlClicks} clicks (${controlPct}%) and Next ${treatmentClicks} clicks (${treatmentPct}%).`,
  );
}

if (isDirectRun()) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Copy dry run failed.");
    process.exit(1);
  });
}
