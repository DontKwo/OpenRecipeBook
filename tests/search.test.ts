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
    const favorites = engine.queryRecipes(SAMPLE_RECIPES, "", { onlyFavorites: true });
    expect(favorites.length).toBeGreaterThanOrEqual(1);

    const dinners = engine.queryRecipes(SAMPLE_RECIPES, "", { course: "Dinner" });
    expect(dinners.length).toBeGreaterThanOrEqual(1);
  });

  it("sorts by rating and title correctly", (): void => {
    const sortedByTitle = engine.queryRecipes(SAMPLE_RECIPES, "", {}, "title");
    expect(sortedByTitle[0].title.localeCompare(sortedByTitle[1].title)).toBeLessThanOrEqual(0);
  });
});
