export interface ShipArgs {
  variation: string | null;
  yes: boolean;
}

export function parseShipArgs(argv: string[]): ShipArgs {
  const yes = argv.includes("--yes") || argv.includes("confirm");
  const flagged = argv.indexOf("--variation");
  const flaggedValue = flagged === -1 ? null : argv[flagged + 1];
  const positional = argv.find((arg) => arg !== "confirm" && !arg.startsWith("-"));
  const variation = (flaggedValue ?? positional ?? "").trim();
  return { yes, variation: variation && !variation.startsWith("-") ? variation : null };
}
