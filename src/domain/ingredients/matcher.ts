import type { DictionaryIngredient } from "../recipe/types";

const DESCRIPTOR_WORDS: Set<string> = new Set([
  "chopped",
  "diced",
  "minced",
  "softened",
  "melted",
  "packed",
  "sifted",
  "divided",
  "room",
  "temperature",
  "fresh",
  "large",
  "medium",
  "small",
  "peeled",
  "trimmed",
  "crushed",
  "sliced",
  "grated",
  "shredded",
  "cooked",
  "raw",
  "warm",
  "cold",
  "finely",
  "coarsely",
  "thinly",
  "thickly",
  "extra",
  "virgin"
]);

const IRREGULAR_PLURALS: Record<string, string> = {
  tomatoes: "tomato",
  potatoes: "potato",
  cloves: "clove",
  leaves: "leaf",
  loaves: "loaf",
  berries: "berry",
  onions: "onion",
  carrots: "carrot",
  ribs: "rib",
  stalks: "stalk",
  eggs: "egg",
  breasts: "breast",
  thighs: "thigh",
  cans: "can"
};

export function singularizeWord(word: string): string {
  const lowerWord = word.toLowerCase();
  if (lowerWord in IRREGULAR_PLURALS) {
    return IRREGULAR_PLURALS[lowerWord];
  }
  if (lowerWord.endsWith("ies") && lowerWord.length > 3) {
    return `${lowerWord.slice(0, -3)}y`;
  }
  if (lowerWord.endsWith("es") && (lowerWord.endsWith("shes") || lowerWord.endsWith("ches") || lowerWord.endsWith("xes"))) {
    return lowerWord.slice(0, -2);
  }
  if (lowerWord.endsWith("s") && !lowerWord.endsWith("ss") && lowerWord.length > 2) {
    return lowerWord.slice(0, -1);
  }
  return lowerWord;
}

export function cleanIngredientName(rawName: string): string {
  // Lowercase, remove punctuation and parentheses
  const cleaned = rawName
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into tokens, filter out descriptors, and singularize
  const tokens = cleaned
    .split(/\s+/)
    .filter((token: string): boolean => !DESCRIPTOR_WORDS.has(token))
    .map((token: string): string => singularizeWord(token));

  return tokens.join(" ").trim();
}

export function extractDescriptorNotes(rawName: string): string[] {
  const cleaned = rawName
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned.split(/\s+/);
  const foundDescriptors: string[] = [];
  for (const token of tokens) {
    if (DESCRIPTOR_WORDS.has(token)) {
      foundDescriptors.push(token);
    }
  }
  return foundDescriptors;
}

export function matchIngredient(
  query: string,
  dictionary: DictionaryIngredient[]
): DictionaryIngredient | null {
  const cleanedQuery = cleanIngredientName(query);
  if (!cleanedQuery) {
    return null;
  }

  // 1. Direct match with canonical name
  for (const item of dictionary) {
    if (cleanIngredientName(item.name) === cleanedQuery) {
      return item;
    }
  }

  // 2. Direct match with aliases
  for (const item of dictionary) {
    for (const alias of item.aliases) {
      if (cleanIngredientName(alias) === cleanedQuery) {
        return item;
      }
    }
  }

  // 3. Substring containment match: find longest matching entry
  let bestMatch: DictionaryIngredient | null = null;
  let longestMatchedLength = 0;

  for (const item of dictionary) {
    const canonicalClean = cleanIngredientName(item.name);
    if (cleanedQuery.includes(canonicalClean) && canonicalClean.length > longestMatchedLength) {
      bestMatch = item;
      longestMatchedLength = canonicalClean.length;
    }
    for (const alias of item.aliases) {
      const aliasClean = cleanIngredientName(alias);
      if (cleanedQuery.includes(aliasClean) && aliasClean.length > longestMatchedLength) {
        bestMatch = item;
        longestMatchedLength = aliasClean.length;
      }
    }
  }

  return bestMatch;
}
