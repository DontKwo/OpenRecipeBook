import { describe, it, expect } from "vitest";
import {
  calculateRecipeNutrition,
  estimateIngredientWeightGrams,
  lookupNutrients
} from "../src/domain/nutrition/nutritionCalculator";
import type { Recipe, DictionaryIngredient } from "../src/domain/recipe/types";

describe("Nutrition Calculator", () => {
  const mockFlour: DictionaryIngredient = {
    id: "flour",
    name: "All-Purpose Flour",
    aliases: ["flour", "all-purpose flour", "white flour"],
    aisle: "Baking",
    unitFamily: "volume",
    gramsPerMl: 0.528,
    densitySource: "USDA FDC 168934"
  };

  const mockMilk: DictionaryIngredient = {
    id: "whole-milk",
    name: "Whole Milk",
    aliases: ["milk", "vitamin d milk"],
    aisle: "Dairy",
    unitFamily: "volume",
    gramsPerMl: 1.03,
    densitySource: "USDA FDC 746782"
  };

  const mockEgg: DictionaryIngredient = {
    id: "egg",
    name: "Egg",
    aliases: ["eggs", "large egg"],
    aisle: "Dairy",
    unitFamily: "count"
  };

  it("calculates ingredient weight correctly across weight, volume, and count", () => {
    // 100 grams of flour
    const weightGrams = estimateIngredientWeightGrams(100, "g", mockFlour);
    expect(weightGrams).toBe(100);

    // 1 lb
    const lbGrams = estimateIngredientWeightGrams(1, "lb", null);
    expect(Math.round(lbGrams)).toBe(454);

    // 1 cup flour with density 0.528 g/ml -> 236.588 * 0.528 ≈ 125g
    const cupFlourGrams = estimateIngredientWeightGrams(1, "cup", mockFlour);
    expect(Math.round(cupFlourGrams)).toBe(125);

    // 2 large eggs -> 2 * 50g = 100g
    const eggGrams = estimateIngredientWeightGrams(2, undefined, mockEgg);
    expect(eggGrams).toBe(100);
  });

  it("looks up nutrient profile by dictionary id, name, alias, and raw text", () => {
    const fromDict = lookupNutrients(mockFlour, "1 cup flour");
    expect(fromDict).not.toBeNull();
    expect(fromDict?.calories).toBe(364);

    const fromRaw = lookupNutrients(null, "2 tbsp olive oil");
    expect(fromRaw).not.toBeNull();
    expect(fromRaw?.calories).toBe(884);
  });

  it("calculates nutrition for a simple pancake recipe", () => {
    const pancakeRecipe: Recipe = {
      id: "recipe-pancakes",
      title: "Simple Pancakes",
      servings: 4,
      ingredientGroups: [
        {
          items: [
            { id: "i1", raw: "2 cups all-purpose flour", quantity: { kind: "single", value: 2 }, unit: "cup", name: "flour", scalable: true },
            { id: "i2", raw: "2 cups milk", quantity: { kind: "single", value: 2 }, unit: "cup", name: "milk", scalable: true },
            { id: "i3", raw: "2 eggs", quantity: { kind: "single", value: 2 }, name: "eggs", scalable: true }
          ]
        }
      ],
      directionGroups: [],
      courses: ["Breakfast"],
      categories: ["Pancakes"],
      collectionIds: [],
      tags: [],
      cookLog: [],
      rating: 5,
      favorite: false,
      photoIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1
    };

    const dictionary = [mockFlour, mockMilk, mockEgg];
    const estimate = calculateRecipeNutrition(pancakeRecipe, 1, dictionary);

    expect(estimate.servings).toBe(4);
    expect(estimate.coveragePercent).toBe(100);
    expect(estimate.matchedCount).toBe(3);

    // Approximate batch totals calculated from standard USDA densities
    expect(estimate.totalBatch.calories).toBeGreaterThan(1200);
    expect(estimate.totalBatch.calories).toBeLessThan(1500);
    expect(estimate.perServing.calories).toBeGreaterThan(300);
    expect(estimate.perServing.calories).toBeLessThan(400);

    // Protein should be around 10-15g per serving
    expect(estimate.perServing.protein).toBeGreaterThan(8);
  });

  it("scales nutrition accurately with recipe multiplier", () => {
    const oatmealRecipe: Recipe = {
      id: "recipe-oats",
      title: "Oatmeal",
      servings: 1,
      ingredientGroups: [
        {
          items: [
            { id: "i1", raw: "1 cup rolled oats", quantity: { kind: "single", value: 1 }, unit: "cup", name: "rolled oats", scalable: true }
          ]
        }
      ],
      directionGroups: [],
      courses: ["Breakfast"],
      categories: [],
      collectionIds: [],
      tags: [],
      cookLog: [],
      rating: 4,
      favorite: false,
      photoIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1
    };

    const baseEstimate = calculateRecipeNutrition(oatmealRecipe, 1);
    const doubledEstimate = calculateRecipeNutrition(oatmealRecipe, 2);

    // Per-serving nutrition stays the same when scaled
    expect(doubledEstimate.perServing.calories).toBe(baseEstimate.perServing.calories);
    // Batch totals double
    expect(doubledEstimate.totalBatch.calories).toBeCloseTo(baseEstimate.totalBatch.calories * 2, 0);
  });
});
