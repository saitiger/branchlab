/** Shelf lines for the Kahani page on Interact Studio. */
export const COPY_FEATURE = "kahani_shelf_copy" as const;
export const COPY_EXPERIMENT = "kahani_shelf_copy_experiment" as const;

export const COPIES = {
  listen: {
    key: "listen",
    role: "control",
    line: "Stories that listen to you.",
  },
  next: {
    key: "next",
    role: "treatment",
    line: "Your child says what happens next.",
  },
} as const;

export type CopyKey = keyof typeof COPIES;

export function isCopyKey(value: string): value is CopyKey {
  return value === "listen" || value === "next";
}
