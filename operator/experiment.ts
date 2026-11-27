import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export interface ExperimentFile {
  feature: string;
  experimentName: string;
  experimentId: number | null;
  controlValue: string;
  treatmentKey: string;
  treatmentValue: string;
  primaryEvent: string;
}

export function repoRoot(): string {
  return root;
}

export async function readExperiment(): Promise<ExperimentFile> {
  const text = await readFile(path.join(root, "experiment.json"), "utf8");
  return JSON.parse(text) as ExperimentFile;
}

export function shipPlan(experiment: ExperimentFile, variation: string): string {
  const value = variation === experiment.treatmentKey ? experiment.treatmentValue : variation;
  return [
    `End ${experiment.experimentName} (id ${experiment.experimentId ?? "unset"}).`,
    `Then set ${experiment.feature} to "${value}" and leave it enabled.`,
    "The flag stays. Losing variations are left in place.",
  ].join(" ");
}
