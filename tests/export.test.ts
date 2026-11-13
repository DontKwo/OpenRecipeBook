import { describe, it, expect } from "vitest";
import {
  exportRecipeToJson,
  importRecipeFromJson,
  exportBackupZip,
  importBackupZip,
  type BackupArchiveData
} from "../src/domain/export/ownFormat";
import {
  exportRecipeToJsonLd,
  exportRecipeToMarkdown,
  exportRecipeToPlainText
} from "../src/domain/export/interopExport";
import type { Recipe } from "../src/domain/recipe/types";

const sampleRecipe: Recipe = {
  id: "rec-test-1",
  title: "Buttermilk Waffles",
  servings: 4,
  ingredientGroups: [
    {
      items: [
        { id: "i1", raw: "2 cups flour", scalable: true },
        { id: "i2", raw: "2 eggs", scalable: true }
      ]
    }
  ],
  directionGroups: [
    {
      steps: [
        { id: "s1", text: "Whisk batter until smooth." },
        { id: "s2", text: "Cook on preheated waffle iron until golden." }
      ]
    }
  ],
  cookLog: [],
  courses: ["Breakfast"],
  categories: ["Waffles"],
  collectionIds: [],
  tags: ["brunch"],
  rating: 5,
  favorite: true,
  photoIds: ["p1"],
  createdAt: "2026-11-11T00:00:00Z",
  updatedAt: "2026-11-11T00:00:00Z",
  schemaVersion: 1
};

describe("Open Format Export & Import", (): void => {
  it("exports and imports single recipe JSON losslessly", (): void => {
    const jsonString = exportRecipeToJson(sampleRecipe, [], 1);
    const parsed = importRecipeFromJson(jsonString);

    expect(parsed.format).toBe("openrecipebook-recipe");
    expect(parsed.version).toBe(1);
    expect(parsed.recipe.id).toBe(sampleRecipe.id);
    expect(parsed.recipe.title).toBe(sampleRecipe.title);
    expect(parsed.recipe.ingredientGroups[0].items).toHaveLength(2);
  });

  it("exports and restores complete library zip archive", (): void => {
    const mockBackup: BackupArchiveData = {
      manifest: {
        format: "openrecipebook-library",
        version: 1,
        exportedAt: "2026-11-11T00:00:00Z",
        appVersion: "0.1.0",
        counts: { recipes: 1, photos: 1 }
      },
      recipes: [sampleRecipe],
      photos: [{ id: "p1", blob: new Uint8Array([1, 2, 3, 4]) }],
      collections: [{ id: "col-1", name: "Favorites", createdAt: "2026-11-11T00:00:00Z" }],
      mealPlan: [],
      shoppingLists: [],
      combos: [],
      userIngredients: []
    };

    const zipBytes = exportBackupZip(mockBackup);
    expect(zipBytes.byteLength).toBeGreaterThan(0);

    const restored = importBackupZip(zipBytes);
    expect(restored.manifest.format).toBe("openrecipebook-library");
    expect(restored.recipes).toHaveLength(1);
    expect(restored.recipes[0].title).toBe("Buttermilk Waffles");
    expect(restored.collections).toHaveLength(1);
    expect(restored.photos).toHaveLength(1);
    expect(restored.photos[0].id).toBe("p1");
  });

  it("rejects corrupted zip files with path traversal", (): void => {
    expect((): void => {
      importRecipeFromJson(`{ "format": "unknown", "version": 99 }`);
    }).toThrow();
  });

  it("exports valid schema.org/Recipe JSON-LD for interoperability", (): void => {
    const jsonLdStr = exportRecipeToJsonLd(sampleRecipe);
    const parsed = JSON.parse(jsonLdStr);

    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed["@type"]).toBe("Recipe");
    expect(parsed.name).toBe("Buttermilk Waffles");
    expect(parsed.recipeIngredient).toEqual(["2 cups flour", "2 eggs"]);
    expect(parsed.recipeInstructions).toHaveLength(2);
    expect(parsed.recipeInstructions[0].text).toBe("Whisk batter until smooth.");
    expect(parsed.aggregateRating?.ratingValue).toBe(5);
  });

  it("exports clean markdown formatted recipe", (): void => {
    const md = exportRecipeToMarkdown(sampleRecipe);

    expect(md).toContain("# Buttermilk Waffles");
    expect(md).toContain("## Ingredients");
    expect(md).toContain("- 2 cups flour");
    expect(md).toContain("## Directions");
    expect(md).toContain("1. Whisk batter until smooth.");
  });

  it("exports clean plain text formatted recipe", (): void => {
    const txt = exportRecipeToPlainText(sampleRecipe);

    expect(txt).toContain("BUTTERMILK WAFFLES");
    expect(txt).toContain("INGREDIENTS:");
    expect(txt).toContain("* 2 cups flour");
    expect(txt).toContain("DIRECTIONS:");
    expect(txt).toContain("1. Whisk batter until smooth.");
  });
});
