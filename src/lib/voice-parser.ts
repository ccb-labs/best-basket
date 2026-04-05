/**
 * Parses Portuguese voice input into a structured item.
 *
 * The Web Speech API returns a plain string like "2 espinafres" or
 * "meio quilo de arroz". This function extracts the quantity, unit,
 * and product name so we can fill the Add Item form automatically.
 */

/** Maps Portuguese number words to their numeric values */
const WORD_TO_NUMBER: Record<string, number> = {
  meio: 0.5,
  meia: 0.5,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  "três": 3,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
};

/**
 * Maps Portuguese unit words to the form field value.
 * Each entry has a list of spoken variations and the value we store.
 */
const UNIT_MAP: Record<string, string> = {
  quilo: "Kg",
  quilos: "Kg",
  kg: "Kg",
  grama: "g",
  gramas: "g",
  litro: "L",
  litros: "L",
  pacote: "Emb",
  pacotes: "Emb",
  embalagem: "Emb",
  embalagens: "Emb",
  unidade: "Un",
  unidades: "Un",
};

export interface ParsedVoiceInput {
  name: string;
  quantity: number;
  unit: string | null;
}

/**
 * Converts a Portuguese plural word to singular.
 *
 * Portuguese has several plural patterns. We handle the most common ones
 * that appear in grocery products:
 *
 *   -ões → -ão  (limões → limão, melões → melão)
 *   -ães → -ão  (pães → pão)
 *   -ns  → -m   (atuns → atum)
 *   -éis → -el  (papéis → papel)
 *   -s   → drop (bananas → banana, espinafres → espinafre, ovos → ovo)
 *
 * Words that don't end in -s are returned unchanged (arroz, leite, etc.).
 */
function toSingular(word: string): string {
  if (word.endsWith("ões")) return word.slice(0, -3) + "ão";
  if (word.endsWith("ães")) return word.slice(0, -3) + "ão";
  if (word.endsWith("ns")) return word.slice(0, -2) + "m";
  if (word.endsWith("éis")) return word.slice(0, -3) + "el";
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/** Capitalizes the first letter: "espinafre" → "Espinafre" */
function capitalize(word: string): string {
  if (!word) return word;
  return word[0].toUpperCase() + word.slice(1);
}

/** Applies singular + capitalize to the product name */
function formatName(name: string): string {
  return capitalize(toSingular(name));
}

// Pre-build the general-purpose regex once (the maps never change).
// Matches: (number or word) [optional: unit word + "de"] (product name)
const numberWords = Object.keys(WORD_TO_NUMBER).join("|");
const unitWords = Object.keys(UNIT_MAP).join("|");
const GENERAL_PATTERN = new RegExp(
  `^(\\d+(?:[.,]\\d+)?|${numberWords})\\s+` + // quantity
    `(?:(${unitWords})\\s+de\\s+)?` + // optional: unit + "de"
    `(.+)$` // product name
);

// "dúzia" needs a special pattern because it's not a unit (it's a quantity of 12)
const DUZIA_PATTERN = /^uma\s+d[uú]zia\s+de\s+(.+)$/;

/**
 * Parses a Portuguese voice transcript into quantity, unit, and product name.
 * The name is automatically singularized and capitalized.
 *
 * Examples:
 *  - "2 espinafres"        → { quantity: 2, unit: null, name: "Espinafre" }
 *  - "meio quilo de arroz" → { quantity: 0.5, unit: "kg", name: "Arroz" }
 *  - "uma dúzia de ovos"   → { quantity: 12, unit: null, name: "Ovo" }
 *  - "leite"               → { quantity: 1, unit: null, name: "Leite" }
 */
export function parsePortugueseInput(text: string): ParsedVoiceInput {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();

  if (!normalized) {
    return { name: "", quantity: 1, unit: null };
  }

  // "uma dúzia de X" → 12 (special case — dúzia is a quantity, not a unit)
  const duzia = normalized.match(DUZIA_PATTERN);
  if (duzia) {
    return { name: formatName(duzia[1]), quantity: 12, unit: null };
  }

  // General pattern handles most cases:
  // "2 espinafres", "meio quilo de arroz", "dois litros de sumo", etc.
  const general = normalized.match(GENERAL_PATTERN);

  if (general) {
    const [, rawQty, rawUnit, name] = general;

    const quantity =
      WORD_TO_NUMBER[rawQty] ?? parseFloat(rawQty.replace(",", "."));

    const unit = rawUnit ? (UNIT_MAP[rawUnit] ?? null) : null;

    return { name: formatName(name.trim()), quantity, unit };
  }

  // Fallback: entire text is the product name
  return { name: formatName(normalized), quantity: 1, unit: null };
}
