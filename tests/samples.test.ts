import { describe, it, expect } from "vitest";
import { SAMPLE_RECIPES } from "../src/data/sampleRecipes";
import { BUILT_IN_INGREDIENTS } from "../src/data/defaultIngredients";
import { parseIngredient } from "../src/domain/scaling/parseIngredient";
import { matchIngredient } from "../src/domain/ingredients/matcher";
import { generateSyntheticRecipeKeeperZip } from "./fixtures/syntheticRecipeKeeper";
import { parseRecipeKeeperZip } from "../src/domain/import/recipeKeeper";

describe("Sample Recipe Ingredient Coverage", (): void => {
  it("matches at least 95 percent of sample recipe ingredients to dictionary entries", (): void => {
    let totalIngredients = 0;
    let matchedCount = 0;
    const missedIngredients: string[] = [];

    for (const recipe of SAMPLE_RECIPES) {
      for (const group of recipe.ingredientGroups) {
        for (const item of group.items) {
          totalIngredients += 1;
          const parsed = parseIngredient(item.raw, item.id);
          const matched = matchIngredient(parsed.ingredient.name || "", BUILT_IN_INGREDIENTS);
          if (matched) {
            matchedCount += 1;
          } else {
            missedIngredients.push(`${recipe.title}: ${item.raw} (parsed name: "${parsed.ingredient.name}")`);
          }
        }
      }
    }

    const coveragePercentage = (matchedCount / totalIngredients) * 100;
    if (missedIngredients.length > 0) {
      // List misses for debugging coverage
      expect(missedIngredients).toEqual([]);
    }

    expect(coveragePercentage).toBeGreaterThanOrEqual(95);
  });

  it("matches at least 95 percent of synthetic Recipe Keeper fixture ingredients to dictionary entries", (): void => {
    const syntheticZip = generateSyntheticRecipeKeeperZip();
    const result = parseRecipeKeeperZip(syntheticZip);
    let totalIngredients = 0;
    let matchedCount = 0;
    const missedIngredients: string[] = [];

    for (const recipe of result.recipes) {
      for (const group of recipe.ingredientGroups) {
        for (const item of group.items) {
          totalIngredients += 1;
          const parsed = parseIngredient(item.raw, item.id);
          const matched = matchIngredient(parsed.ingredient.name || "", BUILT_IN_INGREDIENTS);
          if (matched) {
            matchedCount += 1;
          } else {
            missedIngredients.push(`${recipe.title}: ${item.raw} (parsed name: "${parsed.ingredient.name}")`);
          }
        }
      }
    }

    const coveragePercentage = (matchedCount / totalIngredients) * 100;
    if (missedIngredients.length > 0) {
      expect(missedIngredients).toEqual([]);
    }

    expect(coveragePercentage).toBeGreaterThanOrEqual(95);
  });
});
