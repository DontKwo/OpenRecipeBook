import { describe, it, expect } from "vitest";
import { SAMPLE_RECIPES } from "../src/data/sampleRecipes";
import { getSubstitutionsForIngredient } from "../src/domain/ingredients/substitutions";
import type { Recipe } from "../src/domain/recipe/types";

describe("Substitutions Engine and Recipe Disallowed Substitutions", (): void => {
  it("provides culinary substitutions for common baking and cooking ingredients", (): void => {
    const buttermilkSubs = getSubstitutionsForIngredient("1 cup buttermilk");
    expect(buttermilkSubs.length).toBeGreaterThanOrEqual(1);
    expect(buttermilkSubs.some((s) => s.substituteIngredient.toLowerCase().includes("milk"))).toBe(true);

    const butterSubs = getSubstitutionsForIngredient("1/2 cup unsalted butter");
    expect(butterSubs.length).toBeGreaterThanOrEqual(1);
  });

  it("filters out substitutions disallowed for a specific recipe", (): void => {
    const rawSubs = getSubstitutionsForIngredient("1 cup buttermilk");
    expect(rawSubs.length).toBeGreaterThan(0);
    const subToDisallow = rawSubs[0].substituteIngredient;

    const mockRecipe: Recipe = {
      id: "test-rec-1",
      title: "Test Recipe",
      servings: 4,
      courses: ["Dinner"],
      categories: ["Main"],
      collectionIds: [],
      tags: [],
      rating: 5,
      favorite: false,
      photoIds: [],
      createdAt: "2026-11-18T00:00:00Z",
      updatedAt: "2026-11-18T00:00:00Z",
      schemaVersion: 1,
      cookLog: [],
      ingredientGroups: [
        {
          items: [
            { id: "ing-1", raw: "1 cup buttermilk", scalable: true }
          ]
        }
      ],
      directionGroups: [
        {
          steps: [
            { id: "step-1", text: "Mix well." }
          ]
        }
      ],
      disallowedSubstitutions: {
        "ing-1": [subToDisallow]
      }
    };

    const disallowedMap = mockRecipe.disallowedSubstitutions || {};
    const rejectedSubs = disallowedMap["ing-1"] || [];
    const filteredSubs = rawSubs.filter((s) => !rejectedSubs.includes(s.substituteIngredient));

    expect(filteredSubs.some((s) => s.substituteIngredient === subToDisallow)).toBe(false);
    expect(filteredSubs.length).toBe(rawSubs.length - 1);
  });

  it("verifies all 20 sample recipes have matching photoIds and favorite set to false", (): void => {
    expect(SAMPLE_RECIPES).toHaveLength(20);
    for (const r of SAMPLE_RECIPES) {
      expect(r.favorite).toBe(false);
      expect(r.photoIds).toHaveLength(1);
      expect(r.photoIds[0]).toBe(`/recipe-photos/${r.id}.png`);
    }
  });

  it("verifies Thanksgiving collection contains exact 6 holiday items without Spanish Rice", (): void => {
    const thanksgivingRecipes = SAMPLE_RECIPES.filter((r) =>
      r.collectionIds?.includes("col-thanksgiving")
    );
    expect(thanksgivingRecipes).toHaveLength(6);
    const ids = thanksgivingRecipes.map((r) => r.id);
    expect(ids).toContain("recipe-bisquick-sausage-balls");
    expect(ids).toContain("recipe-broccoli-with-garlic-butter-cashews");
    expect(ids).toContain("recipe-dinner-rolls");
    expect(ids).toContain("recipe-gordon-ramsay-potatoes");
    expect(ids).toContain("recipe-slow-cooker-turkey-breast-with-aromatics");
    expect(ids).toContain("recipe-turkey-gravy");
    expect(ids).not.toContain("recipe-lazy-spanish-rice");
  });
});
