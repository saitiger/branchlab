export interface Beat {
  prompt: string;
  suggestions: [string, string, string];
  reply: string;
}

export const BEATS: Beat[] = [
  {
    prompt: "A traveler left a torn map on the counter. What should Ivo do first?",
    suggestions: ["Mend the tear", "Ask who it belongs to", "Set it aside"],
    reply: "Ivo smooths the map and waits to see who comes back for it.",
  },
  {
    prompt: "Someone offers a shortcut through the closed stacks. What should Ivo say?",
    suggestions: ["Ask what they need", "Walk with them", "Keep the stacks shut"],
    reply: "Ivo answers, and the stacks stay as quiet as they were.",
  },
  {
    prompt: "The owner returns. What should Ivo do with the map?",
    suggestions: ["Hand it back", "Offer a copy", "Ask them to stay for tea"],
    reply: "Ivo finishes the exchange. The night clerk's question is settled.",
  },
];

export function mockReply(point: number): string {
  return BEATS[point]?.reply ?? "Ivo has nothing more to add.";
}
