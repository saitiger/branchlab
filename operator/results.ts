import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { computeMetrics } from "../src/metrics.js";
import type { DomainEvent } from "../src/types.js";
import { environmentKey, runFlagsmith } from "./cli.js";
import { readExperiment, repoRoot } from "./experiment.js";

const REFRESH_MS = 5 * 60 * 1000;

async function main() {
  await printLocal();
  const experiment = await readExperiment();
  if (!experiment.experimentId) {
    console.log("experiment.json has no experimentId yet. Official results stay in Flagsmith until the experiment exists.");
    return;
  }
  let cli;
  try {
    cli = await runFlagsmith(["environment", "get", "--json"]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Flagsmith CLI is not installed.");
    return;
  }
  if (cli.code !== 0) {
    console.error(cli.stderr.trim() || "flagsmith environment get failed.");
    return;
  }
  const key = environmentKey(cli.stdout);
  const base = `api/v1/environments/${key}/experiments/${experiment.experimentId}`;
  if (await refreshDue()) {
    const refresh = await runFlagsmith(["api", "POST", `${base}/results/refresh/`, "--input", "-"], "{}");
    if (refresh.code !== 0) {
      console.error(refresh.stderr.trim() || refresh.stdout.trim() || "Results refresh failed.");
      return;
    }
    await markRefresh();
  }
  const results = await runFlagsmith(["api", "GET", `${base}/results/`, "--json"]);
  if (results.code !== 0) {
    console.error(results.stderr.trim() || "Could not read experiment results.");
    return;
  }
  console.log(summarize(results.stdout));
}

async function printLocal() {
  const file = await latestCohort();
  if (!file) {
    console.log("No simulated run yet.");
    return;
  }
  const parsed = JSON.parse(await readFile(file.file, "utf8")) as { transport?: string; events?: DomainEvent[] };
  const dashboard = computeMetrics(parsed.events ?? []);
  console.log(`Local simulated file (${parsed.transport ?? "unknown"}): ${path.basename(file.file)}`);
  for (const card of dashboard.cards) {
    const shown = card.value === null ? "—" : card.unit === "ratio" ? `${Math.round(card.value * 1000) / 10}%` : String(Math.round(card.value));
    console.log(`  ${card.label}: ${shown}`);
  }
}

function summarize(json: string): string {
  const body = JSON.parse(json) as Record<string, unknown>;
  const lines = ["Flagsmith results"];
  const winning = findString(body, ["winning_variation", "winningVariation", "winner"]);
  const chance = findNumber(body, ["chance_to_be_best", "chanceToBeBest", "win_probability"]);
  if (winning) lines.push(`Winning variation: ${winning}`);
  if (chance !== null) lines.push(`Chance to be best: ${chance}`);
  if (lines.length === 1) lines.push("Refresh returned a payload without a win summary yet. Open the experiment in Flagsmith if this stays empty.");
  return lines.join("\n");
}

function findString(value: unknown, keys: string[]): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findString(item, keys);
      if (found) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "string") return record[key];
  }
  for (const nested of Object.values(record)) {
    const found = findString(nested, keys);
    if (found) return found;
  }
  return null;
}

function findNumber(value: unknown, keys: string[]): number | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNumber(item, keys);
      if (found !== null) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    if (typeof record[key] === "number") return record[key];
  }
  for (const nested of Object.values(record)) {
    const found = findNumber(nested, keys);
    if (found !== null) return found;
  }
  return null;
}

async function latestCohort(): Promise<{ file: string; mtime: number } | null> {
  const dir = path.join(repoRoot(), "cohort", "runs");
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return null;
  }
  let best: { file: string; mtime: number } | null = null;
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const file = path.join(dir, name);
    const info = await stat(file);
    if (!best || info.mtimeMs > best.mtime) best = { file, mtime: info.mtimeMs };
  }
  return best;
}

async function refreshDue(): Promise<boolean> {
  try {
    const text = await readFile(path.join(repoRoot(), "operator", "state.json"), "utf8");
    const state = JSON.parse(text) as { lastRefresh?: number };
    return Date.now() - (state.lastRefresh ?? 0) >= REFRESH_MS;
  } catch {
    return true;
  }
}

async function markRefresh() {
  const file = path.join(repoRoot(), "operator", "state.json");
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ lastRefresh: Date.now() }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Could not read results.");
  process.exit(1);
});
