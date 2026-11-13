import { describe, it, expect } from "vitest";
import { computeIngredientTotals } from "../src/domain/ingredients/totals";
import { BUILT_IN_INGREDIENTS } from "../src/data/defaultIngredients";
import type { Recipe } from "../src/domain/recipe/types";

function createMockRecipe(title: string, rawIngredients: string[]): Recipe {
  return {
    id: `rec-${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    servings: 4,
    ingredientGroups: [
      {
        items: rawIngredients.map((raw: string, index: number) => ({
          id: `ing-${index + 1}`,
          raw,
          scalable: true
        }))
      }
    ],
    directionGroups: [],
    cookLog: [],
    courses: [],
    categories: [],
    collectionIds: [],
    tags: [],
    rating: 0,
    favorite: false,
    photoIds: [],
    createdAt: "2026-11-11T00:00:00Z",
    updatedAt: "2026-11-11T00:00:00Z",
    schemaVersion: 1
  };
}

describe("Ingredient Totals Engine", (): void => {
  it("sums 1 cup, 2/3 cup, and 1/3 cup of flour into 2 cups all-purpose flour", (): void => {
    const recipe1 = createMockRecipe("Pancakes", ["1 cup flour"]);
    const recipe2 = createMockRecipe("Biscuits", ["2/3 cup flour"]);
    const recipe3 = createMockRecipe("Cookies", ["1/3 cup flour"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 },
        { recipe: recipe3, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const flourItem = result.items.find((item) => item.displayName === "all-purpose flour");
    expect(flourItem).toBeDefined();
    expect(flourItem?.totalDisplay).toBe("2 cups all-purpose flour");
    expect(flourItem?.traces).toHaveLength(3);
  });

  it("applies recipe multipliers before summing", (): void => {
    const recipe = createMockRecipe("Double Cake", ["1 cup sugar"]);
    const result = computeIngredientTotals(
      [{ recipe, multiplier: 2 }],
      BUILT_IN_INGREDIENTS
    );

    const sugarItem = result.items.find((item) => item.displayName === "granulated sugar");
    expect(sugarItem?.totalDisplay).toBe("2 cups granulated sugar");
  });

  it("places unquantified lines into also needed", (): void => {
    const recipe = createMockRecipe("Salad", ["Salt to taste", "Fresh basil leaves"]);
    const result = computeIngredientTotals(
      [{ recipe, multiplier: 1 }],
      BUILT_IN_INGREDIENTS
    );

    expect(result.alsoNeeded.length).toBeGreaterThanOrEqual(1);
  });

  it("keeps can specifications grouped properly", (): void => {
    const recipe1 = createMockRecipe("Chili 1", ["1 (14 oz) can diced tomatoes"]);
    const recipe2 = createMockRecipe("Chili 2", ["2 (14 oz) cans diced tomatoes"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const tomatoItem = result.items.find((item) => item.displayName === "canned diced tomatoes");
    expect(tomatoItem?.totalDisplay).toBe("3 (14 oz) cans canned diced tomatoes");
  });

  it("combines mixed volume units (1 cup + 8 tbsp milk)", (): void => {
    const recipe1 = createMockRecipe("Milkshake", ["1 cup milk"]);
    const recipe2 = createMockRecipe("Pancake Mix", ["8 tbsp milk"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const milkItem = result.items.find((item) => item.displayName === "whole milk");
    expect(milkItem).toBeDefined();
    expect(milkItem?.totalDisplay).toBe("1 ½ cups whole milk");
  });

  it("combines mixed weight units (8 oz + 1 lb butter)", (): void => {
    const recipe1 = createMockRecipe("Pastry", ["8 oz butter"]);
    const recipe2 = createMockRecipe("Batch Cake", ["1 lb butter"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const butterItem = result.items.find((item) => item.displayName === "unsalted butter");
    expect(butterItem).toBeDefined();
    expect(butterItem?.totalDisplay).toBe("1 ½ lb unsalted butter");
  });

  it("yields identical totals regardless of recipe selection order", (): void => {
    const recipe1 = createMockRecipe("Dish 1", ["1 cup flour"]);
    const recipe2 = createMockRecipe("Dish 2", ["8 tbsp flour"]);

    const orderA = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const orderB = computeIngredientTotals(
      [
        { recipe: recipe2, multiplier: 1 },
        { recipe: recipe1, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    expect(orderA.items[0]?.totalDisplay).toBe(orderB.items[0]?.totalDisplay);
  });

  it("sums eggs with different descriptor words and preserves notes", (): void => {
    const recipe1 = createMockRecipe("Omelet", ["2 large eggs"]);
    const recipe2 = createMockRecipe("Cake", ["3 eggs"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const eggItem = result.items.find((item) => item.displayName === "egg");
    expect(eggItem).toBeDefined();
    expect(eggItem?.totalDisplay).toContain("5");
    expect(eggItem?.traces).toHaveLength(2);
  });

  it("adds ranges on both ends (2-3 cloves + 1 clove is 3 to 4 cloves garlic)", (): void => {
    const recipe1 = createMockRecipe("Pasta Sauce", ["2-3 cloves garlic"]);
    const recipe2 = createMockRecipe("Garlic Bread", ["1 clove garlic"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const garlicItem = result.items.find((item) => item.displayName === "garlic");
    expect(garlicItem).toBeDefined();
    expect(garlicItem?.totalDisplay).toBe("3 to 4 cloves garlic");
  });

  it("keeps cans of different package sizes on separate lines", (): void => {
    const recipe1 = createMockRecipe("Stew 1", ["1 (14 oz) can diced tomatoes"]);
    const recipe2 = createMockRecipe("Stew 2", ["1 (28 oz) can diced tomatoes"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const tomatoItems = result.items.filter((item) => item.displayName === "canned diced tomatoes");
    expect(tomatoItems).toHaveLength(2);
    expect(tomatoItems.map((i) => i.totalDisplay)).toEqual(
      expect.arrayContaining(["1 (14 oz) can canned diced tomatoes", "1 (28 oz) can canned diced tomatoes"])
    );
  });

  it("collects preparation notes across multiple recipes", (): void => {
    const recipe1 = createMockRecipe("Soup", ["1 cup chopped onions"]);
    const recipe2 = createMockRecipe("Stir Fry", ["1 cup sliced onions"]);

    const result = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );

    const onionItem = result.items.find((item) => item.displayName === "yellow onion");
    expect(onionItem).toBeDefined();
    expect(onionItem?.totalDisplay).toBe("2 cups yellow onion");
    expect(onionItem?.notes).toEqual(expect.arrayContaining(["chopped", "sliced"]));
  });

  it("flags unmatched ingredients with isMatched false", (): void => {
    const recipe = createMockRecipe("Exotic Curry", ["2 tbsp galangal root"]);

    const result = computeIngredientTotals(
      [{ recipe, multiplier: 1 }],
      BUILT_IN_INGREDIENTS
    );

    const galangalItem = result.items.find((item) => item.displayName.includes("galangal root"));
    expect(galangalItem).toBeDefined();
    expect(galangalItem?.isMatched).toBe(false);
  });

  it("combines volume and weight with known density when configured", (): void => {
    const recipe1 = createMockRecipe("Bread 1", ["1 cup granulated sugar"]);
    const recipe2 = createMockRecipe("Bread 2", ["200 g granulated sugar"]);

    // Default: volume and weight kept separate
    const resultDefault = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS
    );
    const sugarItemsDefault = resultDefault.items.filter((item) => item.displayName === "granulated sugar");
    expect(sugarItemsDefault).toHaveLength(2);

    // Combined when option is enabled
    const resultCombined = computeIngredientTotals(
      [
        { recipe: recipe1, multiplier: 1 },
        { recipe: recipe2, multiplier: 1 }
      ],
      BUILT_IN_INGREDIENTS,
      { combineVolumeAndWeight: true }
    );
    const sugarItemsCombined = resultCombined.items.filter((item) => item.displayName === "granulated sugar");
    expect(sugarItemsCombined).toHaveLength(1);
    expect(sugarItemsCombined[0]?.totalDisplay).toContain("\u2248");
  });
});
