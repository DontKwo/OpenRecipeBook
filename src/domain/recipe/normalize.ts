import type { Recipe, Step, Ingredient, IngredientGroup, DirectionGroup } from "./types";
import { parseIngredient } from "../scaling/parseIngredient";

export function cleanTrackingUrl(sourceUrl?: string): string | undefined {
  if (!sourceUrl) {
    return undefined;
  }
  try {
    const urlObject = new URL(sourceUrl);
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
      "ref",
      "source"
    ];
    for (const parameterName of trackingParams) {
      urlObject.searchParams.delete(parameterName);
    }
    return urlObject.toString();
  } catch {
    return sourceUrl.trim();
  }
}

export function cleanStepText(text: string): string {
  let cleaned = text.trim();
  // Strip leading numbering: "1.", "1)", "Step 1:", "Step 1 -", "1 - "
  cleaned = cleaned.replace(/^(?:step\s+)?\d+[\.\:\-\)]\s*/i, "");
  // Strip bullet symbols at start
  cleaned = cleaned.replace(/^[\*\-\u2022]\s+/, "");
  // Standardize temperature formatting: e.g. "350 degrees F" or "350 deg F" -> "350\u00B0F"
  cleaned = cleaned.replace(/(\d+)\s*(?:degrees|deg\.?)\s*([FC])\b/gi, "$1\u00B0$2");
  return cleaned.trim();
}

export function formatTimeMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) {
    return "";
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} hr ${remainingMinutes} min`;
  }
  if (hours > 0) {
    return `${hours} hr`;
  }
  return `${remainingMinutes} min`;
}

export function normalizeIngredient(rawLine: string, ingredientId: string): Ingredient {
  const parsed = parseIngredient(rawLine, ingredientId);
  return parsed.ingredient;
}

export function normalizeRecipe(sourceRecipe: Recipe): Recipe {
  const derivedTotal =
    sourceRecipe.totalMinutes ||
    (sourceRecipe.prepMinutes || 0) + (sourceRecipe.cookMinutes || 0) ||
    undefined;

  const normalizedIngredientGroups: IngredientGroup[] = sourceRecipe.ingredientGroups.map(
    (group: IngredientGroup): IngredientGroup => {
      const items: Ingredient[] = group.items
        .map((item: Ingredient, index: number): Ingredient => {
          const id = item.id || `ing-${index + 1}`;
          return normalizeIngredient(item.raw, id);
        })
        .filter((item: Ingredient): boolean => item.raw.trim().length > 0);

      return {
        heading: group.heading ? group.heading.trim() : undefined,
        items
      };
    }
  );

  const normalizedDirectionGroups: DirectionGroup[] = sourceRecipe.directionGroups.map(
    (group: DirectionGroup): DirectionGroup => {
      const steps: Step[] = group.steps
        .map((step: Step, index: number): Step => {
          const cleanedText = cleanStepText(step.text);
          return {
            id: step.id || `step-${index + 1}`,
            text: cleanedText,
            photoId: step.photoId,
            timers: step.timers
          };
        })
        .filter((step: Step): boolean => step.text.length > 0);

      return {
        heading: group.heading ? group.heading.trim() : undefined,
        steps
      };
    }
  );

  return {
    ...sourceRecipe,
    title: sourceRecipe.title.trim(),
    description: sourceRecipe.description ? sourceRecipe.description.trim() : undefined,
    sourceUrl: cleanTrackingUrl(sourceRecipe.sourceUrl),
    sourceName: sourceRecipe.sourceName ? sourceRecipe.sourceName.trim() : undefined,
    servings: Math.max(1, sourceRecipe.servings || 4),
    servingsLabel: sourceRecipe.servingsLabel ? sourceRecipe.servingsLabel.trim() : "servings",
    totalMinutes: derivedTotal,
    ingredientGroups: normalizedIngredientGroups,
    directionGroups: normalizedDirectionGroups,
    notes: sourceRecipe.notes ? sourceRecipe.notes.trim() : undefined,
    courses: sourceRecipe.courses.map((course: string): string => course.trim()).filter(Boolean),
    categories: sourceRecipe.categories.map((category: string): string => category.trim()).filter(Boolean),
    tags: sourceRecipe.tags.map((tag: string): string => tag.trim()).filter(Boolean),
    updatedAt: sourceRecipe.updatedAt || new Date().toISOString()
  };
}
