import { describe, it, expect, beforeEach } from "vitest";
import type { Recipe } from "../src/domain/recipe/types";
import { exportRecipeToJson, exportBackupZip } from "../src/domain/export/ownFormat";
import {
  sanitizeStorageFilename,
  getRecipeStorageFilename,
  classifyStorageFilename,
  getStorageLocationInfo,
  writeRecipeToStorage,
  deleteRecipeFromStorage,
  syncLibraryWithStorage,
  writeLibraryMetadataToStorage,
  addFilesToStorage,
  readStorageFileText,
  deleteStorageFile,
  clearVirtualStorageMemoryForTests
} from "../src/domain/storage/recipeStorageService";

function makeRecipe(id: string, title: string, updatedAt: string = "2026-11-17T00:00:00.000Z"): Recipe {
  return {
    id,
    title,
    servings: 4,
    ingredientGroups: [{ items: [{ id: "ing-1", raw: "1 cup flour", scalable: true }] }],
    directionGroups: [{ steps: [{ id: "step-1", text: "Mix well." }] }],
    cookLog: [],
    courses: ["Dinner"],
    categories: [],
    collectionIds: [],
    tags: [],
    rating: 5,
    favorite: false,
    photoIds: [],
    createdAt: "2026-11-17T00:00:00.000Z",
    updatedAt,
    schemaVersion: 1
  };
}

function makeMockFile(name: string, payload: string | Uint8Array): File {
  const bytes = typeof payload === "string" ? new TextEncoder().encode(payload) : payload;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return {
    name,
    size: copy.byteLength,
    arrayBuffer: async (): Promise<ArrayBuffer> => copy.buffer
  } as unknown as File;
}

describe("Recipe Storage Service", (): void => {
  beforeEach((): void => {
    clearVirtualStorageMemoryForTests();
    const globalObj = globalThis as unknown as { window?: unknown };
    delete globalObj.window;
  });

  it("sanitizes dangerous path traversal filenames cleanly", (): void => {
    const cases: Array<[string, string]> = [
      ["../../etc/passwd", "__etc_passwd"],
      ["my\\bad:file*name?.recipe.json", "my_bad_file_name_.recipe.json"],
      ["normal-cake.recipe.json", "normal-cake.recipe.json"]
    ];
    for (const [input, expected] of cases) {
      const sanitized = sanitizeStorageFilename(input);
      expect(sanitized).toBe(expected);
      expect(sanitized.includes("..")).toBe(false);
      expect(sanitized.includes("/")).toBe(false);
      expect(sanitized.includes("\\")).toBe(false);
    }
  });

  it("classifies storage files by extension accurately", (): void => {
    expect(classifyStorageFilename("pancakes__rec-1.recipe.json")).toBe("recipe");
    expect(classifyStorageFilename("schema.jsonld")).toBe("recipe");
    expect(classifyStorageFilename("backup.openrecipebook.zip")).toBe("archive");
    expect(classifyStorageFilename("recipes.paprikarecipes")).toBe("archive");
    expect(classifyStorageFilename("chili.txt")).toBe("text");
    expect(classifyStorageFilename("library-metadata.json")).toBe("metadata");
    expect(classifyStorageFilename("photo.png")).toBe("other");
  });

  it("mirrors active recipes to storage and deletes trashed files", async (): Promise<void> => {
    const chili = makeRecipe("rec-chili", "Turkey Chili");
    await writeRecipeToStorage(chili);

    const filename = getRecipeStorageFilename(chili);
    const storedText = await readStorageFileText(filename);
    expect(storedText).toContain("Turkey Chili");

    const info = await getStorageLocationInfo([chili]);
    expect(info.files.some((f) => f.name === filename && f.recipeId === "rec-chili")).toBe(true);

    await deleteRecipeFromStorage(chili.id, chili.title);
    const afterDelete = await readStorageFileText(filename);
    expect(afterDelete).toBeNull();
  });

  it("restores recipes and folder metadata from storage when library is empty", async (): Promise<void> => {
    const pasta = makeRecipe("rec-pasta", "Garlic Pasta");
    await writeRecipeToStorage(pasta);
    await writeLibraryMetadataToStorage({
      collections: [{ id: "col-1", name: "Weeknight", createdAt: "2026-11-17T00:00:00.000Z" }],
      mealPlan: [],
      shoppingLists: [],
      combos: [],
      userIngredients: []
    });

    const syncResult = await syncLibraryWithStorage([]);
    expect(syncResult.importedRecipes.map((r) => r.id)).toContain("rec-pasta");
    expect(syncResult.restoredMetadata?.collections[0]?.name).toBe("Weeknight");
  });

  it("adds .recipe.json, .txt, and .zip backup files into storage", async (): Promise<void> => {
    const pie = makeRecipe("rec-pie", "Apple Pie");
    const pieFile = makeMockFile("apple-pie.recipe.json", exportRecipeToJson(pie));
    const textFile = makeMockFile(
      "garlic-toast.txt",
      "Garlic Toast\n\nIngredients:\n2 slices bread\n1 tbsp butter\n\nDirections:\nToast until golden."
    );
    const zipBytes = exportBackupZip({
      manifest: {
        format: "openrecipebook-library",
        version: 1,
        exportedAt: "2026-11-17T00:00:00.000Z",
        appVersion: "0.1.3",
        counts: { recipes: 1, photos: 0 }
      },
      recipes: [makeRecipe("rec-soup", "Tomato Soup")],
      photos: [],
      collections: [],
      mealPlan: [],
      shoppingLists: [],
      combos: [],
      userIngredients: []
    });
    const zipFile = makeMockFile("backup.openrecipebook.zip", new Uint8Array(zipBytes));

    const added = await addFilesToStorage([pieFile, textFile, zipFile]);
    expect(added.errors).toEqual([]);
    expect(added.importedRecipes.map((r) => r.title)).toEqual(
      expect.arrayContaining(["Apple Pie", "Garlic Toast"])
    );
    expect(added.reviewCandidates.map((r) => r.title)).toEqual(["Tomato Soup"]);

    const info = await getStorageLocationInfo([]);
    expect(info.files.some((f) => f.name === "backup.openrecipebook.zip")).toBe(true);

    const delRes = await deleteStorageFile("backup.openrecipebook.zip");
    expect(delRes.ok).toBe(true);
  });

  it("reads storage from nativeApi bridge when available", async (): Promise<void> => {
    const globalObj = globalThis as unknown as { window?: Record<string, unknown> };
    globalObj.window = {
      nativeApi: {
        isDesktop: true,
        getStorageInfo: async () => ({
          ok: true,
          platform: "desktop",
          storagePath: "/storage/OpenRecipeBook/recipes",
          canOpenSystemFolder: true,
          canChooseFolder: true,
          files: [
            {
              name: "brownies__rec-1.recipe.json",
              path: "/storage/OpenRecipeBook/recipes/brownies__rec-1.recipe.json",
              sizeBytes: 512,
              updatedAt: "2026-11-17T00:00:00.000Z",
              kind: "recipe",
              recipeId: "rec-1",
              recipeTitle: "Brownies"
            }
          ]
        })
      }
    };

    const info = await getStorageLocationInfo([]);
    expect(info.platform).toBe("desktop");
    expect(info.storagePath).toBe("/storage/OpenRecipeBook/recipes");
    expect(info.canChooseFolder).toBe(true);
    expect(info.files).toHaveLength(1);
    expect(info.files[0].recipeTitle).toBe("Brownies");
  });
});
