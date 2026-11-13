import Dexie, { type Table } from "dexie";
import type {
  Recipe,
  PhotoRecord,
  Collection,
  MealPlanEntry,
  ShoppingList,
  Combo,
  DictionaryIngredient
} from "../domain/recipe/types";

export interface AppSetting {
  key: string;
  value: unknown;
}

export interface RecipeVersionRecord {
  id: string;
  recipeId: string;
  timestamp: string;
  summary: string;
  snapshot: Recipe;
}

export class RecipeDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  photos!: Table<PhotoRecord, string>;
  collections!: Table<Collection, string>;
  mealPlan!: Table<MealPlanEntry, string>;
  shoppingLists!: Table<ShoppingList, string>;
  combos!: Table<Combo, string>;
  userIngredients!: Table<DictionaryIngredient, string>;
  settings!: Table<AppSetting, string>;
  recipeVersions!: Table<RecipeVersionRecord, string>;

  constructor() {
    super("OpenRecipeBookDB");

    // Version 1 schema definition
    this.version(1).stores({
      recipes: "id, title, rating, favorite, createdAt, updatedAt, *courses, *categories, *collectionIds, *tags",
      photos: "id, recipeId",
      collections: "id, name, createdAt",
      mealPlan: "id, date, slot, recipeId",
      shoppingLists: "id, name",
      combos: "id, name, createdAt",
      userIngredients: "id, name, aisle, unitFamily",
      settings: "key"
    });

    // Version 2 schema definition adding recipe version history
    this.version(2).stores({
      recipeVersions: "id, recipeId, timestamp"
    });
  }
}

export const db: RecipeDatabase = new RecipeDatabase();
