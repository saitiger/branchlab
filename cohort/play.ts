import { createSession, reduce, type Session, type Step } from "../src/session.js";
import { loadLive, sendMetrics, type LiveAssignment } from "../src/flagsmith.js";
import { POINT_COUNT, type DomainEvent, type ExperimentClient, type ProductMode } from "../src/types.js";
import { drawPoint } from "./model.js";

export interface PlayResult {
  participantId: string;
  assignment: LiveAssignment;
  events: DomainEvent[];
}

export async function playIdentity(
  client: ExperimentClient,
  participantId: string,
  rng: () => number,
  at = 1_000,
): Promise<PlayResult> {
  const assignment = await loadLive(client, participantId);
  if (!assignment.recording) return { participantId, assignment, events: [] };
  let sent = new Set<string>();
  let cursor = at;
  let step = createSession({
    participantId,
    sessionId: crypto.randomUUID(),
    mode: assignment.mode,
    record: true,
    simulated: true,
    at: cursor,
  });
  sent = await sendMetrics(client, assignment, step.metrics, sent);
  const events = [...step.domain];
  let session: Session = step.session;
  for (let point = 0; point < POINT_COUNT; point += 1) {
    cursor += 1_000;
    const reached = apply(session, { type: "reach" }, cursor);
    session = reached.session;
    events.push(...reached.domain);
    const draw = drawPoint(session.mode, rng);
    if (draw.channel === "unanswered") {
      cursor += 60_000;
      const abandoned = apply(session, { type: "tick" }, cursor);
      session = abandoned.session;
      events.push(...abandoned.domain);
      sent = await sendMetrics(client, assignment, abandoned.metrics, sent);
      break;
    }
    cursor += draw.latencyMs ?? 0;
    const latched = apply(session, { type: "latch", channel: draw.channel }, cursor);
    session = latched.session;
    events.push(...latched.domain);
    cursor += 200;
    const finished = apply(session, { type: "mock-ok" }, cursor);
    session = finished.session;
    events.push(...finished.domain);
    sent = await sendMetrics(client, assignment, finished.metrics, sent);
  }
  return { participantId, assignment, events };
}

function apply(session: Session, action: Parameters<typeof reduce>[1], at: number): Step {
  return reduce(session, action, at);
}

export function modeOf(variant: string | null): ProductMode {
  return variant === "guided" ? "guided" : "freeform";
}
