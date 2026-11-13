import { useState, useEffect, useMemo, useRef, type FC, type ReactElement, type ChangeEvent, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { Recipe, CookLogEntry, DictionaryIngredient, Step } from "../../domain/recipe/types";
import { scaleIngredient } from "../../domain/scaling/scaleIngredient";
import { convertIngredientUnitSystem, convertStepTemperatures, type UnitSystem } from "../../domain/scaling/unitConverter";
import { formatTimeMinutes, normalizeRecipe } from "../../domain/recipe/normalize";
import { getCoursePlaceholder } from "../../domain/recipe/placeholders";
import { exportRecipeToJson } from "../../domain/export/ownFormat";
import {
  exportRecipeToJsonLd,
  exportRecipeToMarkdown,
  exportRecipeToPlainText
} from "../../domain/export/interopExport";
import { PhotoLightboxModal } from "../photos/PhotoLightboxModal";
import { processImageFileToBlobs } from "../../domain/photos/photoService";
import { NutritionFactsCard } from "../nutrition/NutritionFactsCard";
import { calculateRecipeNutrition } from "../../domain/nutrition/nutritionCalculator";
import { parseIngredient } from "../../domain/scaling/parseIngredient";
import {
  updateRecipeTitle,
  updateRecipeDescription,
  updateRecipeServings,
  updateRecipeTimes,
  updateRecipeNotes,
  updateIngredientLine,
  addIngredientLine,
  deleteIngredientLine,
  restoreIngredientLine,
  updateStepText,
  updateStepNote,
  addStepLine,
  deleteStepLine,
  restoreStepLine
} from "../../domain/recipe/recipeModifier";
import { saveRecipeVersion } from "../../domain/recipe/versionHistory";
import { RecipeHistoryModal } from "./RecipeHistoryModal";
import {
  convertIngredientUnit,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  type SupportedUnit
} from "../../domain/scaling/universalConverter";
import { QuickUnitConverterModal } from "./QuickUnitConverterModal";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";
import { db } from "../../data/db";
import {
  HeartIcon,
  StarIcon,
  EditIcon,
  TrashIcon,
  DownloadIcon,
  ChefHatIcon,
  ShoppingCartIcon,
  CopyIcon,
  XIcon,
  PlusIcon,
  CheckIcon,
  HistoryIcon,
  ConvertIcon
} from "../../ui/icons";

export interface RecipeViewProps {
  recipe: Recipe;
  userIngredients?: DictionaryIngredient[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onToggleFavorite: () => void;
  onOpenCookMode: () => void;
  onAddToShoppingList: () => void;
  onUpdateRecipe?: (updated: Recipe) => void;
  onDuplicateRecipe?: (duplicated: Recipe) => void;
}

export const RecipeView: FC<RecipeViewProps> = ({
  recipe,
  userIngredients = [],
  onBack,
  onEdit,
  onDelete,
  onExport,
  onToggleFavorite,
  onOpenCookMode,
  onAddToShoppingList,
  onUpdateRecipe,
  onDuplicateRecipe
}): ReactElement => {
  const [multiplier, setMultiplier] = useState<number>(1);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("us");
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [unitPromotion, setUnitPromotion] = useState<boolean>(true);
  const [isQuickEditMode, setIsQuickEditMode] = useState<boolean>(false);
  const [inlineConverterTarget, setInlineConverterTarget] = useState<{ id: string; value: number; unit: string; ingredient: string } | null>(null);

  // Photos state
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [showTidyModal, setShowTidyModal] = useState<boolean>(false);
  const [showCookLogModal, setShowCookLogModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"own" | "jsonld" | "markdown" | "plaintext">("own");
  const [includeScaleInExport, setIncludeScaleInExport] = useState<boolean>(false);
  const [cookLogNote, setCookLogNote] = useState<string>("");
  const [cookLogRating, setCookLogRating] = useState<number>(recipe.rating || 5);

  // Inline editing state for header and meta fields
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [inlineTitle, setInlineTitle] = useState<string>(recipe.title);

  const [isEditingDescription, setIsEditingDescription] = useState<boolean>(false);
  const [inlineDescription, setInlineDescription] = useState<string>(recipe.description || "");

  const [isEditingServings, setIsEditingServings] = useState<boolean>(false);
  const [inlineServings, setInlineServings] = useState<number>(recipe.servings || 4);
  const [inlineServingsLabel, setInlineServingsLabel] = useState<string>(recipe.servingsLabel || "servings");

  const [isEditingTimes, setIsEditingTimes] = useState<boolean>(false);
  const [inlinePrepMinutes, setInlinePrepMinutes] = useState<number>(recipe.prepMinutes || 0);
  const [inlineCookMinutes, setInlineCookMinutes] = useState<number>(recipe.cookMinutes || 0);

  // Inline notes editor
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);
  const [inlineNotes, setInlineNotes] = useState<string>(recipe.notes || "");

  // Inline ingredients editor
  const [editingIngredientId, setEditingIngredientId] = useState<string | null>(null);
  const [editingIngredientRaw, setEditingIngredientRaw] = useState<string>("");

  // Inline directions editor
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editingStepText, setEditingStepText] = useState<string>("");

  // Inline step note editor
  const [editingStepNoteId, setEditingStepNoteId] = useState<string | null>(null);
  const [stepNoteText, setStepNoteText] = useState<string>("");

  // Unit conversion state per ingredient
  const [ingredientUnitOverrides, setIngredientUnitOverrides] = useState<Record<string, string>>({});
  const [activeUnitMenuId, setActiveUnitMenuId] = useState<string | null>(null);
  const [quickConverterState, setQuickConverterState] = useState<{
    isOpen: boolean;
    initialValue?: number;
    initialUnit?: string;
    initialIngredient?: string;
  } | null>(null);

  // Saved pulse and undo snackbar
  const [showSavedIndicator, setShowSavedIndicator] = useState<boolean>(false);
  const [undoAction, setUndoAction] = useState<{ message: string; action: () => void } | null>(null);

  // Synchronize state when recipe prop updates
  useEffect(() => {
    setInlineTitle(recipe.title);
    setInlineDescription(recipe.description || "");
    setInlineServings(recipe.servings || 4);
    setInlineServingsLabel(recipe.servingsLabel || "servings");
    setInlinePrepMinutes(recipe.prepMinutes || 0);
    setInlineCookMinutes(recipe.cookMinutes || 0);
    setInlineNotes(recipe.notes || "");
  }, [recipe]);

  // Combined dictionary for nutrition lookup and ingredient autocomplete
  const combinedDictionary = useMemo((): DictionaryIngredient[] => {
    return [...BUILT_IN_INGREDIENTS, ...userIngredients];
  }, [userIngredients]);

  // Calculated nutrition estimate
  const nutritionEstimate = useMemo(() => {
    return calculateRecipeNutrition(recipe, multiplier, combinedDictionary);
  }, [recipe, multiplier, combinedDictionary]);

  // Auto-dismiss undo snackbar after 8 seconds
  useEffect(() => {
    if (!undoAction) return;
    const timer = window.setTimeout(() => setUndoAction(null), 8000);
    return () => window.clearTimeout(timer);
  }, [undoAction]);

  // Commit recipe update with version snapshot
  const commitRecipeUpdate = async (updated: Recipe, summaryNote?: string): Promise<void> => {
    if (onUpdateRecipe) {
      onUpdateRecipe(updated);
    }
    try {
      await saveRecipeVersion(updated, summaryNote);
    } catch {
      // Version snapshot error ignored
    }
    setShowSavedIndicator(true);
    window.setTimeout(() => setShowSavedIndicator(false), 1600);
  };

  // Load photos from Dexie database
  useEffect((): (() => void) => {
    let active = true;
    const currentUrls: string[] = [];

    const loadBlobs = async (): Promise<void> => {
      if (!recipe.photoIds || recipe.photoIds.length === 0) {
        if (active) setPhotoUrls([]);
        return;
      }

      const loaded: string[] = [];
      for (const id of recipe.photoIds) {
        try {
          const rec = await db.photos.get(id);
          if (rec?.hero) {
            const url = URL.createObjectURL(rec.hero);
            currentUrls.push(url);
            loaded.push(url);
          }
        } catch {
          // Photo record not found
        }
      }

      if (active) {
        setPhotoUrls(loaded);
      }
    };

    loadBlobs();

    return (): void => {
      active = false;
      for (const url of currentUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [recipe.photoIds]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processImageFileToBlobs(file, recipe.id);
      await db.photos.add({
        id: processed.id,
        recipeId: recipe.id,
        hero: processed.heroBlob,
        thumb: processed.thumbBlob,
        width: processed.width,
        height: processed.height
      });

      const updatedRecipe: Recipe = {
        ...recipe,
        photoIds: [...(recipe.photoIds || []), processed.id]
      };
      commitRecipeUpdate(updatedRecipe, "Added photo");
    } catch {
      // Photo processing failed
    }

    if (e.target) {
      e.target.value = "";
    }
  };

  const handleSetHero = (photoIdx: number): void => {
    if (photoIdx <= 0 || !recipe.photoIds || photoIdx >= recipe.photoIds.length) return;
    const targetId = recipe.photoIds[photoIdx];
    const newIds = [targetId, ...recipe.photoIds.filter((_, idx): boolean => idx !== photoIdx)];
    const updatedRecipe: Recipe = {
      ...recipe,
      photoIds: newIds
    };
    commitRecipeUpdate(updatedRecipe, "Changed hero photo");
    setLightboxIndex(0);
  };

  const handleDeletePhoto = async (photoIdx: number): Promise<void> => {
    if (!recipe.photoIds || photoIdx >= recipe.photoIds.length) return;
    const targetId = recipe.photoIds[photoIdx];
    try {
      await db.photos.delete(targetId);
    } catch {
      // Photo deletion error ignored
    }
    const newIds = recipe.photoIds.filter((_, idx): boolean => idx !== photoIdx);
    const updatedRecipe: Recipe = {
      ...recipe,
      photoIds: newIds
    };
    commitRecipeUpdate(updatedRecipe, "Deleted photo");
    setLightboxIndex(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const activeEl = document.activeElement;
      const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA" || activeEl?.tagName === "SELECT";
      if (isInput) return;

      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        onEdit();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        onOpenCookMode();
      } else if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        setMultiplier((prev) => {
          if (prev === 0.5) return 1;
          if (prev === 1) return 2;
          if (prev === 2) return 3;
          return 0.5;
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onEdit, onOpenCookMode]);

  const baseServings = Math.max(1, recipe.servings || 4);
  const currentServings = Math.round(baseServings * multiplier);

  const handleServingsChange = (delta: number): void => {
    const nextServings = Math.max(1, currentServings + delta);
    setMultiplier(nextServings / baseServings);
  };

  const toggleIngredientChecked = (id: string): void => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleShareLink = async (): Promise<void> => {
    const minimal = {
      title: recipe.title,
      description: recipe.description,
      servings: recipe.servings,
      ingredientGroups: recipe.ingredientGroups,
      directionGroups: recipe.directionGroups,
      notes: recipe.notes
    };
    const encoded = encodeURIComponent(JSON.stringify(minimal));
    const url = `${window.location.origin}${window.location.pathname}#recipe=${encoded}`;
    await navigator.clipboard.writeText(url);
    alert("Shareable recipe link copied to clipboard!");
  };

  const handlePerformExport = async (): Promise<void> => {
    if (exportFormat === "own" && !includeScaleInExport && onExport) {
      onExport();
      setShowExportModal(false);
      return;
    }

    const effectiveRecipe = includeScaleInExport && multiplier !== 1
      ? {
          ...recipe,
          servings: currentServings,
          ingredientGroups: recipe.ingredientGroups.map((g) => ({
            ...g,
            items: g.items.map((i) => {
              const scaled = scaleIngredient(i, multiplier, { unitPromotion });
              return { ...i, raw: scaled.formattedText };
            })
          }))
        }
      : recipe;

    const baseFilename = recipe.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let content = "";
    let filename = "";
    let mimeType = "text/plain";

    switch (exportFormat) {
      case "own":
        content = exportRecipeToJson(effectiveRecipe, [], includeScaleInExport ? multiplier : 1);
        filename = `${baseFilename}.recipe.json`;
        mimeType = "application/json";
        break;
      case "jsonld":
        content = exportRecipeToJsonLd(effectiveRecipe);
        filename = `${baseFilename}.jsonld`;
        mimeType = "application/ld+json";
        break;
      case "markdown":
        content = exportRecipeToMarkdown(effectiveRecipe);
        filename = `${baseFilename}.md`;
        mimeType = "text/markdown";
        break;
      case "plaintext":
        content = exportRecipeToPlainText(effectiveRecipe);
        filename = `${baseFilename}.txt`;
        mimeType = "text/plain";
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleDuplicate = (): void => {
    if (!onDuplicateRecipe) return;
    const duplicated: Recipe = {
      ...recipe,
      id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      title: `${recipe.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onDuplicateRecipe(duplicated);
  };

  const handleSaveScaledAsNew = (): void => {
    if (!onDuplicateRecipe) return;
    const scaledRecipe: Recipe = {
      ...recipe,
      id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      title: `${recipe.title} (${multiplier}x)`,
      servings: currentServings,
      ingredientGroups: recipe.ingredientGroups.map((g) => ({
        ...g,
        items: g.items.map((i) => {
          const scaled = scaleIngredient(i, multiplier, { unitPromotion });
          return {
            ...i,
            id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            raw: scaled.formattedText
          };
        })
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onDuplicateRecipe(scaledRecipe);
  };

  const handleApplyTidyUp = (): void => {
    const tidied = normalizeRecipe(recipe);
    commitRecipeUpdate(tidied, "Tidied recipe formatting");
    setShowTidyModal(false);
  };

  const handleAddCookLog = (e: FormEvent): void => {
    e.preventDefault();
    const newEntry: CookLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().split("T")[0],
      note: cookLogNote.trim() || undefined,
      rating: cookLogRating
    };
    const updatedCookLog = [newEntry, ...recipe.cookLog];
    const updated: Recipe = {
      ...recipe,
      cookLog: updatedCookLog,
      rating: (cookLogRating || recipe.rating) as Recipe["rating"],
      updatedAt: new Date().toISOString()
    };
    commitRecipeUpdate(updated, "Added cook log entry");
    setCookLogNote("");
    setShowCookLogModal(false);
  };

  // Live parsed candidate for ingredient line being edited
  const parsedCandidate = useMemo(() => {
    if (!editingIngredientId) return null;
    return parseIngredient(editingIngredientRaw, editingIngredientId);
  }, [editingIngredientId, editingIngredientRaw]);

  // Autocomplete suggestions based on raw text being typed
  const autocompleteSuggestions = useMemo((): DictionaryIngredient[] => {
    if (!editingIngredientId || editingIngredientRaw.trim().length < 2) return [];
    const query = editingIngredientRaw.toLowerCase().trim();
    return combinedDictionary
      .filter((d: DictionaryIngredient): boolean => {
        if (d.name.toLowerCase().includes(query)) return true;
        return d.aliases.some((a: string): boolean => a.toLowerCase().includes(query));
      })
      .slice(0, 4);
  }, [editingIngredientId, editingIngredientRaw, combinedDictionary]);

  // Delete ingredient handler with undo
  const handleDeleteIngredient = (groupIndex: number, itemIndex: number): void => {
    const { recipe: updated, deletedItem } = deleteIngredientLine(recipe, groupIndex, itemIndex);
    commitRecipeUpdate(updated, `Deleted: ${deletedItem.raw}`);
    setUndoAction({
      message: `Deleted "${deletedItem.raw}"`,
      action: (): void => {
        const restored = restoreIngredientLine(updated, groupIndex, itemIndex, deletedItem);
        commitRecipeUpdate(restored, `Restored: ${deletedItem.raw}`);
        setUndoAction(null);
      }
    });
  };

  // Delete step handler with undo
  const handleDeleteStep = (groupIndex: number, stepIndex: number): void => {
    const { recipe: updated, deletedStep } = deleteStepLine(recipe, groupIndex, stepIndex);
    commitRecipeUpdate(updated, `Deleted step`);
    setUndoAction({
      message: `Step removed`,
      action: (): void => {
        const restored = restoreStepLine(updated, groupIndex, stepIndex, deletedStep);
        commitRecipeUpdate(restored, `Restored step`);
        setUndoAction(null);
      }
    });
  };

  const handleIngredientKeyDown = (
    e: ReactKeyboardEvent<HTMLInputElement>,
    groupIndex: number,
    itemIndex: number
  ): void => {
    if (e.key === "Enter") {
      e.preventDefault();
      const updatedWithLine = updateIngredientLine(recipe, groupIndex, itemIndex, editingIngredientRaw);
      const { recipe: withNextLine, newId } = addIngredientLine(updatedWithLine, groupIndex, "", itemIndex);
      commitRecipeUpdate(withNextLine, `Updated ingredient line`);
      setEditingIngredientId(newId);
      setEditingIngredientRaw("");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingIngredientId(null);
      setEditingIngredientRaw("");
    }
  };

  const handleStepKeyDown = (
    e: ReactKeyboardEvent<HTMLTextAreaElement>,
    groupIndex: number,
    stepIndex: number
  ): void => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const updatedWithStep = updateStepText(recipe, groupIndex, stepIndex, editingStepText);
      const { recipe: withNextStep, newId } = addStepLine(updatedWithStep, groupIndex, "", stepIndex);
      commitRecipeUpdate(withNextStep, `Updated step line`);
      setEditingStepId(newId);
      setEditingStepText("");
    } else if (e.key === "Escape") {
      e.preventDefault();
      setEditingStepId(null);
      setEditingStepText("");
    }
  };

  const course = recipe.courses[0];
  const placeholder = getCoursePlaceholder(course);
  const prepFormatted = formatTimeMinutes(recipe.prepMinutes);
  const cookFormatted = formatTimeMinutes(recipe.cookMinutes);
  const totalFormatted = formatTimeMinutes(recipe.totalMinutes);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "var(--space-12)", position: "relative" }}>
      {/* Floating Saved Flash Indicator */}
      {showSavedIndicator && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface)",
            color: "var(--accent)",
            border: "1px solid var(--accent)",
            padding: "6px 18px",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-md)",
            fontWeight: 700,
            fontSize: "0.85rem",
            zIndex: 150,
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <CheckIcon width={16} height={16} /> Saved
        </div>
      )}

      {/* Floating Undo Snackbar */}
      {undoAction && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
            padding: "10px 20px",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-lg)",
            zIndex: 150,
            display: "flex",
            alignItems: "center",
            gap: "14px",
            fontSize: "0.9rem"
          }}
        >
          <span>{undoAction.message}</span>
          <button
            type="button"
            onClick={undoAction.action}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "4px 14px",
              borderRadius: "var(--radius-full)",
              fontWeight: 700,
              cursor: "pointer",
              fontSize: "0.82rem"
            }}
          >
            Undo
          </button>
        </div>
      )}

      {/* Top navigation row */}
      <div style={{ padding: "var(--space-4) var(--space-6)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: "1rem",
            cursor: "pointer",
            padding: "8px 0"
          }}
        >
          &larr; Back to Recipes
        </button>

        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenCookMode}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.9rem"
            }}
          >
            <ChefHatIcon width={16} height={16} /> Cook Mode
          </button>

          <button
            type="button"
            onClick={onAddToShoppingList}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            <ShoppingCartIcon width={16} height={16} /> Add to List
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 14px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            <CopyIcon width={16} height={16} /> Share Link
          </button>

          <button
            type="button"
            onClick={(): void => setShowHistoryModal(true)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
            title="View saved version history and undo changes"
          >
            <HistoryIcon width={15} height={15} /> History
          </button>

          <button
            type="button"
            onClick={(): void => setQuickConverterState({
              isOpen: true,
              initialValue: 100,
              initialUnit: "g",
              initialIngredient: "All-Purpose Flour"
            })}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
            title="Convert any unit, volume, weight, and ingredient density"
          >
            <ConvertIcon width={15} height={15} /> Unit Converter
          </button>

          <button
            type="button"
            onClick={(): void => setShowTidyModal(true)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
            title="Clean formatting and normalize times"
          >
            Tidy Up
          </button>

          <button
            type="button"
            onClick={(): void => setIsQuickEditMode(!isQuickEditMode)}
            style={{
              background: isQuickEditMode ? "var(--warning)" : "var(--surface)",
              color: isQuickEditMode ? "var(--accent-contrast)" : "var(--text)",
              border: "1px solid " + (isQuickEditMode ? "var(--warning)" : "var(--border)"),
              borderRadius: "var(--radius-full)",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: isQuickEditMode ? 700 : 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            title="Toggle inline editing mode (view mode is active by default to prevent accidental edits)"
          >
            <EditIcon width={14} height={14} /> Quick Edit: {isQuickEditMode ? "ON" : "OFF"}
          </button>

          {onDuplicateRecipe && (
            <button
              type="button"
              onClick={handleDuplicate}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "8px 12px",
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
              title="Duplicate recipe"
            >
              Duplicate
            </button>
          )}

          <button
            type="button"
            onClick={onToggleFavorite}
            style={{
              background: "var(--surface)",
              color: recipe.favorite ? "var(--danger)" : "var(--muted)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            aria-label="Toggle favorite"
          >
            <HeartIcon fill={recipe.favorite ? "currentColor" : "none"} width={18} height={18} />
          </button>

          <button
            type="button"
            onClick={(): void => setShowExportModal(true)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            aria-label="Export recipe"
          >
            <DownloadIcon width={18} height={18} />
          </button>

          <button
            type="button"
            onClick={onEdit}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            aria-label="Full recipe editor"
            title="Full recipe editor"
          >
            <EditIcon width={18} height={18} />
          </button>

          <button
            type="button"
            onClick={onDelete}
            style={{
              background: "var(--surface)",
              color: "var(--danger)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer"
            }}
            aria-label="Delete recipe"
          >
            <TrashIcon width={18} height={18} />
          </button>
        </div>
      </div>

      {/* Hidden Photo Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        style={{ display: "none" }}
      />

      {/* Hero Banner with Soft Gradient or Real Hero Photo */}
      <div
        style={{
          height: "300px",
          borderRadius: "var(--radius-lg)",
          margin: "0 var(--space-6) var(--space-4)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          padding: "var(--space-6)",
          boxShadow: "var(--shadow-md)",
          background: photoUrls.length > 0 ? "var(--surface-alt)" : placeholder.gradient,
          cursor: photoUrls.length > 0 ? "pointer" : "default"
        }}
        onClick={(): void => {
          if (photoUrls.length > 0) setLightboxIndex(0);
        }}
      >
        {photoUrls.length > 0 ? (
          <img
            src={photoUrls[0]}
            alt={recipe.title}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        ) : (
          <div
            style={{
              position: "absolute",
              right: "20px",
              top: "20px",
              width: "120px",
              height: "120px",
              opacity: 0.25,
              color: "var(--text)"
            }}
            dangerouslySetInnerHTML={{ __html: placeholder.svgContent }}
          />
        )}

        {/* Top Right Photo Action Controls */}
        <div
          style={{
            position: "absolute",
            top: "var(--space-4)",
            right: "var(--space-4)",
            display: "flex",
            gap: "var(--space-2)",
            zIndex: 3
          }}
          onClick={(e): void => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(): void => fileInputRef.current?.click()}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "6px 14px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)"
            }}
          >
            + Add Photo
          </button>
          {photoUrls.length > 0 && (
            <button
              type="button"
              onClick={(): void => setLightboxIndex(0)}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "6px 12px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)"
              }}
            >
              Gallery ({photoUrls.length})
            </button>
          )}
        </div>

        {/* Recipe Title & Description Box with Direct In-Place Editing */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            background: "var(--surface)",
            padding: "var(--space-4) var(--space-6)",
            borderRadius: "var(--radius-md)",
            maxWidth: "80%",
            boxShadow: "var(--shadow-sm)",
            border: "1px solid var(--border)"
          }}
          onClick={(e): void => e.stopPropagation()}
        >
          {isEditingTitle ? (
            <input
              type="text"
              value={inlineTitle}
              autoFocus
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setInlineTitle(e.target.value)}
              onBlur={(): void => {
                setIsEditingTitle(false);
                if (inlineTitle.trim() && inlineTitle !== recipe.title) {
                  const updated = updateRecipeTitle(recipe, inlineTitle);
                  commitRecipeUpdate(updated, `Renamed to ${inlineTitle.trim()}`);
                }
              }}
              onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>): void => {
                if (e.key === "Enter") {
                  setIsEditingTitle(false);
                  if (inlineTitle.trim() && inlineTitle !== recipe.title) {
                    const updated = updateRecipeTitle(recipe, inlineTitle);
                    commitRecipeUpdate(updated, `Renamed to ${inlineTitle.trim()}`);
                  }
                } else if (e.key === "Escape") {
                  setInlineTitle(recipe.title);
                  setIsEditingTitle(false);
                }
              }}
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "1.8rem",
                width: "100%",
                padding: "4px 8px",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                color: "var(--text)"
              }}
            />
          ) : (
            <div
              onClick={(): void => {
                if (isQuickEditMode) setIsEditingTitle(true);
              }}
              title={isQuickEditMode ? "Click to edit title directly" : undefined}
              style={{ display: "flex", alignItems: "center", gap: "8px", cursor: isQuickEditMode ? "pointer" : "default" }}
            >
              <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", lineHeight: 1.2, color: "var(--text)", margin: 0 }}>
                {recipe.title}
              </h1>
              {isQuickEditMode && (
                <span style={{ color: "var(--muted)", opacity: 0.6 }}>
                  <EditIcon width={16} height={16} />
                </span>
              )}
            </div>
          )}

          {isEditingDescription ? (
            <textarea
              value={inlineDescription}
              autoFocus
              rows={2}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setInlineDescription(e.target.value)}
              onBlur={(): void => {
                setIsEditingDescription(false);
                if (inlineDescription !== recipe.description) {
                  const updated = updateRecipeDescription(recipe, inlineDescription);
                  commitRecipeUpdate(updated, "Updated description");
                }
              }}
              onKeyDown={(e: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  setIsEditingDescription(false);
                  if (inlineDescription !== recipe.description) {
                    const updated = updateRecipeDescription(recipe, inlineDescription);
                    commitRecipeUpdate(updated, "Updated description");
                  }
                } else if (e.key === "Escape") {
                  setInlineDescription(recipe.description || "");
                  setIsEditingDescription(false);
                }
              }}
              style={{
                width: "100%",
                marginTop: "6px",
                padding: "6px 8px",
                fontSize: "0.95rem",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface)",
                color: "var(--text)"
              }}
            />
          ) : (
            <div
              onClick={(): void => {
                if (isQuickEditMode) setIsEditingDescription(true);
              }}
              title={isQuickEditMode ? "Click to edit description directly" : undefined}
              style={{ cursor: isQuickEditMode ? "pointer" : "default", marginTop: "4px" }}
            >
              {recipe.description ? (
                <p style={{ color: "var(--muted)", fontSize: "0.95rem", margin: 0 }}>
                  {recipe.description}
                </p>
              ) : isQuickEditMode ? (
                <span style={{ color: "var(--muted)", fontSize: "0.85rem", fontStyle: "italic" }}>
                  + Add description...
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Photo Gallery Strip */}
      {photoUrls.length > 1 && (
        <div
          style={{
            margin: "0 var(--space-6) var(--space-4)",
            display: "flex",
            gap: "var(--space-3)",
            overflowX: "auto",
            paddingBottom: "var(--space-2)"
          }}
        >
          {photoUrls.map((url: string, idx: number) => (
            <button
              key={url}
              type="button"
              onClick={(): void => setLightboxIndex(idx)}
              style={{
                border: idx === 0 ? "2px solid var(--accent)" : "1px solid var(--border)",
                padding: 0,
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                cursor: "pointer",
                flexShrink: 0,
                background: "none",
                width: "80px",
                height: "80px"
              }}
              title={idx === 0 ? "Hero Photo" : `Photo ${idx + 1}`}
            >
              <img
                src={url}
                alt={`Recipe thumbnail ${idx + 1}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Meta strip with In-Place Servings & Times Editing */}
      <div
        style={{
          margin: "0 var(--space-6) var(--space-6)",
          padding: "var(--space-4) var(--space-6)",
          background: "var(--surface)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-6)",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-6)", alignItems: "center" }}>
          {/* Prep, Cook, and Total Times */}
          {isEditingTimes ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", display: "block" }}>PREP (MIN)</label>
                <input
                  type="number"
                  min={0}
                  value={inlinePrepMinutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setInlinePrepMinutes(parseInt(e.target.value, 10) || 0)}
                  style={{ width: "55px", padding: "4px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", display: "block" }}>COOK (MIN)</label>
                <input
                  type="number"
                  min={0}
                  value={inlineCookMinutes}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setInlineCookMinutes(parseInt(e.target.value, 10) || 0)}
                  style={{ width: "55px", padding: "4px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)" }}
                />
              </div>
              <button
                type="button"
                onClick={(): void => {
                  setIsEditingTimes(false);
                  const updated = updateRecipeTimes(recipe, inlinePrepMinutes, inlineCookMinutes);
                  commitRecipeUpdate(updated, "Updated prep/cook times");
                }}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  marginTop: "12px",
                  fontWeight: 600
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <div
              onClick={(): void => {
                if (isQuickEditMode) setIsEditingTimes(true);
              }}
              title={isQuickEditMode ? "Click to edit times" : undefined}
              style={{ display: "flex", gap: "var(--space-6)", cursor: isQuickEditMode ? "pointer" : "default" }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Prep</div>
                <div style={{ fontWeight: 600 }}>{prepFormatted || "0 min"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Cook</div>
                <div style={{ fontWeight: 600 }}>{cookFormatted || "0 min"}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Total Time</div>
                <div style={{ fontWeight: 600 }}>{totalFormatted || "0 min"}</div>
              </div>
            </div>
          )}

          {/* Servings */}
          {isEditingServings ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", display: "block" }}>BASE SERVINGS</label>
                <input
                  type="number"
                  min={1}
                  value={inlineServings}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setInlineServings(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{ width: "50px", padding: "4px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.7rem", color: "var(--muted)", display: "block" }}>LABEL</label>
                <input
                  type="text"
                  value={inlineServingsLabel}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setInlineServingsLabel(e.target.value)}
                  style={{ width: "80px", padding: "4px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)" }}
                />
              </div>
              <button
                type="button"
                onClick={(): void => {
                  setIsEditingServings(false);
                  const updated = updateRecipeServings(recipe, inlineServings, inlineServingsLabel);
                  commitRecipeUpdate(updated, "Updated servings");
                }}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  border: "none",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  marginTop: "12px",
                  fontWeight: 600
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <div
              onClick={(): void => {
                if (isQuickEditMode) setIsEditingServings(true);
              }}
              title={isQuickEditMode ? "Click to edit servings" : undefined}
              style={{ cursor: isQuickEditMode ? "pointer" : "default" }}
            >
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>Servings</div>
              <div style={{ fontWeight: 600 }}>{currentServings} {recipe.servingsLabel || "servings"}</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          {recipe.rating > 0 && (
            <div style={{ display: "flex", gap: "2px", color: "var(--accent)" }}>
              {[1, 2, 3, 4, 5].map((star: number) => (
                <StarIcon key={star} fill={star <= recipe.rating ? "currentColor" : "none"} width={18} height={18} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={(): void => setShowCookLogModal(true)}
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            I Made This ({recipe.cookLog.length})
          </button>
        </div>
      </div>

      {/* Scaling & Units Controls Bar */}
      <div
        style={{
          margin: "0 var(--space-6) var(--space-6)",
          padding: "var(--space-3) var(--space-6)",
          background: "var(--surface-alt)",
          borderRadius: "var(--radius-md)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-4)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--muted)" }}>MULTIPLY:</span>
          {[0.5, 1, 2, 3].map((val: number) => (
            <button
              key={val}
              type="button"
              onClick={(): void => setMultiplier(val)}
              style={{
                background: multiplier === val ? "var(--accent)" : "var(--surface)",
                color: multiplier === val ? "var(--accent-contrast)" : "var(--text)",
                border: "1px solid " + (multiplier === val ? "var(--accent)" : "var(--border)"),
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {val === 0.5 ? "1/2×" : `${val}×`}
            </button>
          ))}
        </div>

        {/* Servings Stepper, Unit Toggle, & Unit Promotion */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={(): void => setUnitSystem(unitSystem === "us" ? "metric" : "us")}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "4px 12px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.82rem",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Units: {unitSystem === "us" ? "US Customary" : "Metric"}
          </button>

          <button
            type="button"
            onClick={(): void => setUnitPromotion(!unitPromotion)}
            style={{
              background: unitPromotion ? "var(--accent)" : "var(--surface)",
              color: unitPromotion ? "var(--accent-contrast)" : "var(--text)",
              border: "1px solid var(--border)",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
          >
            Promote Units: {unitPromotion ? "On" : "Off"}
          </button>

          <span style={{ fontSize: "0.85rem", color: "var(--muted)", marginLeft: "4px" }}>Yield:</span>
          <button
            type="button"
            onClick={(): void => handleServingsChange(-1)}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            -
          </button>
          <span style={{ fontWeight: 600, minWidth: "36px", textAlign: "center" }}>
            {currentServings}
          </span>
          <button
            type="button"
            onClick={(): void => handleServingsChange(1)}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            +
          </button>
        </div>

        {multiplier !== 1 && onDuplicateRecipe && (
          <div style={{ width: "100%", display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
            <button
              type="button"
              onClick={handleSaveScaledAsNew}
              style={{
                background: "var(--surface)",
                color: "var(--accent)",
                border: "1px solid var(--border)",
                padding: "4px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Save scaled version as new recipe
            </button>
          </div>
        )}

        {(multiplier > 2 || multiplier < 0.5) && (
          <div
            style={{
              width: "100%",
              padding: "6px 12px",
              marginTop: "4px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.82rem",
              color: "var(--muted)"
            }}
          >
            Cooking times, pan sizes, and seasoning may not scale linearly at {multiplier}x. Adjust seasonings to taste.
          </div>
        )}
      </div>

      {/* Two-Column Layout on Desktop, Single Column on Mobile */}
      <div className="recipe-view-grid">
        {/* Ingredients Column */}
        <div>
          <div style={{ position: "sticky", top: "var(--space-4)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid var(--border)", paddingBottom: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", margin: 0 }}>
                Ingredients
              </h2>
              {isQuickEditMode && (
                <button
                  type="button"
                  onClick={(): void => {
                    const { recipe: updated, newId } = addIngredientLine(recipe, 0, "");
                    commitRecipeUpdate(updated, "Added new ingredient");
                    setEditingIngredientId(newId);
                    setEditingIngredientRaw("");
                  }}
                  style={{
                    background: "var(--surface-alt)",
                    color: "var(--accent)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-full)",
                    padding: "4px 10px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <PlusIcon width={13} height={13} /> Add
                </button>
              )}
            </div>

            {recipe.ingredientGroups.map((group, groupIndex) => (
              <div key={groupIndex} style={{ marginBottom: "var(--space-4)" }}>
                {group.heading && (
                  <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px", marginBottom: "var(--space-2)" }}>
                    {group.heading}
                  </h3>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {group.items.map((item, itemIndex) => {
                    const isEditing = isQuickEditMode && editingIngredientId === item.id;
                    const parsedItem = (!item.quantity || !item.unit) ? parseIngredient(item.raw, item.id).ingredient : item;
                    const scaled = scaleIngredient(parsedItem, multiplier, { unitPromotion });
                    const displayItem = unitSystem === "metric"
                      ? convertIngredientUnitSystem(parsedItem, "metric", { multiplier, unitPromotion, preferGramsForDry: true })
                      : scaled;

                    const isChecked = !!checkedIngredients[item.id];

                    if (isEditing) {
                      return (
                        <li
                          key={item.id}
                          style={{
                            padding: "8px 0",
                            borderBottom: "1px solid var(--border)",
                            position: "relative"
                          }}
                        >
                          <input
                            type="text"
                            value={editingIngredientRaw}
                            autoFocus
                            placeholder="e.g. 2 cups all-purpose flour"
                            onChange={(e: ChangeEvent<HTMLInputElement>): void => setEditingIngredientRaw(e.target.value)}
                            onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>): void => handleIngredientKeyDown(e, groupIndex, itemIndex)}
                            onBlur={(): void => {
                              if (editingIngredientRaw.trim() && editingIngredientRaw !== item.raw) {
                                const updated = updateIngredientLine(recipe, groupIndex, itemIndex, editingIngredientRaw);
                                commitRecipeUpdate(updated, `Updated ingredient`);
                              }
                              setEditingIngredientId(null);
                            }}
                            style={{
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: "var(--radius-sm)",
                              border: "1px solid var(--accent)",
                              background: "var(--surface)",
                              color: "var(--text)",
                              fontSize: "0.92rem"
                            }}
                          />

                          {/* Live Parsed Preview Chips */}
                          {parsedCandidate && editingIngredientRaw.trim().length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                              {parsedCandidate.ingredient.quantity && (
                                <span style={{ fontSize: "0.72rem", background: "var(--surface-alt)", padding: "1px 6px", borderRadius: "4px", color: "var(--accent)" }}>
                                  Qty: {parsedCandidate.ingredient.quantity.kind === "single" ? parsedCandidate.ingredient.quantity.value : `${parsedCandidate.ingredient.quantity.min}-${parsedCandidate.ingredient.quantity.max}`}
                                </span>
                              )}
                              {parsedCandidate.ingredient.unit && (
                                <span style={{ fontSize: "0.72rem", background: "var(--surface-alt)", padding: "1px 6px", borderRadius: "4px", color: "var(--accent)" }}>
                                  Unit: {parsedCandidate.ingredient.unit}
                                </span>
                              )}
                              {parsedCandidate.ingredient.name && (
                                <span style={{ fontSize: "0.72rem", background: "var(--surface-alt)", padding: "1px 6px", borderRadius: "4px" }}>
                                  Item: {parsedCandidate.ingredient.name}
                                </span>
                              )}
                              {!parsedCandidate.ingredient.scalable && (
                                <span style={{ fontSize: "0.72rem", background: "var(--surface-alt)", padding: "1px 6px", borderRadius: "4px", color: "var(--muted)", fontStyle: "italic" }}>
                                  not scaled
                                </span>
                              )}
                            </div>
                          )}

                          {/* Dictionary Autocomplete Suggestions */}
                          {autocompleteSuggestions.length > 0 && (
                            <div
                              style={{
                                marginTop: "4px",
                                background: "var(--surface)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-sm)",
                                boxShadow: "var(--shadow-sm)",
                                overflow: "hidden"
                              }}
                            >
                              {autocompleteSuggestions.map((s: DictionaryIngredient) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  onMouseDown={(): void => {
                                    // Use suggestion name
                                    const qtyPart = parsedCandidate?.ingredient.quantity
                                      ? `${parsedCandidate.ingredient.quantity.kind === "single" ? parsedCandidate.ingredient.quantity.value : parsedCandidate.ingredient.quantity.min} `
                                      : "";
                                    const unitPart = parsedCandidate?.ingredient.unit ? `${parsedCandidate.ingredient.unit} ` : "";
                                    const newText = `${qtyPart}${unitPart}${s.name}`;
                                    const updated = updateIngredientLine(recipe, groupIndex, itemIndex, newText);
                                    commitRecipeUpdate(updated, `Selected ${s.name}`);
                                    setEditingIngredientId(null);
                                  }}
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    textAlign: "left",
                                    background: "none",
                                    border: "none",
                                    padding: "4px 8px",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    color: "var(--text)"
                                  }}
                                >
                                  {s.name} <span style={{ color: "var(--muted)", fontSize: "0.72rem" }}>({s.aisle})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    }

                    const effectiveUnit = parsedItem.unit || "";
                    const effectiveName = parsedItem.name || item.name || item.raw;
                    const baseNumericValue = parsedItem.quantity
                      ? (parsedItem.quantity.kind === "single" ? parsedItem.quantity.value : parsedItem.quantity.max)
                      : undefined;
                    const scaledNumericValue = baseNumericValue !== undefined ? baseNumericValue * multiplier : undefined;
                    const customTargetUnit = ingredientUnitOverrides[item.id];
                    const canConvert = scaledNumericValue !== undefined && effectiveUnit !== "";
                    const activeConversion = (scaledNumericValue !== undefined && effectiveUnit && customTargetUnit)
                      ? convertIngredientUnit(scaledNumericValue, effectiveUnit, customTargetUnit, effectiveName, undefined, combinedDictionary)
                      : null;
                    const openInlineConverter = (): void => {
                      if (!canConvert || scaledNumericValue === undefined) return;
                      setInlineConverterTarget({ id: item.id, value: scaledNumericValue, unit: effectiveUnit, ingredient: effectiveName });
                    };

                    return (
                      <li
                        key={item.id}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          padding: "6px 0",
                          borderBottom: "1px solid var(--border)"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <div
                            onClick={(): void => toggleIngredientChecked(item.id)}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "var(--space-3)",
                              cursor: "pointer",
                              textDecoration: isChecked ? "line-through" : "none",
                              color: isChecked ? "var(--muted)" : "var(--text)",
                              flex: 1
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(): void => {}}
                              style={{ marginTop: "4px", cursor: "pointer" }}
                            />
                            <span style={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.4 }}>
                              {activeConversion?.success ? (
                                <span>
                                  <strong
                                    onClick={(e): void => {
                                      e.stopPropagation();
                                      openInlineConverter();
                                    }}
                                    style={{ color: "var(--accent)", cursor: "pointer", textDecoration: "underline" }}
                                    title="Click to convert this amount to other units"
                                  >
                                    {activeConversion.formattedAmount} {activeConversion.targetUnit}
                                  </strong>{" "}
                                  {effectiveName}
                                  <span style={{ fontSize: "0.75rem", color: "var(--accent)", fontStyle: "italic", marginLeft: "6px" }}>
                                    (from {displayItem.formattedText})
                                  </span>
                                </span>
                              ) : (
                                <span
                                  onClick={(e): void => {
                                    if (!canConvert) return;
                                    e.stopPropagation();
                                    openInlineConverter();
                                  }}
                                  title={canConvert ? "Click the amount to convert to other units" : undefined}
                                  style={{
                                    cursor: canConvert ? "pointer" : "inherit",
                                    borderBottom: canConvert ? "1px dashed var(--accent)" : "none"
                                  }}
                                >
                                  {displayItem.formattedText}
                                </span>
                              )}
                              {scaled.hint && (
                                <span style={{ display: "block", fontSize: "0.78rem", color: "var(--muted)", fontStyle: "italic" }}>
                                  ({scaled.hint})
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Unit conversion selector pill */}
                          {canConvert && (
                            <button
                              type="button"
                              onClick={(e): void => {
                                e.stopPropagation();
                                setActiveUnitMenuId(activeUnitMenuId === item.id ? null : item.id);
                              }}
                              style={{
                                background: customTargetUnit ? "var(--accent)" : "var(--surface-alt)",
                                color: customTargetUnit ? "var(--accent-contrast)" : "var(--text)",
                                border: "1px solid var(--border)",
                                borderRadius: "var(--radius-full)",
                                padding: "2px 8px",
                                fontSize: "0.72rem",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                                marginLeft: "6px"
                              }}
                              title="Click to convert unit (e.g. cup to tbsp, grams, oz...)"
                            >
                              <ConvertIcon width={11} height={11} /> {customTargetUnit || effectiveUnit}
                            </button>
                          )}

                          {/* Inline Actions, visible only in Quick Edit mode */}
                          {isQuickEditMode && (
                          <div style={{ display: "flex", gap: "2px", alignItems: "center", marginLeft: "6px" }}>
                            <button
                              type="button"
                              onClick={(): void => {
                                setEditingIngredientId(item.id);
                                setEditingIngredientRaw(item.raw);
                              }}
                              title="Edit ingredient line"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--muted)",
                                padding: "4px",
                                borderRadius: "4px"
                              }}
                            >
                              <EditIcon width={14} height={14} />
                            </button>
                            <button
                              type="button"
                              onClick={(): void => handleDeleteIngredient(groupIndex, itemIndex)}
                              title="Delete ingredient line"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--danger)",
                                padding: "4px",
                                borderRadius: "4px"
                              }}
                            >
                              <TrashIcon width={14} height={14} />
                            </button>
                          </div>
                          )}
                        </div>

                        {/* Dropdown Menu for Unit Conversion on this ingredient */}
                        {activeUnitMenuId === item.id && scaledNumericValue !== undefined && effectiveUnit && (
                          <div
                            onClick={(e): void => e.stopPropagation()}
                            style={{
                              marginTop: "8px",
                              padding: "10px 12px",
                              background: "var(--surface)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-md)",
                              boxShadow: "var(--shadow-md)",
                              zIndex: 10
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                                Convert Unit for {effectiveName}
                              </span>
                              {customTargetUnit && (
                                <button
                                  type="button"
                                  onClick={(): void => {
                                    setIngredientUnitOverrides((prev) => {
                                      const copy = { ...prev };
                                      delete copy[item.id];
                                      return copy;
                                    });
                                    setActiveUnitMenuId(null);
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--accent)",
                                    fontSize: "0.75rem",
                                    cursor: "pointer",
                                    fontWeight: 600
                                  }}
                                >
                                  Reset to {effectiveUnit}
                                </button>
                              )}
                            </div>

                            {/* Volume units list */}
                            <div style={{ marginBottom: "6px" }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, marginBottom: "3px" }}>
                                VOLUME UNITS
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {VOLUME_UNITS.map((u: SupportedUnit) => {
                                  const preview = convertIngredientUnit(scaledNumericValue, effectiveUnit || "cup", u, effectiveName, undefined, combinedDictionary);
                                  const isCurrent = (customTargetUnit || effectiveUnit) === u;
                                  return (
                                    <button
                                      key={u}
                                      type="button"
                                      onClick={(): void => {
                                        setIngredientUnitOverrides((prev) => ({ ...prev, [item.id]: u }));
                                        setActiveUnitMenuId(null);
                                      }}
                                      style={{
                                        background: isCurrent ? "var(--accent)" : "var(--surface-alt)",
                                        color: isCurrent ? "var(--accent-contrast)" : "var(--text)",
                                        border: "1px solid " + (isCurrent ? "var(--accent)" : "var(--border)"),
                                        borderRadius: "var(--radius-sm)",
                                        padding: "2px 6px",
                                        fontSize: "0.75rem",
                                        cursor: "pointer"
                                      }}
                                    >
                                      {u} ({preview.formattedAmount})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Weight units list with density */}
                            <div style={{ marginBottom: "6px" }}>
                              <div style={{ fontSize: "0.7rem", color: "var(--muted)", fontWeight: 700, marginBottom: "3px" }}>
                                WEIGHT UNITS (DENSITY CONVERTED)
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                                {WEIGHT_UNITS.map((u: SupportedUnit) => {
                                  const preview = convertIngredientUnit(scaledNumericValue, effectiveUnit || "cup", u, effectiveName, undefined, combinedDictionary);
                                  const isCurrent = (customTargetUnit || effectiveUnit) === u;
                                  return (
                                    <button
                                      key={u}
                                      type="button"
                                      onClick={(): void => {
                                        setIngredientUnitOverrides((prev) => ({ ...prev, [item.id]: u }));
                                        setActiveUnitMenuId(null);
                                      }}
                                      style={{
                                        background: isCurrent ? "var(--accent)" : "var(--surface-alt)",
                                        color: isCurrent ? "var(--accent-contrast)" : "var(--text)",
                                        border: "1px solid " + (isCurrent ? "var(--accent)" : "var(--border)"),
                                        borderRadius: "var(--radius-sm)",
                                        padding: "2px 6px",
                                        fontSize: "0.75rem",
                                        cursor: "pointer"
                                      }}
                                    >
                                      {u} ({preview.formattedAmount})
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Launch Full Converter Link */}
                            <div style={{ textAlign: "right", marginTop: "4px" }}>
                              <button
                                type="button"
                                onClick={(): void => {
                                  setQuickConverterState({
                                    isOpen: true,
                                    initialValue: scaledNumericValue,
                                    initialUnit: effectiveUnit || "cup",
                                    initialIngredient: effectiveName
                                  });
                                  setActiveUnitMenuId(null);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--accent)",
                                  fontSize: "0.75rem",
                                  cursor: "pointer",
                                  textDecoration: "underline"
                                }}
                              >
                                Open Full All-Units Table &rarr;
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* Nutrition Facts Card */}
            <div style={{ marginTop: "var(--space-6)" }}>
              <NutritionFactsCard estimate={nutritionEstimate} />
            </div>
          </div>
        </div>

        {/* Directions Column */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid var(--border)", paddingBottom: "var(--space-2)", marginBottom: "var(--space-4)" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", margin: 0 }}>
              Directions
            </h2>
            {isQuickEditMode && (
            <button
              type="button"
              onClick={(): void => {
                const { recipe: updated, newId } = addStepLine(recipe, 0, "");
                commitRecipeUpdate(updated, "Added new step");
                setEditingStepId(newId);
                setEditingStepText("");
              }}
              style={{
                background: "var(--surface-alt)",
                color: "var(--accent)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "4px 10px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <PlusIcon width={13} height={13} /> Add Step
            </button>
            )}
          </div>

          {recipe.directionGroups.map((group, groupIndex) => (
            <div key={groupIndex} style={{ marginBottom: "var(--space-6)" }}>
              {group.heading && (
                <h3 style={{ fontSize: "1.1rem", fontFamily: "var(--font-serif)", marginBottom: "var(--space-3)" }}>
                  {group.heading}
                </h3>
              )}
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {group.steps.map((step: Step, stepIndex: number) => {
                  const isEditingStep = isQuickEditMode && editingStepId === step.id;
                  const isEditingNote = isQuickEditMode && editingStepNoteId === step.id;
                  const convertedStepText = convertStepTemperatures(step.text, unitSystem);

                  return (
                    <li
                      key={step.id}
                      style={{
                        display: "flex",
                        gap: "var(--space-4)",
                        marginBottom: "var(--space-6)",
                        lineHeight: 1.6,
                        fontSize: "1.05rem",
                        maxWidth: "70ch"
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontSize: "1.5rem",
                          fontWeight: 700,
                          color: "var(--accent)",
                          lineHeight: 1,
                          minWidth: "28px"
                        }}
                      >
                        {stepIndex + 1}
                      </span>
                      <div style={{ flex: 1 }}>
                        {isEditingStep ? (
                          <div style={{ width: "100%" }}>
                            <textarea
                              value={editingStepText}
                              autoFocus
                              rows={3}
                              onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setEditingStepText(e.target.value)}
                              onKeyDown={(e: ReactKeyboardEvent<HTMLTextAreaElement>): void => handleStepKeyDown(e, groupIndex, stepIndex)}
                              onBlur={(): void => {
                                if (editingStepText.trim() && editingStepText !== step.text) {
                                  const updated = updateStepText(recipe, groupIndex, stepIndex, editingStepText);
                                  commitRecipeUpdate(updated, "Updated step text");
                                }
                                setEditingStepId(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "8px",
                                borderRadius: "var(--radius-sm)",
                                border: "1px solid var(--accent)",
                                background: "var(--surface)",
                                color: "var(--text)",
                                fontSize: "1rem"
                              }}
                            />
                            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
                              Press Enter to add the next step. Shift+Enter for newline.
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div
                              onClick={(): void => {
                                if (!isQuickEditMode) return;
                                setEditingStepId(step.id);
                                setEditingStepText(step.text);
                              }}
                              title={isQuickEditMode ? "Click to edit step text" : undefined}
                              style={{ cursor: isQuickEditMode ? "pointer" : "default" }}
                            >
                              {convertedStepText}
                            </div>

                            {/* Step Note Callout if Present */}
                            {step.note && !isEditingNote && (
                              <div
                                style={{
                                  marginTop: "6px",
                                  padding: "6px 10px",
                                  background: "var(--surface-alt)",
                                  borderLeft: "3px solid var(--accent)",
                                  borderRadius: "var(--radius-sm)",
                                  fontSize: "0.88rem",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center"
                                }}
                              >
                                <span>Note: {step.note}</span>
                                {isQuickEditMode && (
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button
                                    type="button"
                                    onClick={(): void => {
                                      setEditingStepNoteId(step.id);
                                      setStepNoteText(step.note || "");
                                    }}
                                    title="Edit step note"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: "2px" }}
                                  >
                                    <EditIcon width={12} height={12} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(): void => {
                                      const updated = updateStepNote(recipe, groupIndex, stepIndex, undefined);
                                      commitRecipeUpdate(updated, "Removed step note");
                                    }}
                                    title="Remove note"
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: "2px" }}
                                  >
                                    <XIcon width={12} height={12} />
                                  </button>
                                </div>
                                )}
                              </div>
                            )}

                            {/* Inline Step Note Editor */}
                            {isEditingNote && (
                              <div style={{ marginTop: "6px", display: "flex", gap: "6px" }}>
                                <input
                                  type="text"
                                  value={stepNoteText}
                                  autoFocus
                                  placeholder="Step note (shown inline in cook mode)..."
                                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setStepNoteText(e.target.value)}
                                  onKeyDown={(e: ReactKeyboardEvent<HTMLInputElement>): void => {
                                    if (e.key === "Enter") {
                                      const updated = updateStepNote(recipe, groupIndex, stepIndex, stepNoteText);
                                      commitRecipeUpdate(updated, "Saved step note");
                                      setEditingStepNoteId(null);
                                    } else if (e.key === "Escape") {
                                      setEditingStepNoteId(null);
                                    }
                                  }}
                                  onBlur={(): void => {
                                    const updated = updateStepNote(recipe, groupIndex, stepIndex, stepNoteText);
                                    commitRecipeUpdate(updated, "Saved step note");
                                    setEditingStepNoteId(null);
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: "4px 8px",
                                    fontSize: "0.85rem",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px solid var(--accent)",
                                    background: "var(--surface)",
                                    color: "var(--text)"
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={(): void => {
                                    const updated = updateStepNote(recipe, groupIndex, stepIndex, stepNoteText);
                                    commitRecipeUpdate(updated, "Saved step note");
                                    setEditingStepNoteId(null);
                                  }}
                                  style={{
                                    background: "var(--accent)",
                                    color: "var(--accent-contrast)",
                                    border: "none",
                                    padding: "4px 8px",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.8rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  Save Note
                                </button>
                              </div>
                            )}

                            {/* Action Buttons for Step */}
                            {isQuickEditMode && (
                            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                              <button
                                type="button"
                                onClick={(): void => {
                                  setEditingStepId(step.id);
                                  setEditingStepText(step.text);
                                }}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--muted)",
                                  fontSize: "0.78rem",
                                  cursor: "pointer",
                                  padding: 0
                                }}
                              >
                                Edit text
                              </button>
                              {!step.note && !isEditingNote && (
                                <button
                                  type="button"
                                  onClick={(): void => {
                                    setEditingStepNoteId(step.id);
                                    setStepNoteText("");
                                  }}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--accent)",
                                    fontSize: "0.78rem",
                                    cursor: "pointer",
                                    padding: 0
                                  }}
                                >
                                  + Step Note
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(): void => handleDeleteStep(groupIndex, stepIndex)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--danger)",
                                  fontSize: "0.78rem",
                                  cursor: "pointer",
                                  padding: 0
                                }}
                              >
                                Delete step
                              </button>
                            </div>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}

          {/* Notes Section with One-Tap Effortless Editing */}
          <div style={{ marginTop: "var(--space-8)", padding: "var(--space-4) var(--space-6)", background: "var(--surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-2)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.15rem", margin: 0 }}>
                Cook's Notes
              </h3>
              {isQuickEditMode && !isEditingNotes && (
                <button
                  type="button"
                  onClick={(): void => setIsEditingNotes(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--accent)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600
                  }}
                >
                  {recipe.notes ? "Edit Note" : "+ Add Note"}
                </button>
              )}
            </div>

            {isQuickEditMode && isEditingNotes ? (
              <div>
                {/* Format Helper Toolbar */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "6px" }}>
                  <button
                    type="button"
                    onClick={(): void => setInlineNotes((prev: string): string => `${prev} **bold text**`)}
                    style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.78rem", cursor: "pointer", fontWeight: 700 }}
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={(): void => setInlineNotes((prev: string): string => `${prev} *italic text*`)}
                    style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.78rem", cursor: "pointer", fontStyle: "italic" }}
                  >
                    I
                  </button>
                  <button
                    type="button"
                    onClick={(): void => setInlineNotes((prev: string): string => `${prev}\n- List item`)}
                    style={{ background: "var(--surface-alt)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.78rem", cursor: "pointer" }}
                  >
                    - List
                  </button>
                </div>
                <textarea
                  value={inlineNotes}
                  rows={4}
                  autoFocus
                  placeholder="Type tips, variations, ingredient swaps... (Markdown supported)"
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setInlineNotes(e.target.value)}
                  onBlur={(): void => {
                    const updated = updateRecipeNotes(recipe, inlineNotes);
                    commitRecipeUpdate(updated, "Saved recipe notes");
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--accent)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontSize: "0.95rem",
                    lineHeight: 1.5
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    Saves automatically on blur.
                  </span>
                  <button
                    type="button"
                    onClick={(): void => {
                      const updated = updateRecipeNotes(recipe, inlineNotes);
                      commitRecipeUpdate(updated, "Saved recipe notes");
                      setIsEditingNotes(false);
                    }}
                    style={{
                      background: "var(--accent)",
                      color: "var(--accent-contrast)",
                      border: "none",
                      padding: "4px 12px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      fontWeight: 600
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : recipe.notes ? (
              <p
                onClick={(): void => {
                  if (isQuickEditMode) setIsEditingNotes(true);
                }}
                title={isQuickEditMode ? "Click to edit notes" : undefined}
                style={{ color: "var(--text)", lineHeight: 1.5, margin: 0, cursor: isQuickEditMode ? "pointer" : "default", whiteSpace: "pre-line" }}
              >
                {recipe.notes}
              </p>
            ) : isQuickEditMode ? (
              <div
                onClick={(): void => setIsEditingNotes(true)}
                style={{
                  padding: "var(--space-3)",
                  border: "1px dashed var(--border)",
                  borderRadius: "var(--radius-sm)",
                  textAlign: "center",
                  color: "var(--muted)",
                  fontSize: "0.9rem",
                  cursor: "pointer"
                }}
              >
                + Click here to add your first cook's note...
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.88rem", fontStyle: "italic", margin: 0 }}>
                No cook's notes yet.
              </p>
            )}
          </div>

          {/* Cook Log History */}
          {recipe.cookLog.length > 0 && (
            <div style={{ marginTop: "var(--space-6)", padding: "var(--space-4) var(--space-6)", background: "var(--surface-alt)", borderRadius: "var(--radius-md)" }}>
              <h3 style={{ fontSize: "1.05rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px", marginBottom: "var(--space-3)" }}>
                Cooking History ({recipe.cookLog.length} times made)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {recipe.cookLog.map((log: CookLogEntry) => (
                  <div key={log.id} style={{ fontSize: "0.9rem", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                      <span>{log.date}</span>
                      {log.rating && (
                        <span style={{ color: "var(--accent)" }}>
                          {log.rating}/5 stars
                        </span>
                      )}
                    </div>
                    {log.note && <div style={{ color: "var(--muted)", marginTop: "2px" }}>{log.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tidy Up Preview Modal */}
      {showTidyModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", width: "90%", maxWidth: "500px" }}>
            <h3 style={{ marginBottom: "var(--space-3)" }}>Tidy Up Recipe Formatting</h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-4)" }}>
              Re-runs normalization to standardize unit abbreviations, format fractions, clean step prefixes, and trim tracking parameters.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button type="button" onClick={(): void => setShowTidyModal(false)} style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handleApplyTidyUp} style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "8px 18px", borderRadius: "var(--radius-full)", fontWeight: 600, cursor: "pointer" }}>Apply Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* "I Made This" Cook Log Modal */}
      {showCookLogModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", width: "90%", maxWidth: "450px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h3 style={{ margin: 0 }}>Log Cooking Session</h3>
              <button type="button" onClick={(): void => setShowCookLogModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <XIcon width={20} height={20} />
              </button>
            </div>
            <form onSubmit={handleAddCookLog}>
              <div style={{ marginBottom: "var(--space-3)" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Rating</label>
                <select value={cookLogRating} onChange={(e: ChangeEvent<HTMLSelectElement>): void => setCookLogRating(parseInt(e.target.value, 10))} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)" }}>
                  <option value={5}>5 Stars - Excellent</option>
                  <option value={4}>4 Stars - Great</option>
                  <option value={3}>3 Stars - Good</option>
                  <option value={2}>2 Stars - Fair</option>
                  <option value={1}>1 Star - Needs Work</option>
                </select>
              </div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>Cook's Log Note (optional)</label>
                <textarea rows={3} value={cookLogNote} onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setCookLogNote(e.target.value)} placeholder="e.g. Added extra garlic, baked 5 minutes less, huge hit!" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                <button type="button" onClick={(): void => setShowCookLogModal(false)} style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}>Cancel</button>
                <button type="submit" style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "8px 18px", borderRadius: "var(--radius-full)", fontWeight: 600, cursor: "pointer" }}>Save Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export / Share Dialog */}
      {showExportModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", width: "90%", maxWidth: "460px", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>Export Recipe</h3>
              <button type="button" onClick={(): void => setShowExportModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}>
                <XIcon width={20} height={20} />
              </button>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "var(--space-4)" }}>
              Choose a file format to export or share with other apps.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "var(--space-4)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: exportFormat === "own" ? "var(--surface-alt)" : "none" }}>
                <input
                  type="radio"
                  name="exportFormat"
                  value="own"
                  checked={exportFormat === "own"}
                  onChange={(): void => setExportFormat("own")}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Open Recipe Book (.recipe.json)</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Lossless format for backup and sharing between OpenRecipeBook users</div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: exportFormat === "jsonld" ? "var(--surface-alt)" : "none" }}>
                <input
                  type="radio"
                  name="exportFormat"
                  value="jsonld"
                  checked={exportFormat === "jsonld"}
                  onChange={(): void => setExportFormat("jsonld")}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>schema.org JSON-LD (.jsonld)</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Standard web schema accepted by Mealie, Tandoor, and RecipeSage</div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: exportFormat === "markdown" ? "var(--surface-alt)" : "none" }}>
                <input
                  type="radio"
                  name="exportFormat"
                  value="markdown"
                  checked={exportFormat === "markdown"}
                  onChange={(): void => setExportFormat("markdown")}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Markdown (.md)</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Formatted text for Obsidian, GitHub, or note taking apps</div>
                </div>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer", background: exportFormat === "plaintext" ? "var(--surface-alt)" : "none" }}>
                <input
                  type="radio"
                  name="exportFormat"
                  value="plaintext"
                  checked={exportFormat === "plaintext"}
                  onChange={(): void => setExportFormat("plaintext")}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Plain Text (.txt)</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Universal readable text for email, SMS, or printing</div>
                </div>
              </label>
            </div>

            {multiplier !== 1 && (
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.88rem", marginBottom: "var(--space-4)" }}>
                <input
                  type="checkbox"
                  checked={includeScaleInExport}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setIncludeScaleInExport(e.target.checked)}
                />
                <span>Include current scaling ({multiplier}x · makes {currentServings} servings)</span>
              </label>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
              <button type="button" onClick={(): void => setShowExportModal(false)} style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}>Cancel</button>
              <button type="button" onClick={handlePerformExport} style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "8px 18px", borderRadius: "var(--radius-full)", fontWeight: 600, cursor: "pointer" }}>Download File</button>
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {showHistoryModal && (
        <RecipeHistoryModal
          recipeId={recipe.id}
          onRestore={(restored: Recipe): void => {
            commitRecipeUpdate(restored, "Restored previous version snapshot");
          }}
          onClose={(): void => setShowHistoryModal(false)}
        />
      )}

      {/* Photo Lightbox Modal */}
      {lightboxIndex !== null && (
        <PhotoLightboxModal
          photos={photoUrls}
          initialIndex={lightboxIndex}
          onClose={(): void => setLightboxIndex(null)}
          onSetHero={handleSetHero}
          onDeletePhoto={handleDeletePhoto}
        />
      )}

      {/* Universal Unit & Density Converter Modal */}
      {(quickConverterState?.isOpen || inlineConverterTarget) && (
        <QuickUnitConverterModal
          initialValue={inlineConverterTarget ? inlineConverterTarget.value : quickConverterState?.initialValue}
          initialUnit={inlineConverterTarget ? inlineConverterTarget.unit : quickConverterState?.initialUnit}
          initialIngredient={inlineConverterTarget ? inlineConverterTarget.ingredient : quickConverterState?.initialIngredient}
          userIngredients={userIngredients}
          onApplyConversion={inlineConverterTarget ? (_convertedText: string, targetUnit: string): void => {
            setIngredientUnitOverrides((prev) => ({ ...prev, [inlineConverterTarget.id]: targetUnit }));
          } : undefined}
          onClose={(): void => {
            setQuickConverterState(null);
            setInlineConverterTarget(null);
          }}
        />
      )}
    </div>
  );
};
