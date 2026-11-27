export type Cohort = "synthetic-gate" | "text-check" | "children" | "not-this-round";

export interface ExperimentSpec {
  id: string;
  flag: string;
  controlKey: string;
  controlValue: string;
  treatmentKey: string;
  treatmentValue: string;
  primaryEvent: string;
  aggregation: "mean" | "occurrence";
  direction: "up" | "down";
  cohort: Cohort;
  claim: string;
}

/** Six experiments. The story app stays in a private repository and sends these event names. */
export const PROGRAM: ExperimentSpec[] = [
  {
    id: "character_want",
    flag: "character_want",
    controlKey: "obey",
    controlValue: "obey",
    treatmentKey: "want",
    treatmentValue: "want",
    primaryEvent: "unprompted_reply",
    aggregation: "occurrence",
    direction: "up",
    cohort: "synthetic-gate",
    claim: "A synthetic gate of 24 paired plays. Children are assigned only after the gate passes.",
  },
  {
    id: "situation_opening",
    flag: "situation_opening",
    controlKey: "bare",
    controlValue: "bare",
    treatmentKey: "concrete",
    treatmentValue: "concrete",
    primaryEvent: "usable_first_answer",
    aggregation: "mean",
    direction: "up",
    cohort: "text-check",
    claim: "A synthetic check of the question text only. A simulated answer is not a result about children.",
  },
  {
    id: "hero_address",
    flag: "hero_address",
    controlKey: "guide",
    controlValue: "guide",
    treatmentKey: "be",
    treatmentValue: "be",
    primaryEvent: "first_person",
    aggregation: "mean",
    direction: "up",
    cohort: "not-this-round",
    claim: "Not this round. A simulated reply copies the pronoun in the question, so it cannot decide this.",
  },
  {
    id: "interaction_mode",
    flag: "interaction_mode",
    controlKey: "control",
    controlValue: "freeform",
    treatmentKey: "guided",
    treatmentValue: "guided",
    primaryEvent: "chip_exact",
    aggregation: "mean",
    direction: "up",
    cohort: "children",
    claim: "Real visits only. Share of answers that match a shown reply, plus usable answers when replies are hidden.",
  },
  {
    id: "shelf_copy",
    flag: "kahani_shelf_copy",
    controlKey: "listen",
    controlValue: "Stories that listen to you.",
    treatmentKey: "next",
    treatmentValue: "Your child says what happens next.",
    primaryEvent: "play_started",
    aggregation: "mean",
    direction: "up",
    cohort: "children",
    claim: "Real visits only. A click on Play. Synthetic visitors do not see the shelf.",
  },
  {
    id: "namaskar_greeting",
    flag: "namaskar_greeting",
    controlKey: "silent",
    controlValue: "silent",
    treatmentKey: "namaskar",
    treatmentValue: "namaskar",
    primaryEvent: "story_begun",
    aggregation: "mean",
    direction: "up",
    cohort: "children",
    claim: "Real visits only. The shelf plays Namaskar, little friend. I'm Tara. Silence is the control. Synthetic visitors do not hear it.",
  },
];

export function syntheticAllowed(spec: ExperimentSpec): boolean {
  return spec.cohort === "synthetic-gate" || spec.cohort === "text-check";
}
