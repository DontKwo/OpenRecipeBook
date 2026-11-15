import { db } from "./db";
import type { Recipe } from "../domain/recipe/types";
import { normalizeRecipe } from "../domain/recipe/normalize";

export async function saveRecipe(recipe: Recipe): Promise<Recipe> {
  const normalized = normalizeRecipe({
    ...recipe,
    updatedAt: new Date().toISOString()
  });
  await db.recipes.put(normalized);
  return normalized;
}
