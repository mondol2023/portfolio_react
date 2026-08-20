import { WHACK_CONFIG } from "./config";
import type { Character } from "./types";

/**
 * Emoji rather than image assets — no license to track, no files to load,
 * and they render crisp at every hole size for free.
 */
export const CHARACTERS: Character[] = [
  { id: "goat", emoji: "🐐", label: "Goat", points: WHACK_CONFIG.goodPoints },
  { id: "sheep", emoji: "🐑", label: "Sheep", points: WHACK_CONFIG.goodPoints },
  { id: "cat", emoji: "🐈‍⬛", label: "Cat", points: WHACK_CONFIG.goodPoints },
  { id: "fox", emoji: "🦊", label: "Fox", points: WHACK_CONFIG.badPoints },
];
