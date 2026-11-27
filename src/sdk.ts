import type { ExperimentClient, FlagView } from "./types.js";

interface FlagsmithFlag {
  enabled?: boolean;
  variant?: string | null;
  experiment?: { inExperiment?: boolean } | null;
}

interface FlagsmithLike {
  init(options: { environmentID: string; enableEvents: boolean }): Promise<unknown>;
  identify(id: string): Promise<unknown>;
  getExperimentFlag(feature: string): FlagsmithFlag | null;
  trackEvent(name: string, payload?: { value?: number }): void;
  flushEvents(): Promise<unknown>;
  loadingState?: { source?: string };
}

export async function createFlagsmithClient(environmentKey: string): Promise<ExperimentClient> {
  const imported = (await import("@flagsmith/flagsmith")) as unknown as { default: FlagsmithLike };
  const flagsmith = imported.default;
  await flagsmith.init({ environmentID: environmentKey, enableEvents: true });
  return {
    identify: (id) => Promise.resolve(flagsmith.identify(id)).then(() => undefined),
    getExperimentFlag(feature): FlagView | null {
      const flag = flagsmith.getExperimentFlag(feature);
      if (!flag) return null;
      return {
        enabled: Boolean(flag.enabled),
        variant: flag.variant ?? null,
        inExperiment: Boolean(flag.experiment?.inExperiment),
        source: sourceOf(flagsmith.loadingState?.source),
      };
    },
    trackEvent(name, value) {
      flagsmith.trackEvent(name, value === undefined ? undefined : { value });
    },
    async flush() {
      await flagsmith.flushEvents();
    },
  };
}

function sourceOf(source: string | undefined): FlagView["source"] {
  if (source === "SERVER") return "server";
  if (source === "CACHE") return "cache";
  return "none";
}
