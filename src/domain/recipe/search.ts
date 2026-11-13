import MiniSearch from "minisearch";
import type { Recipe } from "./types";

export interface SearchFilters {
  course?: string;
  category?: string;
  collectionId?: string;
  onlyFavorites?: boolean;
  minRating?: number;
  maxMinutes?: number;
  hasPhoto?: boolean;
}

export type SortField = "recentAdded" | "recentEdited" | "title" | "rating" | "totalTime";

interface SearchIndexDocument {
  id: string;
  title: string;
  ingredientsText: string;
  tagsText: string;
  notesText: string;
  sourceText: string;
  coursesText: string;
  categoriesText: string;
}

export class RecipeSearchEngine {
  private miniSearch: MiniSearch<SearchIndexDocument>;

  constructor() {
    this.miniSearch = new MiniSearch({
      fields: ["title", "ingredientsText", "tagsText", "notesText", "sourceText", "coursesText", "categoriesText"],
      storeFields: ["id"],
      searchOptions: {
        boost: { title: 3, ingredientsText: 2 },
        fuzzy: 0.2,
        prefix: true
      }
    });
  }

  public indexRecipes(recipes: Recipe[]): void {
    this.miniSearch.removeAll();
    const documents: SearchIndexDocument[] = recipes.map((recipe: Recipe): SearchIndexDocument => {
      const ingredientLines: string[] = [];
      for (const group of recipe.ingredientGroups) {
        for (const item of group.items) {
          ingredientLines.push(item.raw);
        }
      }

      return {
        id: recipe.id,
        title: recipe.title,
        ingredientsText: ingredientLines.join(" "),
        tagsText: recipe.tags.join(" "),
        notesText: recipe.notes || "",
        sourceText: `${recipe.sourceName || ""} ${recipe.sourceUrl || ""}`,
        coursesText: recipe.courses.join(" "),
        categoriesText: recipe.categories.join(" ")
      };
    });

    this.miniSearch.addAll(documents);
  }

  public queryRecipes(
    recipes: Recipe[],
    searchQuery: string,
    filters: SearchFilters = {},
    sortBy: SortField = "recentAdded"
  ): Recipe[] {
    let matchingIds: Set<string> | null = null;
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length > 0) {
      const searchResults = this.miniSearch.search(trimmedQuery);
      matchingIds = new Set(searchResults.map((result): string => result.id));
    }

    // Filter
    let filteredList = recipes.filter((recipe: Recipe): boolean => {
      if (matchingIds && !matchingIds.has(recipe.id)) {
        return false;
      }
      if (filters.onlyFavorites && !recipe.favorite) {
        return false;
      }
      if (filters.minRating && recipe.rating < filters.minRating) {
        return false;
      }
      if (filters.maxMinutes && recipe.totalMinutes && recipe.totalMinutes > filters.maxMinutes) {
        return false;
      }
      if (filters.hasPhoto && recipe.photoIds.length === 0) {
        return false;
      }
      if (filters.course && !recipe.courses.includes(filters.course)) {
        return false;
      }
      if (filters.category && !recipe.categories.includes(filters.category)) {
        return false;
      }
      if (filters.collectionId && !recipe.collectionIds.includes(filters.collectionId)) {
        return false;
      }
      return true;
    });

    // Sort
    filteredList.sort((a: Recipe, b: Recipe): number => {
      switch (sortBy) {
        case "recentAdded":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "recentEdited":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "title":
          return a.title.localeCompare(b.title);
        case "rating":
          return b.rating - a.rating;
        case "totalTime":
          return (a.totalMinutes || 9999) - (b.totalMinutes || 9999);
        default:
          return 0;
      }
    });

    return filteredList;
  }
}
