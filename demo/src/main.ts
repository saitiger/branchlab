import { BEATS, mockReply } from "./beats.js";
import {
  computeMetrics,
  createParticipantId,
  createSession,
  liveEvents,
  loadLive,
  metricsByMode,
  reduce,
  sendMetrics,
  type Assignment,
  type ExperimentClient,
  type DomainEvent,
  type LiveAssignment,
  type Session,
} from "../../src/index.js";

const PARTICIPANT = "branchlab.participant";
const LOG = "branchlab.liveLog";
const SESSION = "branchlab.session";
const TAB = "branchlab.tab";

type Screen = "home" | "story" | "results";

const app = document.querySelector("#app");
if (!(app instanceof HTMLElement)) throw new Error("missing app");
const rootEl: HTMLElement = app;

let screen: Screen = "home";
let session: Session | null = readSession();
let log: DomainEvent[] = readLog();
let live: LiveAssignment | null = null;
let sent = new Set<string>();
let reply = "";
let recognition: SpeechRecognitionLike | null = null;
let hearing = false;

boot();
render();

function boot() {
  const stored = session;
  const tab = sessionStorage.getItem(TAB);
  sessionStorage.setItem(TAB, "open");
  if (stored && !tab && !stored.completed && !stored.abandoned && !stored.failed) {
    const step = reduce(stored, { type: "tab-missing" }, Date.now());
    session = step.session;
    log = [...log, ...step.domain];
    void deliver(step.metrics);
    save();
  }
}

function render() {
  rootEl.innerHTML = "";
  if (screen === "home") rootEl.append(home());
  else if (screen === "results") rootEl.append(results());
  else rootEl.append(story());
}

function home(): HTMLElement {
  const root = el("section");
  root.append(mark(), heading("BranchLab"), paragraph("A three-beat conversation with Ivo, the night clerk. One visitor is freeform. Another also gets suggested replies. Flagsmith assigns the version and keeps the official result."));
  const row = el("div", "row");
  row.append(
    button("Start the live story", "primary", () => void startLive()),
    button("Preview freeform", "", () => startPreview("freeform")),
    button("Preview guided", "", () => startPreview("guided")),
    button("View results", "", () => {
      screen = "results";
      render();
    }),
  );
  root.append(row);
  root.append(paragraph("Preview plays the same mock and records nothing. The live story asks Flagsmith only after you start."));
  return root;
}

async function startLive() {
  screen = "story";
  reply = "";
  live = null;
  render();
  const key = import.meta.env.FLAGSMITH_CLIENT_SIDE_ENVIRONMENT_KEY ?? "";
  const participantId = participant();
  if (!key) {
    live = { mode: "freeform", recording: false, variantKey: null, status: "unrecorded", exposed: false };
  } else {
    try {
      const { createFlagsmithClient } = await import("../../src/sdk.js");
      const client = await createFlagsmithClient(key);
      live = await loadLive(client, participantId);
      holdClient(client);
    } catch {
      live = { mode: "freeform", recording: false, variantKey: null, status: "unrecorded", exposed: false };
    }
  }
  const step = createSession({
    participantId,
    sessionId: crypto.randomUUID(),
    mode: live.mode,
    record: live.recording,
    at: Date.now(),
  });
  session = step.session;
  if (live.recording) log = [...log, ...step.domain];
  save();
  openPoint();
}

function startPreview(mode: Assignment["mode"]) {
  live = { mode, recording: false, variantKey: mode, status: "unrecorded", exposed: false };
  reply = "";
  const step = createSession({
    participantId: "preview",
    sessionId: crypto.randomUUID(),
    mode,
    record: false,
    at: Date.now(),
  });
  session = step.session;
  screen = "story";
  openPoint();
}

function story(): HTMLElement {
  const root = el("section", "story");
  const current = session;
  if (!current || !live) {
    root.append(paragraph("Assigning you to a version…"));
    return root;
  }
  root.append(el("p", "status", statusLine()));
  if (current.completed) {
    root.append(heading("The exchange is finished", "h2"), paragraph(reply || mockReply(2)));
    root.append(actions());
    return root;
  }
  if (current.failed || current.abandoned) {
    root.append(heading(current.abandoned ? "Ivo closed the counter." : "The reply did not land.", "h2"));
    root.append(actions());
    return root;
  }
  const beat = BEATS[current.beat];
  if (!beat || current.openPoint === null) {
    root.append(paragraph("Assigning you to a version…"));
    return root;
  }
  root.append(el("p", "prompt", beat.prompt));
  if (current.mode === "guided") {
    const suggestions = el("div", "suggestions");
    for (const label of beat.suggestions) {
      suggestions.append(button(label, "", () => choose("suggestion", label)));
    }
    root.append(suggestions);
  }
  const talk = el("div", "talk");
  const input = document.createElement("input");
  input.placeholder = "Type a reply";
  input.setAttribute("aria-label", "Typed reply");
  const send = button("Send", "", () => {
    const words = input.value.trim();
    if (!words) return;
    choose("text", words);
  });
  talk.append(input, send);
  if (speechAvailable()) {
    const mic = button(hearing ? "Listening…" : "Hold to talk", "", () => {});
    mic.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      beginSpeech();
    });
    mic.addEventListener("pointerup", () => stopSpeech());
    mic.addEventListener("pointerleave", () => stopSpeech());
    talk.append(mic);
  }
  root.append(talk);
  if (reply) root.append(el("p", "reply", reply));
  root.append(actions());
  return root;
}

function actions(): HTMLElement {
  const row = el("div", "row");
  row.append(
    button("Results", "", () => {
      screen = "results";
      render();
    }),
    button("Back", "", () => {
      screen = "home";
      render();
    }),
  );
  return row;
}

function openPoint() {
  if (!session) return;
  const step = reduce(session, { type: "reach" }, Date.now());
  session = step.session;
  log = [...log, ...step.domain];
  save();
  render();
}

function choose(channel: "suggestion" | "voice" | "text", words: string) {
  if (!session || session.latched) return;
  stopSpeech();
  const latched = reduce(session, { type: "latch", channel }, Date.now());
  session = latched.session;
  log = [...log, ...latched.domain];
  save();
  const point = session.beat;
  const text = mockReply(point);
  void words;
  window.setTimeout(() => finish(text), 280);
  render();
}

function finish(text: string) {
  if (!session) return;
  const step = reduce(session, { type: "mock-ok" }, Date.now());
  session = step.session;
  log = [...log, ...step.domain];
  reply = text;
  void deliver(step.metrics);
  save();
  if (!session.completed && !session.failed) openPoint();
  else render();
}

async function deliver(metrics: Parameters<typeof sendMetrics>[2]) {
  const client = currentClient;
  if (!client || !live || metrics.length === 0) return;
  sent = await sendMetrics(client, live, metrics, sent);
}

let currentClient: ExperimentClient | null = null;
function holdClient(client: ExperimentClient) {
  currentClient = client;
}

function beginSpeech() {
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Ctor || !session || session.latched) return;
  const step = reduce(session, { type: "recognition-start" }, Date.now());
  session = step.session;
  log = [...log, ...step.domain];
  save();
  recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const words = event.results[0]?.[0]?.transcript?.trim() ?? "";
    if (words) choose("voice", words);
    else emptySpeech();
  };
  recognition.onerror = () => emptySpeech();
  recognition.onend = () => {
    hearing = false;
  };
  hearing = true;
  recognition.start();
  render();
}

function stopSpeech() {
  hearing = false;
  recognition?.stop();
}

function emptySpeech() {
  if (!session) return;
  const step = reduce(session, { type: "recognition-empty" }, Date.now());
  session = step.session;
  hearing = false;
  save();
  render();
}

function results(): HTMLElement {
  const root = el("section");
  root.append(mark(), heading("Results", "h2"));
  root.append(paragraph("These cards are this browser's log and a simulated file. Official win probability stays on the Flagsmith experiment page."));
  root.append(panel("Live", liveEvents(log), "No live sessions yet."));
  const simulated = el("div", "panel");
  simulated.append(heading("Simulated", "h2"), el("p", "note", "Loading the simulated cohort…"));
  root.append(simulated);
  void fetch("/simulated.json")
    .then((response) => (response.ok ? response.json() : null))
    .then((file: { transport?: string; events?: DomainEvent[] } | null) => {
      simulated.innerHTML = "";
      if (!file?.events) {
        simulated.append(heading("Simulated", "h2"), el("p", "note", "No simulated run yet."));
        return;
      }
      const title = file.transport === "dry-run" ? "Simulated dry run" : "Simulated cohort";
      const note = file.transport === "dry-run"
        ? "Flagsmith did not assign these users."
        : "These rows were sent through Flagsmith and are labeled simulated.";
      simulated.append(heading(title, "h2"), el("p", "note", note), cards(file.events));
    })
    .catch(() => {
      simulated.innerHTML = "";
      simulated.append(heading("Simulated", "h2"), el("p", "note", "The simulated file could not be read. Live cards are unchanged."));
    });
  root.append(actions());
  return root;
}

function panel(title: string, events: DomainEvent[], empty: string): HTMLElement {
  const wrap = el("div", "panel");
  wrap.append(heading(title, "h2"));
  if (events.length === 0) {
    wrap.append(el("p", "note", empty));
    return wrap;
  }
  wrap.append(cards(events));
  const split = metricsByMode(events);
  const free = split.freeform.cards[0]?.denominator ?? 0;
  const guided = split.guided.cards[0]?.denominator ?? 0;
  if (free > 0 && guided > 0) {
    wrap.append(el("p", "note", "Both versions are in this log."));
    wrap.append(heading("Freeform", "h2"), cards(events.filter((event) => event.variant === "freeform")));
    wrap.append(heading("Guided", "h2"), cards(events.filter((event) => event.variant === "guided")));
  }
  return wrap;
}

function cards(events: DomainEvent[]): HTMLElement {
  const grid = el("div", "cards");
  const dashboard = computeMetrics(events, Date.now());
  for (const card of dashboard.cards) {
    const item = el("article", "card");
    item.append(el("span", "", card.label), el("b", "", formatCard(card)));
    grid.append(item);
  }
  if (dashboard.openElapsedMs !== null) {
    const item = el("article", "card");
    item.append(el("span", "", "Open session"), el("b", "", `${Math.round(dashboard.openElapsedMs / 1000)}s`));
    grid.append(item);
  }
  return grid;
}

function formatCard(card: { unit: string; value: number | null }): string {
  if (card.value === null) return "—";
  if (card.unit === "ratio") return `${Math.round(card.value * 1000) / 10}%`;
  if (card.unit === "ms") return `${Math.round(card.value)} ms`;
  return String(Math.round(card.value * 10) / 10);
}

function statusLine(): string {
  if (!live || !session) return "not exposed yet";
  if (session.participantId === "preview") return `Preview · ${session.mode} · records nothing`;
  if (live.status === "enrolled") return `Enrolled · ${session.mode}`;
  return "Unrecorded · freeform";
}

function participant(): string {
  const existing = localStorage.getItem(PARTICIPANT);
  if (existing) return existing;
  const id = createParticipantId();
  localStorage.setItem(PARTICIPANT, id);
  return id;
}

function save() {
  if (session?.record) {
    localStorage.setItem(SESSION, JSON.stringify(session));
    localStorage.setItem(LOG, JSON.stringify(log));
  }
}

function readSession(): Session | null {
  const raw = localStorage.getItem(SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function readLog(): DomainEvent[] {
  const raw = localStorage.getItem(LOG);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as DomainEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mark(): HTMLElement {
  return el("p", "mark", "BranchLab");
}

function heading(text: string, tag: "h1" | "h2" = "h1"): HTMLElement {
  return el(tag, "", text);
}

function paragraph(text: string): HTMLElement {
  return el("p", "lede", text);
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const node = document.createElement("button");
  node.type = "button";
  node.textContent = label;
  if (className) node.className = className;
  node.addEventListener("click", onClick);
  return node;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function speechAvailable(): boolean {
  return Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition);
}

window.setInterval(() => {
  if (!session || screen !== "story" || !live?.recording) return;
  const step = reduce(session, { type: "tick" }, Date.now());
  if (!step.session.abandoned) return;
  session = step.session;
  log = [...log, ...step.domain];
  void deliver(step.metrics);
  save();
  render();
}, 1000);

window.addEventListener("pagehide", () => {
  if (!session || !live?.recording) return;
  reduce(session, { type: "pagehide" }, Date.now());
  void currentClient?.flush();
});
