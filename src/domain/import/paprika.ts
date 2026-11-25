import { unzipSync, gunzipSync, strFromU8 } from "fflate";
import type { Recipe, IngredientGroup, DirectionGroup, Step, RecipeRating } from "../recipe/types";
import { normalizeRecipe } from "../recipe/normalize";

export interface PaprikaRawRecipeJson {
  name?: string;
  ingredients?: string;
  directions?: string;
  servings?: string | number;
  prep_time?: string;
  cook_time?: string;
  total_time?: string;
  description?: string;
  notes?: string;
  categories?: string[];
  rating?: number;
  source?: string;
  source_url?: string;
  photo_data?: string;
}

export function parsePaprikaDurationMinutes(timeStr?: string): number | undefined {
  if (!timeStr) return undefined;
  const cleaned = timeStr.toLowerCase().trim();

  let totalMinutes = 0;
  const hourMatch = /(\d+)\s*(?:hours?|hrs?|h)\b/i.exec(cleaned);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }

  const minMatch = /(\d+)\s*(?:minutes?|mins?|m)\b/i.exec(cleaned);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  } else if (!hourMatch) {
    const rawNum = parseInt(cleaned, 10);
    if (!isNaN(rawNum)) {
      totalMinutes = rawNum;
    }
  }

  return totalMinutes > 0 ? totalMinutes : undefined;
}

function isPaprikaHeading(line: string): string | null {
  const boldMatch = /^\*\*(.+?)\*\*:?$/.exec(line);
  if (boldMatch) return boldMatch[1].replace(/:$/, "").trim();
  if (line.endsWith(":") && line.length < 60 && !/^\d/.test(line)) {
    return line.replace(/:$/, "").trim();
  }
  return null;
}

function splitPaprikaIngredients(rawText: string): IngredientGroup[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const groups: IngredientGroup[] = [];
  let heading: string | undefined;
  let items: { id: string; raw: string; scalable: boolean }[] = [];

  for (const line of lines) {
    const detected = isPaprikaHeading(line);
    if (detected !== null) {
      if (items.length > 0) {
        groups.push({ heading, items });
        items = [];
      }
      heading = detected;
      continue;
    }
    items.push({ id: `ing-${groups.length + 1}-${items.length + 1}`, raw: line, scalable: true });
  }
  if (items.length > 0) {
    groups.push({ heading, items });
  }
  return groups.length > 0 ? groups : [{ items: [] }];
}

function splitPaprikaDirections(rawText: string): DirectionGroup[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const groups: DirectionGroup[] = [];
  let heading: string | undefined;
  let steps: Step[] = [];

  for (const line of lines) {
    const detected = isPaprikaHeading(line);
    if (detected !== null) {
      if (steps.length > 0) {
        groups.push({ heading, steps });
        steps = [];
      }
      heading = detected;
      continue;
    }
    steps.push({ id: `step-${groups.length + 1}-${steps.length + 1}`, text: line });
  }
  if (steps.length > 0) {
    groups.push({ heading, steps });
  }
  return groups.length > 0 ? groups : [{ steps: [] }];
}

function buildPhotoDataUri(photoData?: string): string[] {
  if (!photoData || typeof photoData !== "string") return [];
  const trimmed = photoData.trim().replace(/\s+/g, "");
  if (!trimmed) return [];
  if (trimmed.startsWith("data:image/")) return [trimmed];
  if (trimmed.length < 16) return [];
  const mime = trimmed.startsWith("iVBOR") ? "image/png" : "image/jpeg";
  return [`data:${mime};base64,${trimmed}`];
}

export function convertPaprikaJsonToRecipe(data: PaprikaRawRecipeJson): Recipe {
  const title = data.name ? data.name.trim() : "Untitled Paprika Recipe";

  let servings = 4;
  if (typeof data.servings === "number") {
    servings = data.servings;
  } else if (typeof data.servings === "string") {
    const match = /\d+/.exec(data.servings);
    if (match) {
      servings = parseInt(match[0], 10);
    }
  }

  const ingredientGroups = splitPaprikaIngredients(data.ingredients || "");
  const directionGroups = splitPaprikaDirections(data.directions || "");
  const prepMinutes = parsePaprikaDurationMinutes(data.prep_time);
  const cookMinutes = parsePaprikaDurationMinutes(data.cook_time);
  const totalMinutes = parsePaprikaDurationMinutes(data.total_time);
  const rating = (data.rating ? Math.min(5, Math.max(0, Math.round(data.rating))) : 0) as RecipeRating;
  const photoIds = buildPhotoDataUri(data.photo_data);

  const recipe: Recipe = {
    id: `paprika-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    description: data.description ? data.description.trim() : undefined,
    sourceName: data.source ? data.source.trim() : undefined,
    sourceUrl: data.source_url ? data.source_url.trim() : undefined,
    servings: Math.max(1, servings),
    prepMinutes,
    cookMinutes,
    totalMinutes,
    ingredientGroups,
    directionGroups,
    notes: data.notes ? data.notes.trim() : undefined,
    cookLog: [],
    courses: data.categories || [],
    categories: [],
    collectionIds: [],
    tags: [],
    rating,
    favorite: false,
    photoIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    schemaVersion: 1
  };

  return normalizeRecipe(recipe);
}

export function parsePaprikaRecipesZip(zipBytes: Uint8Array): Recipe[] {
  const decompressed = unzipSync(zipBytes);
  const recipes: Recipe[] = [];

  for (const [entryPath, entryBytes] of Object.entries(decompressed)) {
    if (entryPath.endsWith(".paprikarecipe") || entryPath.endsWith(".json")) {
      try {
        let jsonStr = "";
        if (entryPath.endsWith(".json")) {
          jsonStr = strFromU8(entryBytes);
        } else {
          const gunzipped = gunzipSync(entryBytes);
          jsonStr = strFromU8(gunzipped);
        }
        const parsed = JSON.parse(jsonStr) as PaprikaRawRecipeJson;
        recipes.push(convertPaprikaJsonToRecipe(parsed));
      } catch {
        // Skip unparseable entry
      }
    }
  }

  return recipes;
}
