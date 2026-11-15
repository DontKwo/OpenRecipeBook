import { db } from "./db";
import { SAMPLE_RECIPES } from "./sampleRecipes";
import { normalizeRecipe } from "../domain/recipe/normalize";
import { saveRecipeVersion } from "../domain/recipe/versionHistory";
import type { Recipe } from "../domain/recipe/types";

export const CURRENT_SAMPLE_RECIPES_VERSION = 3;

export async function runRecipeCleanupMigration(): Promise<void> {
  const sampleVersionSetting = await db.settings.get("sampleRecipesVersion");
  const currentVersion = (sampleVersionSetting?.value as number) || 0;

  if (currentVersion >= CURRENT_SAMPLE_RECIPES_VERSION) {
    return;
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
    if (seed && stored.updatedAt === seed.updatedAt) {
      await db.recipes.put(normalizeRecipe(seed));
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
