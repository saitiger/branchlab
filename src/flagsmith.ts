import { assignmentFromFlag } from "./assignment.js";
import { FEATURE, type Assignment, type ExperimentClient, type MetricIntent } from "./types.js";

const STEP_MS = 8_000;

export interface LiveAssignment extends Assignment {
  exposed: boolean;
}

export async function loadLive(
  client: ExperimentClient,
  participantId: string,
  feature = FEATURE,
): Promise<LiveAssignment> {
  const unrecorded: LiveAssignment = {
    mode: "freeform",
    recording: false,
    variantKey: null,
    status: "unrecorded",
    exposed: false,
  };
  if (!participantId) return unrecorded;
  try {
    await withTimeout(client.identify(participantId));
    const flag = client.getExperimentFlag(feature);
    const assignment = assignmentFromFlag(flag);
    return { ...assignment, exposed: assignment.recording };
  } catch {
    return unrecorded;
  }
}

export async function sendMetrics(
  client: ExperimentClient,
  live: LiveAssignment,
  intents: MetricIntent[],
  sent: Set<string>,
): Promise<Set<string>> {
  const next = new Set(sent);
  if (!live.recording || !live.exposed) return next;
  for (const intent of intents) {
    const key = intent.point === null ? `story:${intent.name}` : `${intent.point}:${intent.name}`;
    if (next.has(key)) continue;
    try {
      client.trackEvent(intent.name, intent.value);
      next.add(key);
    } catch {
      return next;
    }
  }
  try {
    await client.flush();
  } catch {
    try {
      await client.flush();
    } catch {
      // The sent bits stay set. A later attempt flushes and does not track again.
    }
  }
  return next;
}

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("flagsmith timed out")), STEP_MS);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
