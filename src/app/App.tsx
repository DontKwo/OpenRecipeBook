import { useState, useEffect, type FC, type ReactElement } from "react";
import { db } from "../data/db";
import type { Recipe, ShoppingList, MealPlanEntry, Combo, DictionaryIngredient, Collection, SavedMenu } from "../domain/recipe/types";
import { BRAND } from "../config/brand";
import { SAMPLE_RECIPES } from "../data/sampleRecipes";
import {
  exportRecipeToJson,
  exportBackupZip,
  exportRecipesBatchZip,
  importBackupZip,
  importRecipeFromJson
} from "../domain/export/ownFormat";
import { parseRecipeKeeperZip } from "../domain/import/recipeKeeper";
import { parsePaprikaRecipesZip } from "../domain/import/paprika";
import { parseSchemaRecipeJsonLd } from "../domain/import/jsonld";
import { importRecipesFromUrl } from "../domain/import/nativeFetch";
import { createDefaultShoppingList, buildShoppingItemFromIngredient, mergeShoppingItems } from "../domain/shopping/shoppingService";
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
import {
  FileSystemFolderBackupDestination,
  shouldAutoBackup,
  type AutoBackupResult
} from "../domain/backup/backupFolder";
import {
  BookOpenIcon,
  CalculatorIcon,
  SettingsIcon,
  CalendarIcon,
  ShoppingCartIcon,
  XIcon
} from "../ui/icons";

type ActiveTab = "library" | "recipe-view" | "editor" | "totals" | "planner" | "shopping" | "settings" | "gallery";

export const App: FC = (): ReactElement => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
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
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("library");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>(undefined);
  const [cookModeRecipe, setCookModeRecipe] = useState<Recipe | null>(null);
  const [importCandidates, setImportCandidates] = useState<Recipe[] | null>(null);

  // Load all data from Dexie
  const refreshAllData = async () => {
    try {
      const allStored = await db.recipes.toArray();
      const active: Recipe[] = [];
      const trashed: Recipe[] = [];
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      for (const recipe of allStored) {
        if (recipe.deletedAt) {
          const deletedTime = new Date(recipe.deletedAt).getTime();
          if (now - deletedTime > thirtyDaysMs) {
            // Auto-purge past 30 days
            await db.recipes.delete(recipe.id);
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

      const storedMealPlan = await db.mealPlan.toArray();
      setMealPlanEntries(storedMealPlan);

      const storedCombos = await db.combos.toArray();
      setCombos(storedCombos);

      const storedUserIngs = await db.userIngredients.toArray();
      setUserIngredients(storedUserIngs);

      let storedCollections = await db.collections.toArray();
      if (storedCollections.length === 0) {
        const defaultCollections: Collection[] = [
          { id: "col-quick-easy", name: "Quick & Easy", description: "30-minute meals and simple preps", createdAt: new Date().toISOString() },
          { id: "col-comfort", name: "Comfort Food", description: "Hearty favorites, soups, and bakes", createdAt: new Date().toISOString() },
          { id: "col-holiday", name: "Holiday & Entertaining", description: "Festive dishes for gatherings", createdAt: new Date().toISOString() }
        ];
        await db.collections.bulkAdd(defaultCollections);
        storedCollections = defaultCollections;
      }
      setCollections(storedCollections);

      const storedMenusSetting = await db.settings.get("savedMenus");
      if (storedMenusSetting && Array.isArray(storedMenusSetting.value)) {
        setSavedMenus(storedMenusSetting.value as SavedMenu[]);
      }
    } catch {
      // IndexedDB fallback
    }
  };

  const handleProcessImportFile = async (file: File): Promise<void> => {
    const filename = file.name.toLowerCase();
    try {
      if (filename.endsWith(".recipe.json") || (filename.endsWith(".json") && !filename.includes("manifest"))) {
        const text = await file.text();
        const parsed = importRecipeFromJson(text);
        await db.recipes.put(parsed.recipe);
        await refreshAllData();
        setSelectedRecipeId(parsed.recipe.id);
        setActiveTab("recipe-view");
      } else if (filename.endsWith(".openrecipebook.zip") || filename.endsWith(".zip")) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        try {
          const restored = importBackupZip(bytes);
          if (restored.recipes.length > 0) {
            setImportCandidates(restored.recipes);
            return;
          }
        } catch {
          // Not native backup zip format, fall through to Recipe Keeper
        }
        const rkResult = await parseRecipeKeeperZip(bytes);
        if (rkResult.recipes.length > 0) {
          setImportCandidates(rkResult.recipes);
        }
      } else if (filename.endsWith(".paprikarecipes")) {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const paprikaRecipes = parsePaprikaRecipesZip(bytes);
        if (paprikaRecipes.length > 0) {
          setImportCandidates(paprikaRecipes);
        }
      }
    } catch {
      // Drop import error handled gracefully
    }
  };

  useEffect(() => {
    refreshAllData();

    const storedAccent = localStorage.getItem("accentTheme");
    if (storedAccent) {
      document.documentElement.setAttribute("data-accent", storedAccent);
    }

    // Trigger scheduled backup to synced folder if due
    const destination = new FileSystemFolderBackupDestination();
    if (destination.isAvailable()) {
      const lastBackup = localStorage.getItem("orb_last_auto_backup") || undefined;
      if (shouldAutoBackup(lastBackup)) {
        destination.getFolderName().then((name: string | null): void => {
          if (name) {
            handleRunAutoFolderBackup().catch((): void => {});
          }
        });
      }
    }

    // Check for bookmarklet hash import: #import=<json> or #import-url=<url>
    if (window.location.hash.startsWith("#import=")) {
      try {
        const rawJson = decodeURIComponent(window.location.hash.substring(8));
        const parsed = JSON.parse(rawJson);
        const imported = parseSchemaRecipeJsonLd(parsed);
        if (imported.length > 0) {
          setImportCandidates(imported);
        }
        window.history.replaceState(null, "", window.location.pathname);
      } catch {
        // Ignore invalid hash
      }
    } else if (window.location.hash.startsWith("#import-url=")) {
      try {
        const rawUrl = decodeURIComponent(window.location.hash.substring(12));
        window.history.replaceState(null, "", window.location.pathname);
        importRecipesFromUrl(rawUrl)
          .then((result) => {
            if (result.ok && result.recipes.length > 0) {
              setImportCandidates(result.recipes);
            }
          })
          .catch(() => {});
      } catch {
        // Ignore invalid hash
      }
    }

    // Web Share Target: check ?url= query parameter
    if (typeof window !== "undefined" && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      const sharedUrl = searchParams.get("url");
      if (sharedUrl) {
        window.history.replaceState(null, "", window.location.pathname);
        importRecipesFromUrl(sharedUrl)
          .then((result) => {
            if (result.ok && result.recipes.length > 0) {
              setImportCandidates(result.recipes);
            }
          })
          .catch(() => {});
      }
    }

    // Chromium File Handling API: check launchQueue
    const win = window as unknown as {
      launchQueue?: {
        setConsumer: (consumer: (params: { files: FileSystemFileHandle[] }) => Promise<void>) => void;
      };
    };
    if (win.launchQueue) {
      win.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files || launchParams.files.length === 0) return;
        for (const fileHandle of launchParams.files) {
          const file = await fileHandle.getFile();
          await handleProcessImportFile(file);
        }
      });
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === "INPUT" || activeElement?.tagName === "TEXTAREA" || activeElement?.tagName === "SELECT";
      if (!isInput && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setEditingRecipe(undefined);
        setActiveTab("editor");
      }
      if (!isInput && e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
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
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab, cookModeRecipe, showShortcutsModal]);

  // Global drag-and-drop handler for recipe files
  useEffect(() => {
    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault();
      if (e.dataTransfer?.types.includes("Files")) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent): void => {
      e.preventDefault();
      if (e.relatedTarget === null) {
        setIsDraggingOver(false);
      }
    };

    const handleDrop = async (e: DragEvent): Promise<void> => {
      e.preventDefault();
      setIsDraggingOver(false);
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      await handleProcessImportFile(files[0]);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);

  const handleSelectRecipe = (id: string) => {
    setSelectedRecipeId(id);
    setActiveTab("recipe-view");
  };

  const handleNewRecipe = () => {
    setEditingRecipe(undefined);
    setActiveTab("editor");
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setActiveTab("editor");
  };

  const handleSaveRecipe = async (savedRecipe: Recipe) => {
    await db.recipes.put(savedRecipe);
    await refreshAllData();
    setSelectedRecipeId(savedRecipe.id);
    setActiveTab("recipe-view");
  };

  const handleDuplicateRecipe = async (newRecipe: Recipe): Promise<void> => {
    await db.recipes.add(newRecipe);
    await refreshAllData();
    setSelectedRecipeId(newRecipe.id);
    setActiveTab("recipe-view");
  };

  const handleDeleteRecipe = async (id: string) => {
    const target = recipes.find((r) => r.id === id);
    if (target) {
      const trashedItem: Recipe = {
        ...target,
        deletedAt: new Date().toISOString()
      };
      await db.recipes.put(trashedItem);
      await refreshAllData();
      setActiveTab("library");
    }
  };

  const handleBatchDelete = async (recipeIds: string[]): Promise<void> => {
    const nowIso = new Date().toISOString();
    for (const id of recipeIds) {
      const target = recipes.find((r) => r.id === id);
      if (target) {
        await db.recipes.put({ ...target, deletedAt: nowIso, updatedAt: nowIso });
      }
    }
    await refreshAllData();
  };

  const handleBatchTag = async (recipeIds: string[], tag: string): Promise<void> => {
    const nowIso = new Date().toISOString();
    for (const id of recipeIds) {
      const target = recipes.find((r) => r.id === id);
      if (target && !target.tags.includes(tag)) {
        await db.recipes.put({ ...target, tags: [...target.tags, tag], updatedAt: nowIso });
      }
    }
    await refreshAllData();
  };

  const handleBatchExport = (recipeIds: string[]): void => {
    const targetRecipes = recipes.filter((r) => recipeIds.includes(r.id));
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

  const handleBatchTotals = (): void => {
    setActiveTab("totals");
  };

  const handleSaveCollection = async (collection: Collection): Promise<void> => {
    await db.collections.put(collection);
    await refreshAllData();
  };

  const handleDeleteCollection = async (collectionId: string): Promise<void> => {
    await db.collections.delete(collectionId);
    if (activeCollectionId === collectionId) {
      setActiveCollectionId(null);
    }
    const affected = recipes.filter((r: Recipe): boolean => r.collectionIds?.includes(collectionId) ?? false);
    for (const r of affected) {
      const updated: Recipe = {
        ...r,
        collectionIds: r.collectionIds?.filter((id: string): boolean => id !== collectionId) || [],
        updatedAt: new Date().toISOString()
      };
      await db.recipes.put(updated);
    }
    await refreshAllData();
  };

  const handleBatchAssignCollection = async (recipeIds: string[], collectionId: string): Promise<void> => {
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
        }
      }
    }
    await refreshAllData();
  };

  const handleRestoreRecipe = async (id: string) => {
    const target = trashedRecipes.find((r) => r.id === id);
    if (target) {
      const restored: Recipe = { ...target };
      delete restored.deletedAt;
      await db.recipes.put(restored);
      await refreshAllData();
    }
  };

  const handlePermanentDeleteRecipe = async (id: string) => {
    await db.recipes.delete(id);
    await refreshAllData();
  };

  const handleEmptyTrash = async () => {
    if (window.confirm("Permanently delete all items in trash?")) {
      for (const recipe of trashedRecipes) {
        await db.recipes.delete(recipe.id);
      }
      await refreshAllData();
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const target = recipes.find((r) => r.id === id);
    if (target) {
      const updated: Recipe = { ...target, favorite: !target.favorite, updatedAt: new Date().toISOString() };
      await db.recipes.put(updated);
      await refreshAllData();
    }
  };

  const handleLoadSamples = async () => {
    for (const sample of SAMPLE_RECIPES) {
      await db.recipes.put(sample);
    }
    await refreshAllData();
  };

  const handleSaveShoppingList = async (updatedList: ShoppingList) => {
    await db.shoppingLists.put(updatedList);
    await refreshAllData();
  };

  const handleCreateShoppingList = async (name: string) => {
    const newList = createDefaultShoppingList(name);
    await db.shoppingLists.add(newList);
    await refreshAllData();
  };

  const handleDeleteShoppingList = async (listId: string) => {
    await db.shoppingLists.delete(listId);
    await refreshAllData();
  };

  const handleAddRecipeToShoppingList = async (recipe: Recipe) => {
    const primaryList = shoppingLists[0] || createDefaultShoppingList("Groceries");
    const newItems = [];
    for (const group of recipe.ingredientGroups) {
      for (const item of group.items) {
        newItems.push(buildShoppingItemFromIngredient(item.raw, recipe.title, 1));
      }
    }
    const merged = mergeShoppingItems(primaryList.items, newItems);
    await db.shoppingLists.put({ ...primaryList, items: merged });
    await refreshAllData();
    alert(`Added ${newItems.length} ingredients from "${recipe.title}" to ${primaryList.name}!`);
  };

  const handleSaveMealPlanEntry = async (entry: MealPlanEntry) => {
    await db.mealPlan.put(entry);
    await refreshAllData();
  };

  const handleSaveMultipleMealPlanEntries = async (newEntries: MealPlanEntry[]): Promise<void> => {
    for (const entry of newEntries) {
      await db.mealPlan.put(entry);
    }
    await refreshAllData();
  };

  const handleDeleteMealPlanEntry = async (entryId: string) => {
    await db.mealPlan.delete(entryId);
    await refreshAllData();
  };

  const handleSaveMenu = async (menu: SavedMenu): Promise<void> => {
    const nextMenus = [...savedMenus.filter((m) => m.id !== menu.id), menu];
    setSavedMenus(nextMenus);
    await db.settings.put({ key: "savedMenus", value: nextMenus });
  };

  const handleDeleteMenu = async (menuId: string): Promise<void> => {
    const nextMenus = savedMenus.filter((m) => m.id !== menuId);
    setSavedMenus(nextMenus);
    await db.settings.put({ key: "savedMenus", value: nextMenus });
  };

  const handleSaveCombo = async (combo: Combo) => {
    await db.combos.put(combo);
    await refreshAllData();
  };

  const handleDeleteCombo = async (comboId: string) => {
    await db.combos.delete(comboId);
    await refreshAllData();
  };

  const handleSaveUserIngredient = async (item: DictionaryIngredient) => {
    await db.userIngredients.put(item);
    await refreshAllData();
  };

  const handleDeleteUserIngredient = async (id: string) => {
    await db.userIngredients.delete(id);
    await refreshAllData();
  };

  const handleImportUserIngredients = async (items: DictionaryIngredient[]) => {
    for (const item of items) {
      await db.userIngredients.put(item);
    }
    await refreshAllData();
  };

  const handleAddWeekMealsToShoppingList = async (entries: MealPlanEntry[]) => {
    const primaryList = shoppingLists[0] || createDefaultShoppingList("Groceries");
    const recipeMap = new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
    const newItems = [];

    for (const entry of entries) {
      if (entry.recipeId) {
        const recipe = recipeMap.get(entry.recipeId);
        if (recipe) {
          for (const group of recipe.ingredientGroups) {
            for (const item of group.items) {
              newItems.push(buildShoppingItemFromIngredient(item.raw, recipe.title, entry.multiplier));
            }
          }
        }
      } else if (entry.freeText) {
        newItems.push(buildShoppingItemFromIngredient(entry.freeText));
      }
    }

    if (newItems.length === 0) {
      alert("No meals in this week's plan to add!");
      return;
    }

    const merged = mergeShoppingItems(primaryList.items, newItems);
    await db.shoppingLists.put({ ...primaryList, items: merged });
    await refreshAllData();
    alert(`Added ${newItems.length} items from this week's meals to ${primaryList.name}!`);
    setActiveTab("shopping");
  };

  const handleExportSingleRecipe = (recipe: Recipe) => {
    const jsonText = exportRecipeToJson(recipe);
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.recipe.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateFullBackupBytes = async (): Promise<Uint8Array> => {
    const allRecipes = await db.recipes.toArray();
    const allPhotos = await db.photos.toArray();
    const photosData = allPhotos.map((p) => ({
      id: p.id,
      blob: new Uint8Array()
    }));

    return exportBackupZip({
      manifest: {
        format: "openrecipebook-library",
        version: 1,
        exportedAt: new Date().toISOString(),
        appVersion: "0.1.0",
        counts: {
          recipes: allRecipes.length,
          photos: photosData.length
        }
      },
      recipes: allRecipes,
      photos: photosData,
      collections: await db.collections.toArray(),
      mealPlan: await db.mealPlan.toArray(),
      shoppingLists: await db.shoppingLists.toArray(),
      combos: await db.combos.toArray(),
      userIngredients: await db.userIngredients.toArray()
    });
  };

  const handleExportFullBackup = async () => {
    const backupBytes = await generateFullBackupBytes();
    const blob = new Blob([new Uint8Array(backupBytes)], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStamp = new Date().toISOString().split("T")[0];
    link.download = `openrecipebook-backup-${dateStamp}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRunAutoFolderBackup = async (): Promise<AutoBackupResult> => {
    const destination = new FileSystemFolderBackupDestination();
    const bytes = await generateFullBackupBytes();
    const result = await destination.saveBackupWithRotation(bytes, 10);
    if (result.success) {
      localStorage.setItem("orb_last_auto_backup", new Date().toISOString());
    }
    return result;
  };

  const handleRestoreBackupFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      if (file.name.endsWith(".json")) {
        const text = new TextDecoder().decode(buffer);
        try {
          const single = importRecipeFromJson(text);
          setImportCandidates([single.recipe]);
        } catch {
          const jsonLdRecipes = parseSchemaRecipeJsonLd(JSON.parse(text));
          if (jsonLdRecipes.length > 0) {
            setImportCandidates(jsonLdRecipes);
          } else {
            throw new Error("No recipes found in JSON file");
          }
        }
      } else if (file.name.endsWith(".paprikarecipes") || file.name.endsWith(".paprikarecipe")) {
        const paprikaRecipes = parsePaprikaRecipesZip(new Uint8Array(buffer));
        if (paprikaRecipes.length > 0) {
          setImportCandidates(paprikaRecipes);
          return;
        } else {
          throw new Error("No recipes found in Paprika archive");
        }
      } else if (file.name.endsWith(".zip")) {
        try {
          // Try Recipe Keeper export first
          const rkResult = parseRecipeKeeperZip(new Uint8Array(buffer));
          if (rkResult.recipes.length > 0) {
            setImportCandidates(rkResult.recipes);
            return;
          }
        } catch {
          // Fall back to native OpenRecipeBook zip
          const backupData = importBackupZip(new Uint8Array(buffer));
          setImportCandidates(backupData.recipes);
        }
      }
    } catch (err: unknown) {
      alert("Failed to read file: " + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleConfirmImport = async (selected: Recipe[], duplicateAction: "skip" | "replace" | "keepBoth") => {
    const existingTitles = new Set(recipes.map((r) => r.title.toLowerCase().trim()));

    for (const candidate of selected) {
      const exists = existingTitles.has(candidate.title.toLowerCase().trim());
      if (exists) {
        if (duplicateAction === "skip") {
          continue;
        }
        if (duplicateAction === "keepBoth") {
          const cloned: Recipe = {
            ...candidate,
            id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            title: `${candidate.title} (Copy)`
          };
          await db.recipes.put(cloned);
          continue;
        }
      }
      await db.recipes.put(candidate);
    }

    setImportCandidates(null);
    await refreshAllData();
    alert(`Successfully imported ${selected.length} recipes!`);
    setActiveTab("library");
  };

  const activeRecipe = recipes.find((r) => r.id === selectedRecipeId);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Header */}
      <header
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "var(--space-3) var(--space-6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 10
        }}
      >
        <div
          onClick={() => setActiveTab("library")}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
        >
          <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <BookOpenIcon width={16} height={16} />
          </div>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.35rem", fontWeight: 700 }}>
            {BRAND.appName}
          </span>
        </div>

        {/* Desktop Nav Items */}
        <nav style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setActiveTab("library")}
            style={{
              background: activeTab === "library" ? "var(--surface-alt)" : "none",
              color: activeTab === "library" ? "var(--accent)" : "var(--text)",
              border: "none",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <BookOpenIcon width={16} height={16} /> Recipes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("planner")}
            style={{
              background: activeTab === "planner" ? "var(--surface-alt)" : "none",
              color: activeTab === "planner" ? "var(--accent)" : "var(--text)",
              border: "none",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <CalendarIcon width={16} height={16} /> Meal Plan
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("totals")}
            style={{
              background: activeTab === "totals" ? "var(--surface-alt)" : "none",
              color: activeTab === "totals" ? "var(--accent)" : "var(--text)",
              border: "none",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <CalculatorIcon width={16} height={16} /> Ingredient Totals
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("shopping")}
            style={{
              background: activeTab === "shopping" ? "var(--surface-alt)" : "none",
              color: activeTab === "shopping" ? "var(--accent)" : "var(--text)",
              border: "none",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <ShoppingCartIcon width={16} height={16} /> Shopping
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            style={{
              background: activeTab === "settings" ? "var(--surface-alt)" : "none",
              color: activeTab === "settings" ? "var(--accent)" : "var(--text)",
              border: "none",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <SettingsIcon width={16} height={16} /> Settings
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            style={{
              background: activeTab === "gallery" ? "var(--surface-alt)" : "none",
              color: "var(--muted)",
              border: "none",
              padding: "6px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            Gallery
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === "library" && (
          <RecipeLibrary
            recipes={recipes}
            collections={collections}
            activeCollectionId={activeCollectionId}
            onSelectCollection={setActiveCollectionId}
            onSaveCollection={handleSaveCollection}
            onDeleteCollection={handleDeleteCollection}
            onBatchAssignCollection={handleBatchAssignCollection}
            onSelectRecipe={handleSelectRecipe}
            onNewRecipe={handleNewRecipe}
            onImportFile={() => setActiveTab("settings")}
            onLoadSamples={handleLoadSamples}
            onToggleFavorite={handleToggleFavorite}
            onOpenCookbookBuilder={() => setShowCookbookModal(true)}
            onBatchDelete={handleBatchDelete}
            onBatchTag={handleBatchTag}
            onBatchExport={handleBatchExport}
            onBatchTotals={handleBatchTotals}
          />
        )}

        {activeTab === "recipe-view" && activeRecipe && (
          <RecipeView
            recipe={activeRecipe}
            userIngredients={userIngredients}
            onBack={() => setActiveTab("library")}
            onEdit={() => handleEditRecipe(activeRecipe)}
            onDelete={() => handleDeleteRecipe(activeRecipe.id)}
            onExport={() => handleExportSingleRecipe(activeRecipe)}
            onToggleFavorite={() => handleToggleFavorite(activeRecipe.id)}
            onOpenCookMode={() => setCookModeRecipe(activeRecipe)}
            onAddToShoppingList={() => handleAddRecipeToShoppingList(activeRecipe)}
            onUpdateRecipe={handleSaveRecipe}
            onDuplicateRecipe={handleDuplicateRecipe}
          />
        )}

        {activeTab === "editor" && (
          <RecipeEditor
            initialRecipe={editingRecipe}
            collections={collections}
            userIngredients={userIngredients}
            onSave={handleSaveRecipe}
            onCancel={() => setActiveTab(editingRecipe ? "recipe-view" : "library")}
          />
        )}

        {activeTab === "totals" && (
          <IngredientTotalsView
            recipes={recipes}
            combos={combos}
            onSaveCombo={handleSaveCombo}
            onDeleteCombo={handleDeleteCombo}
          />
        )}

        {activeTab === "planner" && (
          <MealPlannerView
            entries={mealPlanEntries}
            recipes={recipes}
            savedMenus={savedMenus}
            onSaveEntry={handleSaveMealPlanEntry}
            onSaveMultipleEntries={handleSaveMultipleMealPlanEntries}
            onDeleteEntry={handleDeleteMealPlanEntry}
            onAddMealsToShoppingList={handleAddWeekMealsToShoppingList}
            onSaveMenu={handleSaveMenu}
            onDeleteMenu={handleDeleteMenu}
          />
        )}

        {activeTab === "shopping" && (
          <ShoppingListView
            lists={shoppingLists}
            onSaveList={handleSaveShoppingList}
            onCreateList={handleCreateShoppingList}
            onDeleteList={handleDeleteShoppingList}
          />
        )}

        {activeTab === "settings" && (
          <SettingsView
            onExportFullBackup={handleExportFullBackup}
            onRestoreFullBackup={handleRestoreBackupFile}
            onOpenUserIngredients={() => setShowUserIngredientsModal(true)}
            recipeCount={recipes.length}
            trashedRecipes={trashedRecipes}
            onRestoreRecipe={handleRestoreRecipe}
            onPermanentDeleteRecipe={handlePermanentDeleteRecipe}
            onEmptyTrash={handleEmptyTrash}
            onRunAutoFolderBackup={handleRunAutoFolderBackup}
          />
        )}

        {activeTab === "gallery" && (
          <ComponentGallery />
        )}
      </main>

      {/* Cook Mode Full-Screen View */}
      {cookModeRecipe && (
        <CookModeView
          recipe={cookModeRecipe}
          multiplier={1}
          onClose={() => setCookModeRecipe(null)}
        />
      )}

      {/* Import Review Modal */}
      {importCandidates && (
        <ImportReviewModal
          candidates={importCandidates}
          existingRecipes={recipes}
          onConfirmImport={handleConfirmImport}
          onCancel={() => setImportCandidates(null)}
        />
      )}

      {/* User Ingredients Modal */}
      {showUserIngredientsModal && (
        <UserIngredientsModal
          userIngredients={userIngredients}
          onSaveIngredient={handleSaveUserIngredient}
          onDeleteIngredient={handleDeleteUserIngredient}
          onImportUserIngredients={handleImportUserIngredients}
          onClose={() => setShowUserIngredientsModal(false)}
        />
      )}

      {/* Cookbook Builder Modal */}
      {showCookbookModal && (
        <CookbookBuilderModal
          recipes={recipes}
          collections={collections}
          onClose={() => setShowCookbookModal(false)}
        />
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
            padding: "var(--space-4)"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>
                Keyboard Shortcuts
              </h3>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                aria-label="Close"
              >
                <XIcon width={18} height={18} />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.92rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Focus search</span>
                <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>/</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>New recipe</span>
                <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>N</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Edit recipe (in view)</span>
                <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>E</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cycle scaling (in view)</span>
                <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>S</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Cook mode (in view)</span>
                <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>C</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Close view or modal</span>
                <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>Esc</kbd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Toggle shortcuts help</span>
                <kbd style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "4px", border: "1px solid var(--border)", fontFamily: "var(--font-mono)" }}>?</kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop File Import Overlay */}
      {isDraggingOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
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
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", color: "var(--accent)", marginBottom: "4px" }}>
              Drop Recipe File Here
            </h2>
            <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
              Drop .recipe.json, .openrecipebook.zip, Recipe Keeper .zip, or .paprikarecipes
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
