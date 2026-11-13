import { db, type RecipeVersionRecord } from "../../data/db";
import type { Recipe } from "./types";

export interface VersionSummary {
  id: string;
  recipeId: string;
  timestamp: string;
  summary: string;
}

export const createVersionSummaryText = (recipe: Recipe): string => {
  const ingCount = recipe.ingredientGroups.reduce((acc: number, g) => acc + g.items.length, 0);
  const stepCount = recipe.directionGroups.reduce((acc: number, g) => acc + g.steps.length, 0);
  return `${recipe.title} (${ingCount} ing, ${stepCount} steps)`;
};

export const saveRecipeVersion = async (
  recipe: Recipe,
  customSummary?: string
): Promise<string> => {
  const id = `ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  const summary = customSummary || createVersionSummaryText(recipe);

  // Store cloned snapshot
  const snapshot: Recipe = JSON.parse(JSON.stringify(recipe));
  const record: RecipeVersionRecord = {
    id,
    recipeId: recipe.id,
    timestamp,
    summary,
    snapshot
  };

  await db.recipeVersions.add(record);

  // Prune history keeping only the 10 most recent versions
  const allForRecipe = await db.recipeVersions
    .where("recipeId")
    .equals(recipe.id)
    .sortBy("timestamp");

  if (allForRecipe.length > 10) {
    const toRemove = allForRecipe.slice(0, allForRecipe.length - 10);
    for (const item of toRemove) {
      await db.recipeVersions.delete(item.id);
    }
  }

  return id;
};

export const getRecipeVersions = async (recipeId: string): Promise<VersionSummary[]> => {
  const records = await db.recipeVersions
    .where("recipeId")
    .equals(recipeId)
    .reverse()
    .sortBy("timestamp");

  return records.map((r: RecipeVersionRecord): VersionSummary => ({
    id: r.id,
    recipeId: r.recipeId,
    timestamp: r.timestamp,
    summary: r.summary
  }));
};

export const getRecipeVersionSnapshot = async (versionId: string): Promise<Recipe | null> => {
  const record = await db.recipeVersions.get(versionId);
  return record ? record.snapshot : null;
};

export const pruneExcessVersions = (
  versions: RecipeVersionRecord[],
  maxToKeep: number = 10
): RecipeVersionRecord[] => {
  if (versions.length <= maxToKeep) {
    return [];
  }
  const sorted = [...versions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return sorted.slice(0, sorted.length - maxToKeep);
};
