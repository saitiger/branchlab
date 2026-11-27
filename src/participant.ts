export function createParticipantId(randomUUID: () => string = cryptoRandom): string {
  return randomUUID();
}

function cryptoRandom(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `p_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}
