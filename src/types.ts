export const EXPERIMENT_ID = "interaction_mode_experiment" as const;
export const FEATURE = "interaction_mode" as const;
export const GUIDED_VARIANT = "guided" as const;
export const POINT_COUNT = 3;
export const IDLE_MS = 60_000;

export type ProductMode = "freeform" | "guided";
export type Channel = "suggestion" | "voice" | "text";

export type DomainEventName =
  | "session_started"
  | "interaction_point_reached"
  | "suggestion_displayed"
  | "voice_response_started"
  | "voice_response_completed"
  | "text_response_submitted"
  | "suggestion_selected"
  | "ai_response_completed"
  | "story_completed"
  | "session_abandoned"
  | "interaction_resolved";

export interface DomainEvent {
  experimentId: typeof EXPERIMENT_ID;
  variant: ProductMode;
  participantId: string;
  sessionId: string;
  at: number;
  name: DomainEventName;
  point?: number;
  value?: number;
  latencyMs?: number;
  simulated?: boolean;
}

export type MetricName =
  | "interaction_resolved"
  | "response_latency_ms"
  | "story_completed";

export interface MetricIntent {
  name: MetricName;
  point: number | null;
  value?: number;
}

export interface FlagView {
  enabled: boolean;
  variant: string | null;
  inExperiment: boolean;
  source: "server" | "cache" | "none";
}

export interface Assignment {
  mode: ProductMode;
  recording: boolean;
  variantKey: string | null;
  status: "enrolled" | "unrecorded";
}

export interface ExperimentClient {
  identify(id: string): Promise<void>;
  getExperimentFlag(feature: string): FlagView | null;
  trackEvent(name: string, value?: number): void;
  flush(): Promise<void>;
}
