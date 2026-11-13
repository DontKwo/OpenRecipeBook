import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import type {
  Recipe,
  Collection,
  MealPlanEntry,
  ShoppingList,
  Combo,
  DictionaryIngredient
} from "../recipe/types";

export interface SerializedPhoto {
  id: string;
  mime: string;
  width: number;
  height: number;
  caption?: string;
  dataBase64?: string;
}

export interface SingleRecipeFile {
  format: "openrecipebook-recipe";
  version: number;
  exportedAt: string;
  scale?: number;
  recipe: Recipe;
  photos?: SerializedPhoto[];
}

export interface BackupArchiveData {
  manifest: {
    format: "openrecipebook-library";
    version: number;
    exportedAt: string;
    appVersion: string;
    counts: {
      recipes: number;
      photos: number;
    };
  };
  recipes: Recipe[];
  photos: { id: string; blob: Uint8Array }[];
  collections: Collection[];
  mealPlan: MealPlanEntry[];
  shoppingLists: ShoppingList[];
  combos: Combo[];
  userIngredients: DictionaryIngredient[];
}

export function exportRecipeToJson(
  recipe: Recipe,
  photos: SerializedPhoto[] = [],
  scale: number = 1
): string {
  const payload: SingleRecipeFile = {
    format: "openrecipebook-recipe",
    version: 1,
    exportedAt: new Date().toISOString(),
    scale,
    recipe,
    photos
  };
  return JSON.stringify(payload, null, 2);
}

export function importRecipeFromJson(jsonText: string): SingleRecipeFile {
  const parsed = JSON.parse(jsonText);
  if (parsed.format !== "openrecipebook-recipe") {
    throw new Error("Invalid recipe format");
  }
  if (typeof parsed.version !== "number" || parsed.version > 1) {
    throw new Error("Unsupported format version");
  }
  if (!parsed.recipe || typeof parsed.recipe.title !== "string") {
    throw new Error("Invalid recipe record");
  }
  return parsed as SingleRecipeFile;
}

export function exportBackupZip(data: BackupArchiveData): Uint8Array {
  const zipFiles: Record<string, Uint8Array> = {};

  // Manifest
  zipFiles["manifest.json"] = strToU8(JSON.stringify(data.manifest, null, 2));

  // Recipes
  for (const recipeItem of data.recipes) {
    const filename = `recipes/${recipeItem.id}.json`;
    zipFiles[filename] = strToU8(JSON.stringify(recipeItem, null, 2));
  }

  // Photos
  for (const photoItem of data.photos) {
    const filename = `photos/${photoItem.id}.webp`;
    zipFiles[filename] = photoItem.blob;
  }

  // Related collections and metadata
  zipFiles["collections.json"] = strToU8(JSON.stringify(data.collections, null, 2));
  zipFiles["mealplan.json"] = strToU8(JSON.stringify(data.mealPlan, null, 2));
  zipFiles["shopping-lists.json"] = strToU8(JSON.stringify(data.shoppingLists, null, 2));
  zipFiles["combos.json"] = strToU8(JSON.stringify(data.combos, null, 2));
  zipFiles["user-ingredients.json"] = strToU8(JSON.stringify(data.userIngredients, null, 2));

  return zipSync(zipFiles);
}

// Export a selection of recipes into a valid OpenRecipeBook zip archive
export function exportRecipesBatchZip(recipes: Recipe[]): Uint8Array {
  const zipFiles: Record<string, Uint8Array> = {};

  zipFiles["manifest.json"] = strToU8(
    JSON.stringify(
      {
        format: "openrecipebook-library",
        version: 1,
        exportedAt: new Date().toISOString(),
        appVersion: "0.1.0",
        counts: {
          recipes: recipes.length,
          photos: 0
        }
      },
      null,
      2
    )
  );

  for (const recipeItem of recipes) {
    const filename = `recipes/${recipeItem.id}.json`;
    zipFiles[filename] = strToU8(JSON.stringify(recipeItem, null, 2));
  }

  return zipSync(zipFiles);
}

export function importBackupZip(archiveBytes: Uint8Array): BackupArchiveData {
  const decompressed = unzipSync(archiveBytes);

  // Security check: ensure no path traversal
  for (const filePath of Object.keys(decompressed)) {
    if (filePath.includes("..") || filePath.startsWith("/") || filePath.startsWith("\\")) {
      throw new Error("Security violation: path traversal detected in zip archive");
    }
  }

  const manifestBytes = decompressed["manifest.json"];
  if (!manifestBytes) {
    throw new Error("Missing manifest.json in archive");
  }

  const manifest = JSON.parse(strFromU8(manifestBytes));
  if (manifest.format !== "openrecipebook-library") {
    throw new Error("Invalid archive format identifier");
  }

  const recipes: Recipe[] = [];
  const photos: { id: string; blob: Uint8Array }[] = [];

  for (const [entryPath, entryBytes] of Object.entries(decompressed)) {
    if (entryPath.startsWith("recipes/") && entryPath.endsWith(".json")) {
      const parsedRecipe = JSON.parse(strFromU8(entryBytes));
      recipes.push(parsedRecipe);
    } else if (entryPath.startsWith("photos/")) {
      const photoId = entryPath.replace(/^photos\//, "").replace(/\.[^.]+$/, "");
      photos.push({ id: photoId, blob: entryBytes });
    }
  }

  const collections = decompressed["collections.json"]
    ? JSON.parse(strFromU8(decompressed["collections.json"]))
    : [];

  const mealPlan = decompressed["mealplan.json"]
    ? JSON.parse(strFromU8(decompressed["mealplan.json"]))
    : [];

  const shoppingLists = decompressed["shopping-lists.json"]
    ? JSON.parse(strFromU8(decompressed["shopping-lists.json"]))
    : [];

  const combos = decompressed["combos.json"]
    ? JSON.parse(strFromU8(decompressed["combos.json"]))
    : [];

  const userIngredients = decompressed["user-ingredients.json"]
    ? JSON.parse(strFromU8(decompressed["user-ingredients.json"]))
    : [];

  return {
    manifest,
    recipes,
    photos,
    collections,
    mealPlan,
    shoppingLists,
    combos,
    userIngredients
  };
}
