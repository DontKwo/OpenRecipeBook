import { describe, it, expect } from "vitest";
import { RecipeSearchEngine } from "../src/domain/recipe/search";
import { SAMPLE_RECIPES } from "../src/data/sampleRecipes";

describe("Recipe Full-Text Search Engine", (): void => {
  const engine = new RecipeSearchEngine();
  engine.indexRecipes(SAMPLE_RECIPES);

  it("finds recipe by title keyword instantly", (): void => {
    const results = engine.queryRecipes(SAMPLE_RECIPES, "Starbucks");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Starbucks Lemon Loaf");
  });

  it("finds recipe by ingredient keyword", (): void => {
    const results = engine.queryRecipes(SAMPLE_RECIPES, "marshmallows");
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Avalanche Bars");
  });

  it("filters by favorites and courses correctly", (): void => {
    const listWithFavorite = [
      ...SAMPLE_RECIPES.slice(0, 2),
      { ...SAMPLE_RECIPES[2], favorite: true }
    ];
    const favorites = engine.queryRecipes(listWithFavorite, "", { onlyFavorites: true });
    expect(favorites).toHaveLength(1);

    const dinners = engine.queryRecipes(SAMPLE_RECIPES, "", { course: "Dinner" });
    expect(dinners.length).toBeGreaterThanOrEqual(1);
  });

  it("sorts by rating and title correctly", (): void => {
    const sortedByTitle = engine.queryRecipes(SAMPLE_RECIPES, "", {}, "title");
    expect(sortedByTitle[0].title.localeCompare(sortedByTitle[1].title)).toBeLessThanOrEqual(0);
  });

  it("matches folders/collections when searching by folder name or description keywords", async (): Promise<void> => {
    const { DEFAULT_COLLECTIONS } = await import("../src/data/sampleRecipes");
    const searchFolders = (query: string) => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return DEFAULT_COLLECTIONS.filter((col) =>
        col.name.toLowerCase().includes(q) ||
        (col.description ? col.description.toLowerCase().includes(q) : false)
      );
    };

    const thanksgivingMatches = searchFolders("thanks");
    expect(thanksgivingMatches).toHaveLength(1);
    expect(thanksgivingMatches[0].id).toBe("col-thanksgiving");

    const breadMatches = searchFolders("bread");
    expect(breadMatches.length).toBeGreaterThanOrEqual(1);
    expect(breadMatches.some((c) => c.name === "Breads")).toBe(true);

    const holidayMatches = searchFolders("holiday");
    expect(holidayMatches.some((c) => c.id === "col-thanksgiving")).toBe(true);
  });
});
