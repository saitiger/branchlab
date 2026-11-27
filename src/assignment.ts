import { GUIDED_VARIANT, type Assignment, type FlagView, type ProductMode } from "./types.js";

export function productMode(variantKey: string | null): ProductMode {
  return variantKey === GUIDED_VARIANT ? "guided" : "freeform";
}

export function assignmentFromFlag(flag: FlagView | null): Assignment {
  if (!flag || flag.source !== "server" || !flag.enabled || !flag.inExperiment || !flag.variant) {
    return {
      mode: "freeform",
      recording: false,
      variantKey: flag?.variant ?? null,
      status: "unrecorded",
    };
  }
  return {
    mode: productMode(flag.variant),
    recording: true,
    variantKey: flag.variant,
    status: "enrolled",
  };
}

export function showsSuggestions(assignment: Assignment): boolean {
  return assignment.recording && assignment.mode === "guided";
}
