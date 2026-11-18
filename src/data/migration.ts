import { db } from "./db";
import { SAMPLE_RECIPES, DEFAULT_COLLECTIONS } from "./sampleRecipes";
import { normalizeRecipe } from "../domain/recipe/normalize";
import { saveRecipeVersion } from "../domain/recipe/versionHistory";
import type { Recipe } from "../domain/recipe/types";

export const CURRENT_SAMPLE_RECIPES_VERSION = 6;

export async function runRecipeCleanupMigration(): Promise<void> {
  const sampleVersionSetting = await db.settings.get("sampleRecipesVersion");
  const currentVersion = (sampleVersionSetting?.value as number) || 0;

  if (currentVersion >= CURRENT_SAMPLE_RECIPES_VERSION) {
    return;
  }

  // Seed default collections if not present
  for (const col of DEFAULT_COLLECTIONS) {
    const exists = await db.collections.get(col.id);
    if (!exists) {
      await db.collections.put(col);
    }
  }

  const oldSampleIds = ["sample-pancakes", "sample-chili", "sample-pasta", "sample-cookies"];
  for (const oldId of oldSampleIds) {
    await db.recipes.delete(oldId);
  }

  const seedMap = new Map<string, Recipe>();
  for (const seed of SAMPLE_RECIPES) {
    seedMap.set(seed.id, seed);
  }

  const allStored = await db.recipes.toArray();

  for (const stored of allStored) {
    const seed = seedMap.get(stored.id);
    if (seed) {
      // Sync default sample recipes to updated photos, folders, and non-favorite
      const merged: Recipe = {
        ...stored,
        photoIds: seed.photoIds,
        collectionIds: seed.collectionIds,
        favorite: false
      };
      await db.recipes.put(normalizeRecipe(merged));
    } else {
      try {
        await saveRecipeVersion(stored, "Pre-migration backup");
      } catch {
        // Proceed if version snapshot table has error
      }
      const cleaned = normalizeRecipe(stored);
      await db.recipes.put(cleaned);
    }
  }

  for (const seed of SAMPLE_RECIPES) {
    const exists = await db.recipes.get(seed.id);
    if (!exists) {
      await db.recipes.put(normalizeRecipe(seed));
    }
  }

  await db.settings.put({ key: "sampleRecipesVersion", value: CURRENT_SAMPLE_RECIPES_VERSION });
}
