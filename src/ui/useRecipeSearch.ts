import { useMemo } from "react";
import type { Recipe } from "../domain/recipe/types";
import { RecipeSearchEngine, type SearchFilters, type SortField } from "../domain/recipe/search";

export function useRecipeSearch(
  recipes: Recipe[],
  query: string,
  filters: SearchFilters = {},
  sortBy: SortField = "title"
): Recipe[] {
  const engine = useMemo(() => {
    const e = new RecipeSearchEngine();
    e.indexRecipes(recipes);
    return e;
  }, [recipes]);

  return useMemo(() => {
    return engine.queryRecipes(recipes, query, filters, sortBy);
  }, [engine, recipes, query, filters, sortBy]);
}
