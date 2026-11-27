import {
  EXPERIMENT_ID,
  IDLE_MS,
  POINT_COUNT,
  type Channel,
  type DomainEvent,
  type MetricIntent,
  type ProductMode,
} from "./types.js";

export interface Session {
  participantId: string;
  sessionId: string;
  mode: ProductMode;
  record: boolean;
  simulated: boolean;
  beat: number;
  started: boolean;
  completed: boolean;
  abandoned: boolean;
  failed: boolean;
  openPoint: number | null;
  idleMs: number;
  idleMark: number | null;
  recognizing: boolean;
  latched: { channel: Channel; at: number } | null;
  ledger: Record<string, true>;
}

export type Action =
  | { type: "reach" }
  | { type: "recognition-start" }
  | { type: "recognition-empty" }
  | { type: "latch"; channel: Channel }
  | { type: "mock-ok" }
  | { type: "mock-fail" }
  | { type: "tick" }
  | { type: "pagehide" }
  | { type: "tab-missing" };

export interface Step {
  session: Session;
  domain: DomainEvent[];
  metrics: MetricIntent[];
}

export function createSession(input: {
  participantId: string;
  sessionId: string;
  mode: ProductMode;
  record: boolean;
  simulated?: boolean;
  at: number;
}): Step {
  const session: Session = {
    participantId: input.participantId,
    sessionId: input.sessionId,
    mode: input.mode,
    record: input.record,
    simulated: input.simulated ?? false,
    beat: 0,
    started: true,
    completed: false,
    abandoned: false,
    failed: false,
    openPoint: null,
    idleMs: 0,
    idleMark: null,
    recognizing: false,
    latched: null,
    ledger: {},
  };
  return emit(session, [domain(session, "session_started", input.at)], []);
}

export function reduce(session: Session, action: Action, at: number): Step {
  const next = clone(session);
  if (next.completed || next.abandoned || next.failed) return quiet(next);

  switch (action.type) {
    case "pagehide":
      return quiet(next);
    case "reach":
      return reach(next, at);
    case "recognition-start":
      return startRecognition(next, at);
    case "recognition-empty":
      return stopRecognition(next, at);
    case "latch":
      return latch(next, action.channel, at);
    case "mock-ok":
      return mockOk(next, at);
    case "mock-fail":
      return mockFail(next, at);
    case "tick":
    case "tab-missing":
      return maybeAbandon(next, at, action.type === "tick");
    default:
      return quiet(next);
  }
}

export function ledgerKey(sessionId: string, point: number | null, metric: string): string {
  return point === null ? `${sessionId}:story:${metric}` : `${sessionId}:${point}:${metric}`;
}

function reach(session: Session, at: number): Step {
  if (session.openPoint !== null || session.latched || session.beat >= POINT_COUNT) return quiet(session);
  session.openPoint = session.beat;
  session.idleMs = 0;
  session.idleMark = at;
  session.recognizing = false;
  session.latched = null;
  const events = [domain(session, "interaction_point_reached", at, { point: session.beat })];
  if (session.mode === "guided") events.push(domain(session, "suggestion_displayed", at, { point: session.beat }));
  return emit(session, events, []);
}

function startRecognition(session: Session, at: number): Step {
  if (session.openPoint === null || session.latched || session.recognizing) return quiet(session);
  accrue(session, at);
  session.idleMark = null;
  session.recognizing = true;
  return emit(session, [domain(session, "voice_response_started", at, { point: session.openPoint })], []);
}

function stopRecognition(session: Session, at: number): Step {
  if (!session.recognizing) return quiet(session);
  session.recognizing = false;
  session.idleMark = at;
  return quiet(session);
}

function latch(session: Session, channel: Channel, at: number): Step {
  if (session.openPoint === null || session.latched) return quiet(session);
  if (session.recognizing) session.recognizing = false;
  accrue(session, at);
  session.idleMark = null;
  session.latched = { channel, at };
  const name =
    channel === "suggestion"
      ? "suggestion_selected"
      : channel === "voice"
        ? "voice_response_completed"
        : "text_response_submitted";
  return emit(session, [domain(session, name, at, { point: session.openPoint })], []);
}

function mockOk(session: Session, at: number): Step {
  if (session.openPoint === null || !session.latched) return quiet(session);
  const point = session.openPoint;
  const latencyMs = at - session.latched.at;
  const domainEvents = [domain(session, "ai_response_completed", at, { point })];
  const metrics: MetricIntent[] = [];
  const resolved = takeMetric(session, "interaction_resolved", point, 1);
  if (resolved) {
    domainEvents.push(domain(session, "interaction_resolved", at, { point, value: 1, latencyMs }));
    metrics.push({ name: "interaction_resolved", point, value: 1 });
    const latency = takeMetric(session, "response_latency_ms", point, latencyMs);
    if (latency) metrics.push({ name: "response_latency_ms", point, value: latencyMs });
  }
  session.latched = null;
  session.openPoint = null;
  session.idleMark = null;
  if (point === POINT_COUNT - 1) {
    session.completed = true;
    domainEvents.push(domain(session, "story_completed", at));
    const done = takeMetric(session, "story_completed", null, true);
    if (done) metrics.push({ name: "story_completed", point: null });
  } else {
    session.beat = point + 1;
  }
  return emit(session, domainEvents, metrics);
}

function mockFail(session: Session, at: number): Step {
  if (session.openPoint === null || !session.latched) return quiet(session);
  const point = session.openPoint;
  const domainEvents: DomainEvent[] = [];
  const metrics: MetricIntent[] = [];
  const resolved = takeMetric(session, "interaction_resolved", point, 0);
  if (resolved) {
    domainEvents.push(domain(session, "interaction_resolved", at, { point, value: 0 }));
    metrics.push({ name: "interaction_resolved", point, value: 0 });
  }
  session.failed = true;
  session.latched = null;
  session.openPoint = null;
  session.idleMark = null;
  return emit(session, domainEvents, metrics);
}

function maybeAbandon(session: Session, at: number, requireIdle: boolean): Step {
  if (!session.started) return quiet(session);
  if (requireIdle) {
    if (session.latched || session.openPoint === null || session.idleMark === null) return quiet(session);
    if (session.idleMs + (at - session.idleMark) < IDLE_MS) return quiet(session);
  }
  const domainEvents = [domain(session, "session_abandoned", at)];
  const metrics: MetricIntent[] = [];
  if (session.openPoint !== null) {
    const point = session.openPoint;
    const resolved = takeMetric(session, "interaction_resolved", point, 0);
    if (resolved) {
      domainEvents.push(domain(session, "interaction_resolved", at, { point, value: 0 }));
      metrics.push({ name: "interaction_resolved", point, value: 0 });
    }
  }
  session.abandoned = true;
  session.recognizing = false;
  session.idleMark = null;
  return emit(session, domainEvents, metrics);
}

function takeMetric(session: Session, metric: string, point: number | null, _value: number | true): boolean {
  const key = ledgerKey(session.sessionId, point, metric);
  if (session.ledger[key]) return false;
  session.ledger[key] = true;
  return true;
}

function accrue(session: Session, at: number) {
  if (session.idleMark === null) return;
  session.idleMs += at - session.idleMark;
  session.idleMark = null;
}

function domain(
  session: Session,
  name: DomainEvent["name"],
  at: number,
  extra: Partial<Pick<DomainEvent, "point" | "value" | "latencyMs">> = {},
): DomainEvent {
  return {
    experimentId: EXPERIMENT_ID,
    variant: session.mode,
    participantId: session.participantId,
    sessionId: session.sessionId,
    at,
    name,
    ...(session.simulated ? { simulated: true } : {}),
    ...extra,
  };
}

function emit(session: Session, domainEvents: DomainEvent[], metrics: MetricIntent[]): Step {
  if (!session.record) return { session, domain: [], metrics: [] };
  return { session, domain: domainEvents, metrics };
}

function quiet(session: Session): Step {
  return { session, domain: [], metrics: [] };
}

function clone(session: Session): Session {
  return {
    ...session,
    latched: session.latched ? { ...session.latched } : null,
    ledger: { ...session.ledger },
  };
}
