import { describe, it, expect } from "vitest";
import {
  pruneExcessVersions,
  createVersionSummaryText
} from "../src/domain/recipe/versionHistory";
import type { Recipe } from "../src/domain/recipe/types";
import type { RecipeVersionRecord } from "../src/data/db";

const mockRecipe: Recipe = {
  id: "rec-test-1",
  title: "Classic Pancakes",
  servings: 4,
  ingredientGroups: [
    {
      heading: "Main",
      items: [
        { id: "i1", raw: "2 cups flour", scalable: true },
        { id: "i2", raw: "1 cup milk", scalable: true }
      ]
    }
  ],
  directionGroups: [
    {
      heading: "Steps",
      steps: [
        { id: "s1", text: "Whisk ingredients" },
        { id: "s2", text: "Cook on skillet" }
      ]
    }
  ],
  cookLog: [],
  courses: ["Breakfast"],
  categories: ["Pancakes"],
  collectionIds: [],
  tags: [],
  rating: 5,
  favorite: true,
  photoIds: [],
  createdAt: "2026-11-12T12:00:00Z",
  updatedAt: "2026-11-12T12:00:00Z",
  schemaVersion: 1
};

describe("Recipe Version History", () => {
  it("formats version summary text with recipe title, ingredients, and steps count", () => {
    const summary = createVersionSummaryText(mockRecipe);
    expect(summary).toBe("Classic Pancakes (2 ing, 2 steps)");
  });

  it("returns empty array to prune when count does not exceed limit", () => {
    const records: RecipeVersionRecord[] = [
      {
        id: "v1",
        recipeId: "rec-test-1",
        timestamp: "2026-11-12T10:00:00Z",
        summary: "v1",
        snapshot: mockRecipe
      },
      {
        id: "v2",
        recipeId: "rec-test-1",
        timestamp: "2026-11-12T11:00:00Z",
        summary: "v2",
        snapshot: mockRecipe
      }
    ];

    const toPrune = pruneExcessVersions(records, 10);
    expect(toPrune).toHaveLength(0);
  });

  it("identifies oldest versions to prune when exceeding limit", () => {
    const records: RecipeVersionRecord[] = Array.from({ length: 13 }, (_, i) => ({
      id: `v${i + 1}`,
      recipeId: "rec-test-1",
      timestamp: new Date(Date.UTC(2026, 10, 12, i, 0, 0)).toISOString(),
      summary: `v${i + 1}`,
      snapshot: mockRecipe
    }));

    const toPrune = pruneExcessVersions(records, 10);
    expect(toPrune).toHaveLength(3);
    expect(toPrune[0].id).toBe("v1");
    expect(toPrune[1].id).toBe("v2");
    expect(toPrune[2].id).toBe("v3");
  });
});
