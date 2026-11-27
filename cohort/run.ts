import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFlagsmithClient } from "../src/sdk.js";
import { createParticipantId } from "../src/participant.js";
import type { DomainEvent, ExperimentClient, FlagView } from "../src/types.js";
import { mulberry32 } from "./model.js";
import { playIdentity } from "./play.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

interface CohortFile {
  transport: "flagsmith" | "dry-run";
  simulated: true;
  model: "interaction_mode";
  createdAt: string;
  events: DomainEvent[];
}

async function main() {
  const args = process.argv.slice(2);
  const count = readNumber(args, 20);
  const seed = readSeed(args, 1);
  const dryRun = args.includes("dry-run") || args.includes("--dry-run");
  if (!dryRun) {
    const key = await readKey();
    if (!key) {
      console.error("Set FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY. Refusing to identify anyone.");
      process.exit(1);
    }
    await run(await createFlagsmithClient(key), count, seed, "flagsmith");
    return;
  }
  await run(dryClient(), count, seed, "dry-run");
}

async function run(client: ExperimentClient, count: number, seed: number, transport: CohortFile["transport"]) {
  const rng = mulberry32(seed);
  const events: DomainEvent[] = [];
  for (let index = 0; index < count; index += 1) {
    const played = await playIdentity(client, createParticipantId(), rng, 1_000 + index);
    events.push(...played.events);
  }
  const file: CohortFile = {
    transport,
    simulated: true,
    model: "interaction_mode",
    createdAt: new Date().toISOString(),
    events,
  };
  const body = JSON.stringify(file, null, 2);
  await mkdir(path.join(root, "cohort", "runs"), { recursive: true });
  await mkdir(path.join(root, "demo", "public"), { recursive: true });
  const stamp = file.createdAt.replace(/[:.]/g, "-");
  await writeFile(path.join(root, "cohort", "runs", `${stamp}.json`), body);
  await writeFile(path.join(root, "demo", "public", "simulated.json"), body);
  const label = transport === "dry-run" ? "Dry run. Flagsmith did not assign these users." : "Sent through Flagsmith.";
  console.log(`${label} ${count} synthetic users. Events: ${events.length}.`);
}

function dryClient(): ExperimentClient {
  let index = 0;
  return {
    async identify() {
      index += 1;
    },
    getExperimentFlag(): FlagView {
      const guided = index % 2 === 0;
      return { enabled: true, variant: guided ? "guided" : "control", inExperiment: true, source: "server" };
    },
    trackEvent() {},
    async flush() {},
  };
}

function readNumber(args: string[], fallback: number): number {
  const numbers = args.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return numbers[0] ?? fallback;
}

function readSeed(args: string[], fallback: number): number {
  const numbers = args.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return numbers[1] ?? fallback;
}

async function readKey(): Promise<string> {
  if (process.env.FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY) return process.env.FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY;
  try {
    const text = await readFile(path.join(root, ".env"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY=(.*)$/);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    return "";
  }
  return "";
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Cohort failed.");
  process.exit(1);
});
