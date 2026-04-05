/**
 * Parses Portuguese voice commands for Live Shopping mode.
 *
 * This is completely separate from voice-parser.ts (which parses
 * product-add input like "2 espinafres"). This file handles commands
 * like "Feito", "Próximo", "Fechar", and "[item name], Check".
 */

import type { ListItemWithCategory } from "@/lib/types";

// -- Command types --

export type LiveCommand =
  | { type: "check" }
  | { type: "skip" }
  | { type: "close" }
  | { type: "check_specific"; itemName: string }
  | { type: "unknown"; raw: string };

// -- Helpers --

/** Strips accents so "próximo" matches "proximo" */
function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Normalizes text for comparison: lowercase, trim, strip accents */
function normalize(text: string): string {
  return removeAccents(text.toLowerCase().trim());
}

// -- Command sets (accent-free for matching) --

const CHECK_WORDS = ["feito", "feita"];
const SKIP_WORDS = ["proximo", "proxima"];
const CLOSE_WORDS = ["fechar", "parar", "sair"];

// Matches "[item name], check" or "[item name] check"
const CHECK_SPECIFIC_PATTERN = /^(.+?)[\s,]+check$/i;

// -- Main parser --

/**
 * Parses a voice transcript into a Live Shopping command.
 *
 * The Speech Recognition API returns a string. This function classifies
 * it into one of: check (current item), skip, close, check a specific
 * item by name, or unknown.
 */
export function parseLiveCommand(transcript: string): LiveCommand {
  // Normalize: lowercase, trim, strip trailing punctuation that STT
  // sometimes adds (periods, commas, question marks)
  const raw = transcript.trim();
  const cleaned = removeAccents(raw.toLowerCase().replace(/[.,!?]+$/, "").trim());

  if (!cleaned) {
    return { type: "unknown", raw };
  }

  // Single-word command matches
  if (CHECK_WORDS.includes(cleaned)) {
    return { type: "check" };
  }
  if (SKIP_WORDS.includes(cleaned)) {
    return { type: "skip" };
  }
  if (CLOSE_WORDS.includes(cleaned)) {
    return { type: "close" };
  }

  // "[item name], check" pattern
  const specificMatch = cleaned.match(CHECK_SPECIFIC_PATTERN);
  if (specificMatch) {
    return { type: "check_specific", itemName: specificMatch[1].trim() };
  }

  return { type: "unknown", raw };
}

// -- Fuzzy item matching --

/**
 * Finds an unchecked item matching a spoken name.
 *
 * Uses a cascade: exact match → starts-with → contains.
 * All comparisons are accent-normalized and case-insensitive.
 * Only searches unchecked items.
 */
export function findMatchingItem(
  spokenName: string,
  items: ListItemWithCategory[]
): ListItemWithCategory | null {
  const spoken = normalize(spokenName);
  if (!spoken) return null;

  // Single pass: normalize each name once, check all match types together
  let startsWithMatch: ListItemWithCategory | null = null;
  let containsMatch: ListItemWithCategory | null = null;

  for (const item of items) {
    if (item.checked) continue;
    const norm = normalize(item.name);

    if (norm === spoken) return item; // Exact match — return immediately
    if (!startsWithMatch && norm.startsWith(spoken)) startsWithMatch = item;
    if (!containsMatch && norm.includes(spoken)) containsMatch = item;
  }

  return startsWithMatch ?? containsMatch ?? null;
}
