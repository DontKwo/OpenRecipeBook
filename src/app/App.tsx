import { useState, useEffect, type FC, type ReactElement } from "react";
import { db } from "../data/db";
import type {
  Recipe,
  ShoppingList,
  ShoppingItem,
  MealPlanEntry,
  Combo,
  DictionaryIngredient,
  Collection,
  SavedMenu
} from "../domain/recipe/types";
import { BRAND } from "../config/brand";
import { SAMPLE_RECIPES, DEFAULT_COLLECTIONS } from "../data/sampleRecipes";
import {
  exportRecipeToJson,
  exportBackupZip,
  exportRecipesBatchZip,
  importBackupZip,
  importRecipeFromJson,
  type BackupArchiveData
} from "../domain/export/ownFormat";
import { parseRecipeKeeperZip } from "../domain/import/recipeKeeper";
import { parsePaprikaRecipesZip } from "../domain/import/paprika";
import { parseSchemaRecipeJsonLd } from "../domain/import/jsonld";
import { parsePlainTextRecipe } from "../domain/import/textRecipeParser";
import { hydratePhotoUrlCache, saveImportedPhotosToDb } from "../domain/recipe/photoPipeline";
import {
  createDefaultShoppingList,
  buildShoppingItemFromIngredient,
  mergeShoppingItems
} from "../domain/shopping/shoppingService";
import { runRecipeCleanupMigration } from "../data/migration";
import { saveRecipe } from "../data/recipePersistence";
import { RecipeLibrary } from "../features/library/RecipeLibrary";
import { RecipeView } from "../features/recipe-view/RecipeView";
import { RecipeEditor } from "../features/editor/RecipeEditor";
import { IngredientTotalsView } from "../features/totals/IngredientTotalsView";
import { ShoppingListView } from "../features/shopping/ShoppingListView";
import { MealPlannerView } from "../features/planner/MealPlannerView";
import { CookModeView } from "../features/cook-mode/CookModeView";
import { SettingsView } from "../features/settings/SettingsView";
import { UserIngredientsModal } from "../features/settings/UserIngredientsModal";
import { ComponentGallery } from "../features/gallery/ComponentGallery";
import { ImportReviewModal } from "../features/import/ImportReviewModal";
import { CookbookBuilderModal } from "../features/cookbook/CookbookBuilderModal";
import { StorageLocationModal } from "../features/storage/StorageLocationModal";
import {
  syncLibraryWithStorage,
  writeRecipeToStorage,
  deleteRecipeFromStorage,
  writeLibraryMetadataToStorage,
  type AddStorageFilesResult
} from "../domain/storage/recipeStorageService";
import {
  FileSystemFolderBackupDestination,
  type AutoBackupResult
} from "../domain/backup/backupFolder";
import {
  BookOpenIcon,
  CalculatorIcon,
  SettingsIcon,
  CalendarIcon,
  ShoppingCartIcon,
  PlusIcon
} from "../ui/icons";
import { Button } from "../ui/Button";
import { Dialog } from "../ui/Dialog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ToastProvider, useToast } from "../ui/Toast";
import styles from "./AppShell.module.css";

type ActiveTab =
  | "library"
  | "recipe-view"
  | "editor"
  | "totals"
  | "planner"
  | "shopping"
  | "settings"
  | "gallery";

function AppContent(): ReactElement {
  const { showToast } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>(SAMPLE_RECIPES);
  const [trashedRecipes, setTrashedRecipes] = useState<Recipe[]>([]);
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [mealPlanEntries, setMealPlanEntries] = useState<MealPlanEntry[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);
  const [userIngredients, setUserIngredients] = useState<DictionaryIngredient[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [showUserIngredientsModal, setShowUserIngredientsModal] = useState<boolean>(false);
  const [showCookbookModal, setShowCookbookModal] = useState<boolean>(false);
  const [cookbookInitialCollectionId, setCookbookInitialCollectionId] = useState<string | undefined>(undefined);
  const [cookbookInitialRecipeId, setCookbookInitialRecipeId] = useState<string | undefined>(undefined);
  const [showStorageModal, setShowStorageModal] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [emptyTrashConfirmOpen, setEmptyTrashConfirmOpen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [sharedImportUrl, setSharedImportUrl] = useState<string | undefined>(undefined);
  const [cookModeRecipe, setCookModeRecipe] = useState<Recipe | null>(null);
  const [cookModeMultiplier, setCookModeMultiplier] = useState<number>(1);
  const [importCandidates, setImportCandidates] = useState<Recipe[] | null>(null);

  const persistMetadataToStorage = async (): Promise<void> => {
    try {
      const [cols, meals, lists, storedCombos, ingredients] = await Promise.all([
        db.collections.toArray(),
        db.mealPlan.toArray(),
        db.shoppingLists.toArray(),
        db.combos.toArray(),
        db.userIngredients.toArray()
      ]);
      await writeLibraryMetadataToStorage({
        collections: cols,
        mealPlan: meals,
        shoppingLists: lists,
        combos: storedCombos,
        userIngredients: ingredients
      });
    } catch {
      // Ignore metadata write failure
    }
  };

  const refreshAllData = async (): Promise<void> => {
    try {
      await runRecipeCleanupMigration();
      await hydratePhotoUrlCache();

      let allStored = await db.recipes.toArray();
      const syncResult = await syncLibraryWithStorage(allStored);

      if (syncResult.importedRecipes.length > 0) {
        for (const imported of syncResult.importedRecipes) {
          await db.recipes.put(imported);
        }
        allStored = await db.recipes.toArray();
      }

      if (syncResult.restoredMetadata) {
        const meta = syncResult.restoredMetadata;
        if ((await db.collections.count()) === 0 && meta.collections.length > 0) {
          for (const col of meta.collections) await db.collections.put(col);
        }
        if ((await db.mealPlan.count()) === 0 && meta.mealPlan.length > 0) {
          for (const entry of meta.mealPlan) await db.mealPlan.put(entry);
        }
        if ((await db.shoppingLists.count()) === 0 && meta.shoppingLists.length > 0) {
          for (const list of meta.shoppingLists) await db.shoppingLists.put(list);
        }
        if ((await db.combos.count()) === 0 && meta.combos.length > 0) {
          for (const combo of meta.combos) await db.combos.put(combo);
        }
        if ((await db.userIngredients.count()) === 0 && meta.userIngredients.length > 0) {
          for (const ing of meta.userIngredients) await db.userIngredients.put(ing);
        }
      }

      if (allStored.length === 0) {
        for (const sample of SAMPLE_RECIPES) {
          await db.recipes.put(sample);
          await writeRecipeToStorage(sample);
        }
        allStored = await db.recipes.toArray();
      } else {
        // Sync photoIds and sample courses for bundled sample recipes
        const sampleMap = new Map(SAMPLE_RECIPES.map((s: Recipe): [string, Recipe] => [s.id, s]));
        for (const recipe of allStored) {
          const sample = sampleMap.get(recipe.id);
          if (sample) {
            let updated = false;
            if (!recipe.photoIds || recipe.photoIds.length === 0) {
              recipe.photoIds = sample.photoIds;
              updated = true;
            }
            if (sample.courses && sample.courses.length > 0) {
              const currentCourses = new Set(recipe.courses || []);
              const missing = sample.courses.filter((c: string): boolean => !currentCourses.has(c));
              if (missing.length > 0) {
                recipe.courses = [...(recipe.courses || []), ...missing];
                updated = true;
              }
            }
            if (updated) {
              await db.recipes.put(recipe);
            }
          }
        }
      }

      const active: Recipe[] = [];
      const trashed: Recipe[] = [];
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      for (const recipe of allStored) {
        if (recipe.deletedAt) {
          const deletedTime = new Date(recipe.deletedAt).getTime();
          if (now - deletedTime > thirtyDaysMs) {
            await db.recipes.delete(recipe.id);
            await deleteRecipeFromStorage(recipe.id, recipe.title);
          } else {
            trashed.push(recipe);
          }
        } else {
          active.push(recipe);
        }
      }

      setRecipes(active);
      setTrashedRecipes(trashed);

      let storedLists = await db.shoppingLists.toArray();
      if (storedLists.length === 0) {
        const defaultList = createDefaultShoppingList("Groceries");
        await db.shoppingLists.add(defaultList);
        storedLists = [defaultList];
      }
      setShoppingLists(storedLists);

      const storedEntries = await db.mealPlan.toArray();
      setMealPlanEntries(storedEntries);

      const storedCombos = await db.combos.toArray();
      setCombos(storedCombos);

      const storedIngredients = await db.userIngredients.toArray();
      setUserIngredients(storedIngredients);

      let storedCollections = await db.collections.toArray();
      if (storedCollections.length === 0) {
        for (const col of DEFAULT_COLLECTIONS) {
          await db.collections.put(col);
        }
        storedCollections = await db.collections.toArray();
      }
      setCollections(storedCollections);

      const menuSetting = await db.settings.get("savedMenus");
      if (menuSetting && Array.isArray(menuSetting.value)) {
        setSavedMenus(menuSetting.value as SavedMenu[]);
      }
    } catch {
      // Continue on database load error
    }
  };

  const processImportFile = async (file: File): Promise<void> => {
    const lower = file.name.toLowerCase();
    try {
      if (lower.endsWith(".json") || lower.endsWith(".jsonld")) {
        const text = await file.text();
        const parsed = JSON.parse(text) as Record<string, unknown>;
        if (parsed && typeof parsed === "object" && ("@context" in parsed || "@graph" in parsed)) {
          const imported = parseSchemaRecipeJsonLd(parsed);
          if (imported.length > 0) {
            setImportCandidates(imported);
          } else {
            showToast("No recipe entries found in JSON-LD file.");
          }
        } else {
          const parsedRecipe = importRecipeFromJson(text);
          await saveRecipe(parsedRecipe.recipe);
          await writeRecipeToStorage(parsedRecipe.recipe);
          await refreshAllData();
          setSelectedRecipeId(parsedRecipe.recipe.id);
          setActiveTab("recipe-view");
          showToast(`Imported "${parsedRecipe.recipe.title}"`);
        }
      } else if (lower.endsWith(".zip") || lower.endsWith(".paprikarecipes")) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (lower.endsWith(".paprikarecipes")) {
          const recipesFromZip = parsePaprikaRecipesZip(bytes);
          if (recipesFromZip.length === 0) {
            showToast("No recipes found in .paprikarecipes archive.");
            return;
          }
          setImportCandidates(recipesFromZip);
        } else {
          try {
            const rkResult = parseRecipeKeeperZip(bytes);
            await saveImportedPhotosToDb(rkResult.photos);
            setImportCandidates(rkResult.recipes);
          } catch {
            const backupData = importBackupZip(bytes);
            await saveImportedPhotosToDb(backupData.photos || []);
            setImportCandidates(backupData.recipes);
          }
        }
      } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
        const text = await file.text();
        const parsed = parsePlainTextRecipe(text);
        const nowIso = new Date().toISOString();
        setImportCandidates([
          {
            id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: parsed.title,
            description: parsed.description,
            sourceUrl: parsed.sourceUrl,
            servings: parsed.servings || 4,
            prepMinutes: parsed.prepMinutes,
            cookMinutes: parsed.cookMinutes,
            totalMinutes: parsed.totalMinutes,
            ingredientGroups: parsed.ingredientGroups.map((g) => ({
              heading: g.heading,
              items: g.items.map((raw, idx) => ({ id: `ing-${idx + 1}`, raw, scalable: true }))
            })),
            directionGroups: parsed.directionGroups.map((g) => ({
              heading: g.heading,
              steps: g.steps.map((stepText, idx) => ({ id: `step-${idx + 1}`, text: stepText }))
            })),
            notes: parsed.notes,
            cookLog: [],
            courses: ["Dinner"],
            categories: [],
            collectionIds: [],
            tags: [],
            rating: 0,
            favorite: false,
            photoIds: [],
            createdAt: nowIso,
            updatedAt: nowIso,
            schemaVersion: 1
          }
        ]);
      } else {
        showToast("Unsupported file format. Choose .paprikarecipes, .zip, .recipe.json, .json, .txt, or .md.");
      }
    } catch (err: unknown) {
      showToast("Failed to read file: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  useEffect(() => {
    const consumeShareHash = (): void => {
      const hash = window.location.hash || "";
      if (hash.startsWith("#import-url=")) {
        const encoded = hash.slice("#import-url=".length);
        const decoded = decodeURIComponent(encoded);
        if (decoded) {
          setEditingRecipe(undefined);
          setSharedImportUrl(decoded);
          setActiveTab("editor");
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    };
    consumeShareHash();
    window.addEventListener("hashchange", consumeShareHash);
    return (): void => window.removeEventListener("hashchange", consumeShareHash);
  }, []);

  useEffect(() => {
    refreshAllData();

    const handleProcessImportFile = async (file: File): Promise<void> => {
      await processImportFile(file);
    };

    const handleDragOver = (e: DragEvent): void => {
      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      const isFileDrop = types.includes("Files") && !types.includes("application/x-openrecipebook-meal");
      if (!isFileDrop) return;
      e.preventDefault();
      setIsDraggingOver(true);
    };

    const handleDragLeave = (e: DragEvent): void => {
      if (e.relatedTarget === null) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = async (e: DragEvent): Promise<void> => {
      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      const isFileDrop = types.includes("Files") && !types.includes("application/x-openrecipebook-meal");
      if (!isFileDrop) {
        setIsDraggingOver(false);
        return;
      }
      e.preventDefault();
      setIsDraggingOver(false);
      const droppedFiles = e.dataTransfer?.files;
      if (!droppedFiles || droppedFiles.length === 0) return;
      const file = droppedFiles[0];
      if (file) {
        await handleProcessImportFile(file);
      }
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return (): void => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [showToast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const activeElement = document.activeElement;
      const isInput =
        activeElement?.tagName === "INPUT" ||
        activeElement?.tagName === "TEXTAREA" ||
        activeElement?.tagName === "SELECT";

      if (!isInput && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setEditingRecipe(undefined);
        setActiveTab("editor");
      }
      if (!isInput && e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((prev: boolean): boolean => !prev);
      }
      if (e.key === "Escape") {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
        } else if (cookModeRecipe) {
          setCookModeRecipe(null);
        } else if (activeTab === "recipe-view" || activeTab === "editor") {
          setActiveTab("library");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return (): void => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, cookModeRecipe, showShortcutsModal]);

  const handleSelectRecipe = (id: string): void => {
    setSelectedRecipeId(id);
    setActiveTab("recipe-view");
  };

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0 });
    }
  }, [activeTab, selectedRecipeId]);

  const handleNewRecipe = (): void => {
    setEditingRecipe(undefined);
    setActiveTab("editor");
  };

  const handleEditRecipe = (recipe: Recipe): void => {
    setEditingRecipe(recipe);
    setActiveTab("editor");
  };

  // Local persistence without forcing navigation away
  const handlePersistRecipe = async (recipe: Recipe): Promise<void> => {
    const saved = await saveRecipe(recipe);
    await writeRecipeToStorage(saved);
    setRecipes((prev: Recipe[]): Recipe[] =>
      prev.map((r: Recipe): Recipe => (r.id === saved.id ? saved : r))
    );
  };

  // Editor save: saves and navigates to view
  const handleSaveRecipe = async (savedRecipe: Recipe): Promise<void> => {
    const saved = await saveRecipe(savedRecipe);
    await writeRecipeToStorage(saved);
    setRecipes((prev: Recipe[]): Recipe[] => {
      const exists = prev.some((r: Recipe): boolean => r.id === saved.id);
      if (exists) return prev.map((r: Recipe): Recipe => (r.id === saved.id ? saved : r));
      return [...prev, saved];
    });
    setSelectedRecipeId(saved.id);
    setActiveTab("recipe-view");
  };

  const handleDuplicateRecipe = async (newRecipe: Recipe): Promise<void> => {
    const saved = await saveRecipe(newRecipe);
    await writeRecipeToStorage(saved);
    setRecipes((prev: Recipe[]): Recipe[] => [...prev, saved]);
    setSelectedRecipeId(saved.id);
    setActiveTab("recipe-view");
  };

  const handleDeleteRecipe = async (id: string): Promise<void> => {
    const target = recipes.find((r: Recipe): boolean => r.id === id);
    if (target) {
      const trashedItem: Recipe = {
        ...target,
        deletedAt: new Date().toISOString()
      };
      await db.recipes.put(trashedItem);
      await deleteRecipeFromStorage(target.id, target.title);
      setRecipes((prev: Recipe[]): Recipe[] => prev.filter((r: Recipe): boolean => r.id !== id));
      setTrashedRecipes((prev: Recipe[]): Recipe[] => [...prev, trashedItem]);
      setActiveTab("library");
      showToast({
        message: `Moved "${target.title}" to trash`,
        undo: (): void => {
          void handleRestoreRecipe(id);
        }
      });
    }
  };

  const handleRestoreRecipe = async (id: string): Promise<void> => {
    const target = trashedRecipes.find((r: Recipe): boolean => r.id === id);
    if (target) {
      const restored: Recipe = {
        ...target,
        deletedAt: undefined,
        updatedAt: new Date().toISOString()
      };
      await db.recipes.put(restored);
      await writeRecipeToStorage(restored);
      setTrashedRecipes((prev: Recipe[]): Recipe[] =>
        prev.filter((r: Recipe): boolean => r.id !== id)
      );
      setRecipes((prev: Recipe[]): Recipe[] => [...prev, restored]);
      showToast(`Restored "${target.title}"`);
    }
  };

  const handlePermanentDeleteRecipe = async (id: string): Promise<void> => {
    const target =
      trashedRecipes.find((r: Recipe): boolean => r.id === id) ||
      recipes.find((r: Recipe): boolean => r.id === id);
    await db.recipes.delete(id);
    await deleteRecipeFromStorage(id, target?.title);
    setTrashedRecipes((prev: Recipe[]): Recipe[] =>
      prev.filter((r: Recipe): boolean => r.id !== id)
    );
    setRecipes((prev: Recipe[]): Recipe[] => prev.filter((r: Recipe): boolean => r.id !== id));
  };

  const handleEmptyTrash = (): void => {
    setEmptyTrashConfirmOpen(true);
  };

  const handleConfirmEmptyTrash = async (): Promise<void> => {
    for (const recipe of trashedRecipes) {
      await db.recipes.delete(recipe.id);
      await deleteRecipeFromStorage(recipe.id, recipe.title);
    }
    setTrashedRecipes([]);
    showToast("Trash emptied");
  };

  const handleToggleFavorite = async (id: string): Promise<void> => {
    const target = recipes.find((r: Recipe): boolean => r.id === id);
    if (target) {
      const updated: Recipe = {
        ...target,
        favorite: !target.favorite,
        updatedAt: new Date().toISOString()
      };
      await db.recipes.put(updated);
      await writeRecipeToStorage(updated);
      setRecipes((prev: Recipe[]): Recipe[] =>
        prev.map((r: Recipe): Recipe => (r.id === id ? updated : r))
      );
    }
  };

  const handleBatchDelete = async (recipeIds: string[]): Promise<void> => {
    const nowIso = new Date().toISOString();
    for (const id of recipeIds) {
      const target = recipes.find((r: Recipe): boolean => r.id === id);
      if (target) {
        await db.recipes.put({ ...target, deletedAt: nowIso, updatedAt: nowIso });
        await deleteRecipeFromStorage(target.id, target.title);
      }
    }
    await refreshAllData();
    showToast(`Moved ${recipeIds.length} recipes to trash`);
  };

  const handleBatchTag = async (recipeIds: string[], tag: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    for (const id of recipeIds) {
      const target = recipes.find((r: Recipe): boolean => r.id === id);
      if (target && !target.tags.includes(tag)) {
        const updated = { ...target, tags: [...target.tags, tag], updatedAt: nowIso };
        await db.recipes.put(updated);
        await writeRecipeToStorage(updated);
      }
    }
    await refreshAllData();
    showToast(`Tagged ${recipeIds.length} recipes`);
  };

  const handleBatchExport = (recipeIds: string[]): void => {
    const targetRecipes = recipes.filter((r: Recipe): boolean => recipeIds.includes(r.id));
    if (targetRecipes.length === 0) return;
    const backupBytes = exportRecipesBatchZip(targetRecipes);
    const blob = new Blob([new Uint8Array(backupBytes)], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `openrecipebook-batch-${targetRecipes.length}-recipes.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveCollection = async (collection: Collection): Promise<void> => {
    await db.collections.put(collection);
    setCollections((prev: Collection[]): Collection[] => {
      const idx = prev.findIndex((c: Collection): boolean => c.id === collection.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = collection;
        return copy;
      }
      return [...prev, collection];
    });
    await persistMetadataToStorage();
  };

  const handleDeleteCollection = async (collectionId: string): Promise<void> => {
    await db.collections.delete(collectionId);
    if (activeCollectionId === collectionId) {
      setActiveCollectionId(null);
    }
    setCollections((prev: Collection[]): Collection[] =>
      prev.filter((c: Collection): boolean => c.id !== collectionId)
    );
    const affected = recipes.filter(
      (r: Recipe): boolean => r.collectionIds?.includes(collectionId) ?? false
    );
    for (const r of affected) {
      const updated: Recipe = {
        ...r,
        collectionIds: r.collectionIds?.filter((id: string): boolean => id !== collectionId) || [],
        updatedAt: new Date().toISOString()
      };
      await db.recipes.put(updated);
      await writeRecipeToStorage(updated);
    }
    await persistMetadataToStorage();
    await refreshAllData();
  };

  const handleBatchAssignCollection = async (
    recipeIds: string[],
    collectionId: string
  ): Promise<void> => {
    for (const id of recipeIds) {
      const r = recipes.find((rec: Recipe): boolean => rec.id === id);
      if (r) {
        const existing = r.collectionIds || [];
        if (!existing.includes(collectionId)) {
          const updated: Recipe = {
            ...r,
            collectionIds: [...existing, collectionId],
            updatedAt: new Date().toISOString()
          };
          await db.recipes.put(updated);
          await writeRecipeToStorage(updated);
        }
      }
    }
    await persistMetadataToStorage();
    await refreshAllData();
    showToast(`Updated folder assignment for ${recipeIds.length} recipes`);
  };

  const handleSetCollectionRecipes = async (
    collectionId: string,
    selectedRecipeIds: string[]
  ): Promise<void> => {
    const selectedSet = new Set(selectedRecipeIds);
    for (const r of recipes) {
      const currentIds = r.collectionIds || [];
      const currentlyIn = currentIds.includes(collectionId);
      const shouldBeIn = selectedSet.has(r.id);
      if (currentlyIn !== shouldBeIn) {
        const nextIds = shouldBeIn
          ? [...currentIds, collectionId]
          : currentIds.filter((id: string): boolean => id !== collectionId);
        const updated: Recipe = {
          ...r,
          collectionIds: nextIds,
          updatedAt: new Date().toISOString()
        };
        await db.recipes.put(updated);
        await writeRecipeToStorage(updated);
      }
    }
    await persistMetadataToStorage();
    await refreshAllData();
    showToast(`Folder recipes updated (${selectedRecipeIds.length} selected)`);
  };

  const handleStorageFilesImported = async (result: AddStorageFilesResult): Promise<void> => {
    if (result.importedPhotos && result.importedPhotos.length > 0) {
      await saveImportedPhotosToDb(result.importedPhotos);
    }
    for (const rec of result.importedRecipes) {
      await saveRecipe(rec);
      await writeRecipeToStorage(rec);
    }
    if (result.reviewCandidates.length > 0) {
      setImportCandidates(result.reviewCandidates);
    }
    await refreshAllData();
    if (result.importedRecipes.length > 0 && result.reviewCandidates.length === 0) {
      showToast(`Added ${result.importedRecipes.length} recipe(s) from storage`);
    }
  };

  const handleAddRecipeToShoppingList = async (recipe: Recipe): Promise<void> => {
    const primaryList = shoppingLists[0] || createDefaultShoppingList("Groceries");
    const newItems = [];
    for (const group of recipe.ingredientGroups) {
      for (const item of group.items) {
        newItems.push(buildShoppingItemFromIngredient(item.raw, recipe.title, 1));
      }
    }
    const merged = mergeShoppingItems(primaryList.items, newItems);
    const updated = { ...primaryList, items: merged };
    await db.shoppingLists.put(updated);
    await persistMetadataToStorage();
    setShoppingLists((prev: ShoppingList[]): ShoppingList[] =>
      prev.map((l: ShoppingList): ShoppingList => (l.id === updated.id ? updated : l))
    );
    showToast(`Added ${newItems.length} ingredients to ${primaryList.name}`);
  };

  const handleAddWeekMealsToShoppingList = async (weekEntries: MealPlanEntry[]): Promise<void> => {
    const primaryList = shoppingLists[0] || createDefaultShoppingList("Groceries");
    const newItems = [];

    for (const entry of weekEntries) {
      if (entry.recipeId) {
        const rec = recipes.find((r: Recipe): boolean => r.id === entry.recipeId);
        if (rec) {
          for (const group of rec.ingredientGroups) {
            for (const item of group.items) {
              newItems.push(buildShoppingItemFromIngredient(item.raw, rec.title, 1));
            }
          }
        }
      } else if (entry.freeText) {
        newItems.push(buildShoppingItemFromIngredient(entry.freeText));
      }
    }

    if (newItems.length === 0) {
      showToast("No meals in this week's plan to add");
      return;
    }

    const merged = mergeShoppingItems(primaryList.items, newItems);
    const updated = { ...primaryList, items: merged };
    await db.shoppingLists.put(updated);
    await persistMetadataToStorage();
    setShoppingLists((prev: ShoppingList[]): ShoppingList[] =>
      prev.map((l: ShoppingList): ShoppingList => (l.id === updated.id ? updated : l))
    );
    showToast(`Added ${newItems.length} items from this week to ${primaryList.name}`);
    setActiveTab("shopping");
  };

  const handleAddTotalsToShoppingList = async (
    totals: { text: string; aisle: string; quantity?: number; unit?: string }[]
  ): Promise<void> => {
    const primaryList = shoppingLists[0] || createDefaultShoppingList("Groceries");
    const newItems: ShoppingItem[] = totals.map((t) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      text: t.text,
      aisle: t.aisle || "Other",
      checked: false,
      quantity: t.quantity ? { kind: "single", value: t.quantity } : undefined,
      unit: t.unit
    }));
    const merged = mergeShoppingItems(primaryList.items, newItems);
    const updated = { ...primaryList, items: merged };
    await db.shoppingLists.put(updated);
    await persistMetadataToStorage();
    setShoppingLists((prev: ShoppingList[]): ShoppingList[] =>
      prev.map((l: ShoppingList): ShoppingList => (l.id === updated.id ? updated : l))
    );
    showToast(`Added ${totals.length} combined ingredients to ${primaryList.name}`);
    setActiveTab("shopping");
  };

  const handleConfirmImport = async (
    selected: Recipe[],
    duplicateAction: "skip" | "replace" | "keepBoth"
  ): Promise<void> => {
    const existingTitles = new Set(
      recipes.map((r: Recipe): string => r.title.toLowerCase().trim())
    );

    for (const candidate of selected) {
      const exists = existingTitles.has(candidate.title.toLowerCase().trim());
      if (exists) {
        if (duplicateAction === "skip") continue;
        if (duplicateAction === "keepBoth") {
          const cloned: Recipe = {
            ...candidate,
            id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: `${candidate.title} (Copy)`
          };
          const savedClone = await saveRecipe(cloned);
          await writeRecipeToStorage(savedClone);
          continue;
        }
      }
      const savedCandidate = await saveRecipe(candidate);
      await writeRecipeToStorage(savedCandidate);
    }

    setImportCandidates(null);
    await refreshAllData();
    showToast(`Successfully imported ${selected.length} recipes`);
    setActiveTab("library");
  };

  const activeRecipe = recipes.find((r: Recipe): boolean => r.id === selectedRecipeId);

  return (
    <div className={styles.shellContainer}>
      {/* Desktop Left Sidebar (>= 1024px) */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <img
            src="./icon.png"
            width={28}
            height={28}
            alt="OpenRecipeBook"
            style={{ borderRadius: "6px", objectFit: "contain" }}
          />
          <span>{BRAND.appName}</span>
        </div>

        <Button
          variant="primary"
          icon={<PlusIcon width={16} height={16} />}
          className={styles.newRecipeButton}
          onClick={handleNewRecipe}
        >
          New Recipe
        </Button>

        <nav className={styles.navItems} aria-label="Main Navigation">
          <button
            type="button"
            className={`${styles.navButton} ${activeTab === "library" ? styles.navButtonActive : ""}`.trim()}
            onClick={(): void => setActiveTab("library")}
          >
            <BookOpenIcon width={18} height={18} />
            <span>Recipes</span>
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${activeTab === "planner" ? styles.navButtonActive : ""}`.trim()}
            onClick={(): void => setActiveTab("planner")}
          >
            <CalendarIcon width={18} height={18} />
            <span>Meal Plan</span>
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${activeTab === "totals" ? styles.navButtonActive : ""}`.trim()}
            onClick={(): void => setActiveTab("totals")}
          >
            <CalculatorIcon width={18} height={18} />
            <span>Ingredient Totals</span>
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${activeTab === "shopping" ? styles.navButtonActive : ""}`.trim()}
            onClick={(): void => setActiveTab("shopping")}
          >
            <ShoppingCartIcon width={18} height={18} />
            <span>Shopping</span>
          </button>

          <button
            type="button"
            className={`${styles.navButton} ${activeTab === "settings" ? styles.navButtonActive : ""}`.trim()}
            onClick={(): void => setActiveTab("settings")}
          >
            <SettingsIcon width={18} height={18} />
            <span>Settings</span>
          </button>

          {import.meta.env.DEV && (
            <button
              type="button"
              className={`${styles.navButton} ${activeTab === "gallery" ? styles.navButtonActive : ""}`.trim()}
              onClick={(): void => setActiveTab("gallery")}
            >
              <span>Gallery (Dev)</span>
            </button>
          )}
        </nav>
      </aside>

      {/* Tablet Icon Rail (768px - 1023px) */}
      <aside className={styles.iconRail}>
        <div className={styles.railBrand}>
          <img
            src="./icon.png"
            width={28}
            height={28}
            alt="OpenRecipeBook"
            style={{ borderRadius: "6px", objectFit: "contain" }}
          />
        </div>

        <Button
          variant="primary"
          icon={<PlusIcon width={18} height={18} />}
          onClick={handleNewRecipe}
          aria-label="New Recipe"
          style={{ width: 44, height: 44, padding: 0, borderRadius: "50%" }}
        />

        <button
          type="button"
          aria-label="Recipes"
          className={`${styles.railButton} ${activeTab === "library" ? styles.railButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("library")}
        >
          <BookOpenIcon width={20} height={20} />
          <span>Recipes</span>
        </button>

        <button
          type="button"
          aria-label="Meal Plan"
          className={`${styles.railButton} ${activeTab === "planner" ? styles.railButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("planner")}
        >
          <CalendarIcon width={20} height={20} />
          <span>Planner</span>
        </button>

        <button
          type="button"
          aria-label="Ingredient Totals"
          className={`${styles.railButton} ${activeTab === "totals" ? styles.railButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("totals")}
        >
          <CalculatorIcon width={20} height={20} />
          <span>Totals</span>
        </button>

        <button
          type="button"
          aria-label="Shopping"
          className={`${styles.railButton} ${activeTab === "shopping" ? styles.railButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("shopping")}
        >
          <ShoppingCartIcon width={20} height={20} />
          <span>Shopping</span>
        </button>

        <button
          type="button"
          aria-label="Settings"
          className={`${styles.railButton} ${activeTab === "settings" ? styles.railButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("settings")}
        >
          <SettingsIcon width={20} height={20} />
          <span>Settings</span>
        </button>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {activeTab === "library" && (
          <RecipeLibrary
            recipes={recipes}
            collections={collections}
            activeCollectionId={activeCollectionId}
            onSelectCollection={setActiveCollectionId}
            onSaveCollection={handleSaveCollection}
            onDeleteCollection={handleDeleteCollection}
            onBatchAssignCollection={handleBatchAssignCollection}
            onSaveFolderRecipes={handleSetCollectionRecipes}
            onUpdateRecipe={handlePersistRecipe}
            onSelectRecipe={handleSelectRecipe}
            onNewRecipe={handleNewRecipe}
            onImportFile={(): void => setActiveTab("settings")}
            onLoadSamples={async (): Promise<void> => {
              for (const col of DEFAULT_COLLECTIONS) {
                await db.collections.put(col);
              }
              for (const sample of SAMPLE_RECIPES) {
                const saved = await saveRecipe(sample);
                await writeRecipeToStorage(saved);
              }
              await refreshAllData();
            }}
            onToggleFavorite={handleToggleFavorite}
            onOpenCookbookBuilder={(colId?: string): void => {
              setCookbookInitialCollectionId(colId);
              setShowCookbookModal(true);
            }}
            onBatchDelete={handleBatchDelete}
            onBatchTag={handleBatchTag}
            onBatchExport={handleBatchExport}
            onBatchTotals={(): void => setActiveTab("totals")}
          />
        )}

        {activeTab === "recipe-view" && activeRecipe && (
          <RecipeView
            recipe={activeRecipe}
            collections={collections}
            userIngredients={userIngredients}
            onBack={(): void => setActiveTab("library")}
            onEdit={(): void => handleEditRecipe(activeRecipe)}
            onDelete={(): void => {
              void handleDeleteRecipe(activeRecipe.id);
            }}
            onExport={(): void => {
              const jsonText = exportRecipeToJson(activeRecipe);
              const blob = new Blob([jsonText], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${activeRecipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.recipe.json`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            onToggleFavorite={(): void => {
              void handleToggleFavorite(activeRecipe.id);
            }}
            onOpenCookMode={(multiplier = 1): void => {
              setCookModeRecipe(activeRecipe);
              setCookModeMultiplier(multiplier);
            }}
            onAddToShoppingList={(): void => {
              void handleAddRecipeToShoppingList(activeRecipe);
            }}
            onPrintRecipe={(recipeId: string): void => {
              setCookbookInitialRecipeId(recipeId);
              setShowCookbookModal(true);
            }}
            onUpdateRecipe={handlePersistRecipe}
            onDuplicateRecipe={handleDuplicateRecipe}
            onSaveCollection={handleSaveCollection}
          />
        )}

        {activeTab === "editor" && (
          <RecipeEditor
            initialRecipe={editingRecipe}
            initialImportUrl={sharedImportUrl}
            collections={collections}
            userIngredients={userIngredients}
            onSave={async (savedRecipe: Recipe): Promise<void> => {
              setSharedImportUrl(undefined);
              await handleSaveRecipe(savedRecipe);
            }}
            onCancel={(): void => {
              setSharedImportUrl(undefined);
              setActiveTab(editingRecipe ? "recipe-view" : "library");
            }}
          />
        )}

        {activeTab === "totals" && (
          <IngredientTotalsView
            recipes={recipes}
            collections={collections}
            combos={combos}
            onAddTotalsToShoppingList={handleAddTotalsToShoppingList}
            onSaveCombo={async (combo: Combo): Promise<void> => {
              await db.combos.put(combo);
              await persistMetadataToStorage();
              await refreshAllData();
            }}
            onDeleteCombo={async (id: string): Promise<void> => {
              await db.combos.delete(id);
              await persistMetadataToStorage();
              await refreshAllData();
            }}
          />
        )}

        {activeTab === "planner" && (
          <MealPlannerView
            entries={mealPlanEntries}
            recipes={recipes}
            savedMenus={savedMenus}
            onSaveEntry={async (entry: MealPlanEntry): Promise<void> => {
              await db.mealPlan.put(entry);
              await persistMetadataToStorage();
              await refreshAllData();
            }}
            onSaveMultipleEntries={async (newEntries: MealPlanEntry[]): Promise<void> => {
              for (const entry of newEntries) {
                await db.mealPlan.put(entry);
              }
              await persistMetadataToStorage();
              await refreshAllData();
            }}
            onDeleteEntry={async (id: string): Promise<void> => {
              const target = mealPlanEntries.find((e: MealPlanEntry): boolean => e.id === id);
              await db.mealPlan.delete(id);
              await persistMetadataToStorage();
              await refreshAllData();
              if (target) {
                showToast({
                  message: "Meal removed from plan",
                  undo: (): void => {
                    void (async (): Promise<void> => {
                      await db.mealPlan.put(target);
                      await refreshAllData();
                    })();
                  }
                });
              }
            }}
            onAddMealsToShoppingList={handleAddWeekMealsToShoppingList}
            onSaveMenu={async (menu: SavedMenu): Promise<void> => {
              const updated = [...savedMenus.filter((m: SavedMenu): boolean => m.id !== menu.id), menu];
              await db.settings.put({ key: "savedMenus", value: updated });
              setSavedMenus(updated);
            }}
            onDeleteMenu={async (id: string): Promise<void> => {
              const updated = savedMenus.filter((m: SavedMenu): boolean => m.id !== id);
              await db.settings.put({ key: "savedMenus", value: updated });
              setSavedMenus(updated);
            }}
          />
        )}

        {activeTab === "shopping" && (
          <ShoppingListView
            lists={shoppingLists}
            onSaveList={async (updatedList: ShoppingList): Promise<void> => {
              await db.shoppingLists.put(updatedList);
              await persistMetadataToStorage();
              await refreshAllData();
            }}
            onCreateList={async (name: string): Promise<void> => {
              const newList = createDefaultShoppingList(name);
              await db.shoppingLists.add(newList);
              await persistMetadataToStorage();
              await refreshAllData();
            }}
            onDeleteList={async (listId: string): Promise<void> => {
              await db.shoppingLists.delete(listId);
              await persistMetadataToStorage();
              await refreshAllData();
            }}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            onExportFullBackup={(): void => {
              const payload: BackupArchiveData = {
                manifest: {
                  format: "openrecipebook-library",
                  version: 1,
                  exportedAt: new Date().toISOString(),
                  appVersion: "0.1.3",
                  counts: {
                    recipes: recipes.length,
                    photos: 0
                  }
                },
                recipes,
                photos: [],
                collections,
                mealPlan: mealPlanEntries,
                shoppingLists,
                combos,
                userIngredients
              };
              const data = exportBackupZip(payload);
              const blob = new Blob([new Uint8Array(data)], { type: "application/zip" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `openrecipebook-backup-${new Date().toISOString().split("T")[0]}.openrecipebook.zip`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            onRestoreFullBackup={async (file: File): Promise<void> => {
              try {
                const buffer = await file.arrayBuffer();
                const backupData = importBackupZip(new Uint8Array(buffer));
                await saveImportedPhotosToDb(backupData.photos || []);
                for (const r of backupData.recipes) {
                  const saved = await saveRecipe(r);
                  await writeRecipeToStorage(saved);
                }
                for (const c of backupData.collections) await db.collections.put(c);
                for (const m of backupData.mealPlan || []) await db.mealPlan.put(m);
                for (const s of backupData.shoppingLists || []) await db.shoppingLists.put(s);
                for (const combo of backupData.combos || []) await db.combos.put(combo);
                for (const ing of backupData.userIngredients || []) await db.userIngredients.put(ing);
                await persistMetadataToStorage();
                await refreshAllData();
                showToast("Backup restored successfully");
              } catch {
                await processImportFile(file);
              }
            }}
            onImportRecipes={async (file: File): Promise<void> => {
              await processImportFile(file);
            }}
            onOpenUserIngredients={(): void => setShowUserIngredientsModal(true)}
            onOpenStorageModal={(): void => setShowStorageModal(true)}
            recipes={recipes}
            recipeCount={recipes.length}
            trashedRecipes={trashedRecipes}
            onRestoreRecipe={handleRestoreRecipe}
            onPermanentDeleteRecipe={handlePermanentDeleteRecipe}
            onEmptyTrash={handleEmptyTrash}
            onRunAutoFolderBackup={async (): Promise<AutoBackupResult> => {
              const destination = new FileSystemFolderBackupDestination();
              const payload: BackupArchiveData = {
                manifest: {
                  format: "openrecipebook-library",
                  version: 1,
                  exportedAt: new Date().toISOString(),
                  appVersion: "0.1.3",
                  counts: {
                    recipes: recipes.length,
                    photos: 0
                  }
                },
                recipes,
                photos: [],
                collections,
                mealPlan: mealPlanEntries,
                shoppingLists,
                combos,
                userIngredients
              };
              const zipBytes = exportBackupZip(payload);
              return destination.saveBackupWithRotation(zipBytes);
            }}
          />
        )}

        {activeTab === "gallery" && <ComponentGallery />}
      </main>

      {/* Mobile Bottom Navigation Bar (< 768px) */}
      <nav className={styles.bottomTabBar} aria-label="Mobile Navigation">
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "library" ? styles.tabButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("library")}
        >
          <BookOpenIcon width={20} height={20} />
          <span>Recipes</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "planner" ? styles.tabButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("planner")}
        >
          <CalendarIcon width={20} height={20} />
          <span>Planner</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "totals" ? styles.tabButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("totals")}
        >
          <CalculatorIcon width={20} height={20} />
          <span>Totals</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "shopping" ? styles.tabButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("shopping")}
        >
          <ShoppingCartIcon width={20} height={20} />
          <span>Shopping</span>
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "settings" ? styles.tabButtonActive : ""}`.trim()}
          onClick={(): void => setActiveTab("settings")}
        >
          <SettingsIcon width={20} height={20} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Full-Screen Cook Mode */}
      {cookModeRecipe && (
        <CookModeView
          recipe={cookModeRecipe}
          multiplier={cookModeMultiplier}
          onClose={(): void => setCookModeRecipe(null)}
        />
      )}

      {/* Modals */}
      {importCandidates && (
        <ImportReviewModal
          candidates={importCandidates}
          existingRecipes={recipes}
          onConfirmImport={handleConfirmImport}
          onCancel={(): void => setImportCandidates(null)}
        />
      )}

      {showUserIngredientsModal && (
        <UserIngredientsModal
          userIngredients={userIngredients}
          onSaveIngredient={async (item: DictionaryIngredient): Promise<void> => {
            await db.userIngredients.put(item);
            await persistMetadataToStorage();
            await refreshAllData();
          }}
          onDeleteIngredient={async (id: string): Promise<void> => {
            await db.userIngredients.delete(id);
            await persistMetadataToStorage();
            await refreshAllData();
          }}
          onImportUserIngredients={async (items: DictionaryIngredient[]): Promise<void> => {
            for (const item of items) await db.userIngredients.put(item);
            await persistMetadataToStorage();
            await refreshAllData();
          }}
          onClose={(): void => setShowUserIngredientsModal(false)}
        />
      )}

      {showCookbookModal && (
        <CookbookBuilderModal
          recipes={recipes}
          collections={collections}
          initialCollectionId={cookbookInitialCollectionId}
          initialRecipeId={cookbookInitialRecipeId}
          onClose={(): void => {
            setShowCookbookModal(false);
            setCookbookInitialCollectionId(undefined);
            setCookbookInitialRecipeId(undefined);
          }}
        />
      )}

      {showStorageModal && (
        <StorageLocationModal
          recipes={recipes}
          onClose={(): void => setShowStorageModal(false)}
          onSyncFromStorage={refreshAllData}
          onFilesImported={handleStorageFilesImported}
          onOpenRecipe={(id: string): void => {
            setSelectedRecipeId(id);
            setActiveTab("recipe-view");
          }}
          onDeleteRecipeById={handlePermanentDeleteRecipe}
        />
      )}

      <ConfirmDialog
        isOpen={emptyTrashConfirmOpen}
        title="Empty Trash"
        message="Permanently delete all items in trash? This action cannot be undone."
        confirmLabel="Empty Trash"
        isDanger
        onConfirm={handleConfirmEmptyTrash}
        onCancel={(): void => setEmptyTrashConfirmOpen(false)}
      />

      <Dialog
        isOpen={showShortcutsModal}
        onClose={(): void => setShowShortcutsModal(false)}
        title="Keyboard Shortcuts"
        maxWidth={440}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: "0.9375rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Focus search</span>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>/</kbd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>New recipe</span>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>N</kbd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Edit recipe (in view)</span>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>E</kbd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Cycle scaling (in view)</span>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>S</kbd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Cook mode (in view)</span>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>C</kbd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Close view or modal</span>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>Esc</kbd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Toggle shortcuts help</span>
            <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)" }}>?</kbd>
          </div>
        </div>
      </Dialog>

      {/* Drag & Drop File Import Overlay */}
      {isDraggingOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "var(--z-modal)",
            pointerEvents: "none"
          }}
        >
          <div
            style={{
              padding: "var(--space-8)",
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              border: "2px dashed var(--accent)",
              textAlign: "center"
            }}
          >
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.5rem", color: "var(--accent)", marginBottom: 6 }}>
              Drop Recipe File Here
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9375rem" }}>
              Drop .recipe.json, .openrecipebook.zip, Recipe Keeper .zip, or .paprikarecipes
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export const App: FC = (): ReactElement => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};
