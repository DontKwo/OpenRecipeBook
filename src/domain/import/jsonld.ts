import type { Recipe, IngredientGroup, DirectionGroup, Step } from "../recipe/types";
import { normalizeRecipe } from "../recipe/normalize";
import { parseRecipeKeeperHtml } from "./recipeKeeper";

const NAMED_ENTITY_MAP: Record<string, string> = {
  nbsp: " ",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  deg: "°",
  ndash: "-",
  mdash: "-",
  lsquo: "'",
  rsquo: "'",
  ldquo: '"',
  rdquo: '"',
  hellip: "...",
  times: "x",
  frac12: "1/2",
  frac14: "1/4",
  frac34: "3/4",
  frac13: "1/3",
  frac23: "2/3",
  frac15: "1/5",
  frac25: "2/5",
  frac35: "3/5",
  frac45: "4/5",
  frac16: "1/6",
  frac56: "5/6",
  frac18: "1/8",
  frac38: "3/8",
  frac58: "5/8",
  frac78: "7/8"
};

export function unescapeHtmlEntities(text: string): string {
  const decodeOnce = (input: string): string =>
    input
      .replace(/&#x([0-9a-fA-F]+);/g, (_m: string, hex: string): string => {
        const code = parseInt(hex, 16);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
      })
      .replace(/&#(\d+);/g, (_m: string, dec: string): string => {
        const code = parseInt(dec, 10);
        return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
      })
      .replace(/&([a-zA-Z0-9]+);/g, (match: string, name: string): string => {
        if (name === "amp") return "&";
        if (name in NAMED_ENTITY_MAP) return NAMED_ENTITY_MAP[name];
        const lower = name.toLowerCase();
        return lower in NAMED_ENTITY_MAP ? NAMED_ENTITY_MAP[lower] : match;
      });
  // Decode up to two passes for double-encoded CMS strings (e.g. &amp;rsquo;)
  return decodeOnce(decodeOnce(text)).replace(/\u00A0/g, " ");
}

function stripInlineHtml(text: string): string {
  return unescapeHtmlEntities(
    text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const trimmed = duration.trim();
  const match = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i.exec(trimmed);
  if (match && (match[1] || match[2] || match[3] || match[4])) {
    const days = parseInt(match[1] || "0", 10);
    const hours = parseInt(match[2] || "0", 10);
    const minutes = parseInt(match[3] || "0", 10);
    return days * 24 * 60 + hours * 60 + minutes;
  }
  const hourMatch = /(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i.exec(trimmed);
  const minMatch = /(\d+)\s*(?:minutes?|mins?|m)\b/i.exec(trimmed);
  const hours = hourMatch ? Math.round(parseFloat(hourMatch[1]) * 60) : 0;
  const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
  return hours + mins;
}

function isRecipeTypeValue(rawType: unknown): boolean {
  const checkSingle = (val: unknown): boolean => {
    if (typeof val !== "string") return false;
    const normalized = val.trim().toLowerCase();
    return (
      normalized === "recipe" ||
      normalized.endsWith("/recipe") ||
      normalized.endsWith(":recipe")
    );
  };
  return Array.isArray(rawType) ? rawType.some(checkSingle) : checkSingle(rawType);
}

function parseYieldValue(rawYield: unknown): { servings: number; servingsLabel?: string } {
  const inspectCandidate = (val: unknown): { num: number; label?: string } | null => {
    if (typeof val === "number" && Number.isFinite(val) && val > 0) {
      return { num: Math.round(val) };
    }
    if (typeof val === "string") {
      const cleaned = stripInlineHtml(val);
      const match = /\d+/.exec(cleaned);
      if (match) {
        return { num: parseInt(match[0], 10), label: cleaned };
      }
    }
    return null;
  };

  if (Array.isArray(rawYield)) {
    let label: string | undefined;
    for (const item of rawYield) {
      if (typeof item === "string" && /[a-z]/i.test(item)) {
        label = stripInlineHtml(item);
      }
    }
    for (const item of rawYield) {
      const res = inspectCandidate(item);
      if (res) {
        return { servings: Math.max(1, res.num), servingsLabel: label || res.label };
      }
    }
    return { servings: 4, servingsLabel: label };
  }

  const single = inspectCandidate(rawYield);
  return single
    ? { servings: Math.max(1, single.num), servingsLabel: single.label }
    : { servings: 4 };
}

function extractInstructionTexts(node: unknown): string[] {
  if (typeof node === "string") {
    return stripInlineHtml(node)
      .split(/\r?\n/)
      .map((l: string): string => l.trim())
      .filter(Boolean);
  }
  if (Array.isArray(node)) {
    const out: string[] = [];
    for (const entry of node) {
      out.push(...extractInstructionTexts(entry));
    }
    return out;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj.text !== undefined && obj.text !== null) {
      return extractInstructionTexts(String(obj.text));
    }
    if (Array.isArray(obj.itemListElement)) {
      return extractInstructionTexts(obj.itemListElement);
    }
    if (typeof obj.name === "string" && obj.name.trim()) {
      return [stripInlineHtml(obj.name)];
    }
  }
  return [];
}

function parseDirectionGroupsFromJsonLd(rawInstructions: unknown): DirectionGroup[] {
  const groups: DirectionGroup[] = [];
  let defaultSteps: Step[] = [];
  let seq = 1;

  const flushDefault = (): void => {
    if (defaultSteps.length > 0) {
      groups.push({ steps: defaultSteps });
      defaultSteps = [];
    }
  };

  const isSectionNode = (obj: Record<string, unknown>): boolean => {
    const t = obj["@type"];
    const hasType = typeof t === "string"
      ? t.toLowerCase().includes("howtosection")
      : Array.isArray(t) && t.some((v) => String(v).toLowerCase().includes("howtosection"));
    return hasType || (Array.isArray(obj.itemListElement) && typeof obj.name === "string" && !obj.text);
  };

  const items = Array.isArray(rawInstructions)
    ? rawInstructions
    : rawInstructions && typeof rawInstructions === "object"
      ? [rawInstructions]
      : typeof rawInstructions === "string"
        ? stripInlineHtml(rawInstructions).split(/\r?\n/).filter(Boolean)
        : [];

  for (const item of items) {
    if (item && typeof item === "object" && isSectionNode(item as Record<string, unknown>)) {
      flushDefault();
      const secObj = item as Record<string, unknown>;
      const heading = secObj.name ? stripInlineHtml(String(secObj.name)) : undefined;
      const sectionSteps: Step[] = [];
      for (const text of extractInstructionTexts(secObj.itemListElement)) {
        sectionSteps.push({ id: `step-${seq}`, text });
        seq += 1;
      }
      if (sectionSteps.length > 0) {
        groups.push({ heading, steps: sectionSteps });
      }
      continue;
    }

    for (const text of extractInstructionTexts(item)) {
      defaultSteps.push({ id: `step-${seq}`, text });
      seq += 1;
    }
  }

  flushDefault();
  return groups.length > 0 ? groups : [{ steps: [] }];
}

function extractImageUrls(rawImage: unknown): string[] {
  if (!rawImage) return [];
  if (typeof rawImage === "string") {
    const trimmed = rawImage.trim();
    return /^https?:\/\//i.test(trimmed) ? [trimmed] : [];
  }
  if (Array.isArray(rawImage)) {
    for (const entry of rawImage) {
      const found = extractImageUrls(entry);
      if (found.length > 0) return [found[0]];
    }
    return [];
  }
  if (typeof rawImage === "object") {
    const obj = rawImage as Record<string, unknown>;
    if (typeof obj.url === "string" && /^https?:\/\//i.test(obj.url.trim())) {
      return [obj.url.trim()];
    }
  }
  return [];
}

function extractAuthorName(rawAuthor: unknown, rawPublisher: unknown): string | undefined {
  const fromNode = (node: unknown): string | undefined => {
    if (!node) return undefined;
    if (typeof node === "string") return stripInlineHtml(node) || undefined;
    if (Array.isArray(node)) {
      for (const entry of node) {
        const res = fromNode(entry);
        if (res) return res;
      }
      return undefined;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      if (typeof obj.name === "string" && obj.name.trim()) {
        return stripInlineHtml(obj.name);
      }
    }
    return undefined;
  };
  return fromNode(rawPublisher) || fromNode(rawAuthor);
}

function extractStringList(rawVal: unknown): string[] {
  if (!rawVal) return [];
  if (Array.isArray(rawVal)) {
    return rawVal
      .flatMap((entry) => String(entry).split(","))
      .map((s) => stripInlineHtml(s))
      .filter(Boolean);
  }
  return String(rawVal)
    .split(",")
    .map((s) => stripInlineHtml(s))
    .filter(Boolean);
}

function extractNutritionRecord(rawNutrition: unknown): Record<string, string> | undefined {
  if (!rawNutrition || typeof rawNutrition !== "object" || Array.isArray(rawNutrition)) {
    return undefined;
  }
  const obj = rawNutrition as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith("@") || v === null || v === undefined) continue;
    const text = stripInlineHtml(String(v));
    if (text) out[k] = text;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export function parseSchemaRecipeJsonLd(jsonData: unknown): Recipe[] {
  const recipes: Recipe[] = [];
  const visited = new Set<unknown>();

  const extractNode = (node: unknown): void => {
    if (!node || typeof node !== "object" || visited.has(node)) return;
    visited.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        extractNode(item);
      }
      return;
    }

    const obj = node as Record<string, unknown>;
    if (isRecipeTypeValue(obj["@type"])) {
      const title = stripInlineHtml(String(obj.name || "Untitled Recipe")) || "Untitled Recipe";
      const description = obj.description ? stripInlineHtml(String(obj.description)) : undefined;
      const rawPrep = obj.prepTime ? parseIsoDuration(String(obj.prepTime)) : 0;
      const rawCook = obj.cookTime ? parseIsoDuration(String(obj.cookTime)) : 0;
      const rawTotal = obj.totalTime ? parseIsoDuration(String(obj.totalTime)) : 0;
      const prepMinutes = rawPrep > 0 ? rawPrep : undefined;
      const cookMinutes = rawCook > 0 ? rawCook : undefined;
      const totalMinutes = rawTotal > 0 ? rawTotal : undefined;

      const yieldParsed = parseYieldValue(obj.recipeYield);

      const rawIngSource = obj.recipeIngredient ?? obj.ingredients;
      const rawIngredients: string[] = Array.isArray(rawIngSource)
        ? rawIngSource.map((item) => stripInlineHtml(String(item))).filter(Boolean)
        : typeof rawIngSource === "string"
          ? stripInlineHtml(rawIngSource).split(/\r?\n/).filter(Boolean)
          : [];

      const ingredientGroups: IngredientGroup[] = [
        {
          items: rawIngredients.map((raw: string, idx: number) => ({
            id: `ing-${idx + 1}`,
            raw: raw.trim(),
            scalable: true
          }))
        }
      ];

      const directionGroups = parseDirectionGroupsFromJsonLd(obj.recipeInstructions);
      const courses = extractStringList(obj.recipeCategory);
      const categories = extractStringList(obj.recipeCuisine);
      const tags = extractStringList(obj.keywords);
      const photoIds = extractImageUrls(obj.image);
      const sourceName = extractAuthorName(obj.author, obj.publisher);
      const nutrition = extractNutritionRecord(obj.nutrition);

      const newRecipe: Recipe = {
        id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        title,
        description,
        sourceUrl: typeof obj.url === "string" ? obj.url : undefined,
        sourceName,
        servings: yieldParsed.servings,
        servingsLabel: yieldParsed.servingsLabel,
        prepMinutes,
        cookMinutes,
        totalMinutes,
        ingredientGroups,
        directionGroups,
        nutrition,
        cookLog: [],
        courses,
        categories,
        collectionIds: [],
        tags,
        rating: 0,
        favorite: false,
        photoIds,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1
      };

      recipes.push(normalizeRecipe(newRecipe));
    }

    for (const key of ["@graph", "mainEntity", "mainEntityOfPage", "about", "hasPart"] as const) {
      if (obj[key] !== undefined) {
        extractNode(obj[key]);
      }
    }
  };

  extractNode(jsonData);
  return recipes;
}

function tryParseJsonLdBlock(rawContent: string): unknown | null {
  let cleaned = rawContent.trim();
  if (!cleaned) return null;
  cleaned = cleaned
    .replace(/^<!--\s*/, "")
    .replace(/\s*-->$/, "")
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const sanitized = cleaned
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\r\n]+/g, " ");
    try {
      return JSON.parse(sanitized) as unknown;
    } catch {
      return null;
    }
  }
}

function hasUsableContent(recipe: Recipe): boolean {
  const ingCount = recipe.ingredientGroups.reduce((sum, g) => sum + g.items.length, 0);
  const stepCount = recipe.directionGroups.reduce((sum, g) => sum + g.steps.length, 0);
  return ingCount > 0 || stepCount > 0;
}

export function extractRecipesFromHtml(html: string): Recipe[] {
  const recipes: Recipe[] = [];
  const scriptRegex = /<script\b[^>]*type\s*=\s*(?:["']?application\/ld\+json(?:[^"'>\s]*)["']?)[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = scriptRegex.exec(html);

  while (match !== null) {
    const parsed = tryParseJsonLdBlock(match[1]);
    if (parsed !== null) {
      recipes.push(...parseSchemaRecipeJsonLd(parsed));
    }
    match = scriptRegex.exec(html);
  }

  if (recipes.length > 0) {
    return recipes;
  }

  if (/itemtype\s*=\s*["'][^"']*schema\.org\/recipe/i.test(html)) {
    return parseRecipeKeeperHtml(html).filter(hasUsableContent);
  }

  return [];
}
