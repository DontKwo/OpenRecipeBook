import { useState, useRef, useEffect, type FC, type ReactElement, type ChangeEvent, type FormEvent } from "react";
import type {
  Recipe,
  RecipeRating,
  DictionaryIngredient,
  Collection,
  Ingredient,
  Step,
  StepTimer,
  IngredientGroup,
  DirectionGroup
} from "../../domain/recipe/types";
import { normalizeRecipe } from "../../domain/recipe/normalize";
import { parseIngredient } from "../../domain/scaling/parseIngredient";
import { importRecipesFromUrl } from "../../domain/import/nativeFetch";
import { extractRecipesFromHtml } from "../../domain/import/jsonld";
import { parsePlainTextRecipe } from "../../domain/import/textRecipeParser";
import { LinkIcon, CameraIcon, FileTextIcon, PlusIcon, TrashIcon, ChevronUp, ChevronDown, CheckIcon } from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { Dialog } from "../../ui/Dialog";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import styles from "./RecipeEditor.module.css";

export interface RecipeEditorProps {
  initialRecipe?: Recipe;
  initialImportUrl?: string;
  collections?: Collection[];
  userIngredients?: DictionaryIngredient[];
  onSave: (recipe: Recipe) => void;
  onCancel: () => void;
}

export interface IngredientRow {
  id: string;
  isHeading: boolean;
  headingText?: string;
  raw: string;
  ingredientId?: string;
  note?: string;
  scalable?: boolean;
}

export interface DirectionRow {
  id: string;
  isHeading: boolean;
  headingText?: string;
  text: string;
  note?: string;
  showNote?: boolean;
  timers?: StepTimer[];
  photoId?: string;
}

interface DraftState {
  savedAt: number;
  title: string;
  description: string;
  servings: number;
  prepMinutes?: number;
  cookMinutes?: number;
  courses: string[];
  tags?: string[];
  selectedCollectionIds: string[];
  notes: string;
  rating: RecipeRating;
  sourceUrl: string;
  sourceName: string;
  ingredients: IngredientRow[];
  directions: DirectionRow[];
}

const buildInitialIngredients = (recipe?: Recipe): IngredientRow[] => {
  if (!recipe || !recipe.ingredientGroups || recipe.ingredientGroups.length === 0) {
    return [{ id: "ing-1", isHeading: false, raw: "" }];
  }
  const rows: IngredientRow[] = [];
  for (const group of recipe.ingredientGroups) {
    if (group.heading) {
      rows.push({
        id: `hdr-ing-${Math.random().toString(36).slice(2, 8)}`,
        isHeading: true,
        headingText: group.heading,
        raw: ""
      });
    }
    for (const item of group.items) {
      rows.push({
        id: item.id || `ing-${Math.random().toString(36).slice(2, 8)}`,
        isHeading: false,
        raw: item.raw,
        ingredientId: item.ingredientId,
        note: item.note,
        scalable: item.scalable
      });
    }
  }
  return rows.length > 0 ? rows : [{ id: "ing-1", isHeading: false, raw: "" }];
};

const buildInitialDirections = (recipe?: Recipe): DirectionRow[] => {
  if (!recipe || !recipe.directionGroups || recipe.directionGroups.length === 0) {
    return [{ id: "step-1", isHeading: false, text: "", showNote: false }];
  }
  const rows: DirectionRow[] = [];
  for (const group of recipe.directionGroups) {
    if (group.heading) {
      rows.push({
        id: `hdr-dir-${Math.random().toString(36).slice(2, 8)}`,
        isHeading: true,
        headingText: group.heading,
        text: ""
      });
    }
    for (const step of group.steps) {
      rows.push({
        id: step.id || `step-${Math.random().toString(36).slice(2, 8)}`,
        isHeading: false,
        text: step.text,
        note: step.note,
        showNote: Boolean(step.note),
        timers: step.timers,
        photoId: step.photoId
      });
    }
  }
  return rows.length > 0 ? rows : [{ id: "step-1", isHeading: false, text: "", showNote: false }];
};

export const RecipeEditor: FC<RecipeEditorProps> = ({
  initialRecipe,
  initialImportUrl,
  collections,
  onSave,
  onCancel
}): ReactElement => {
  const draftKey = `openrecipebook_draft_${initialRecipe?.id || "new"}`;

  const [title, setTitle] = useState<string>(initialRecipe?.title || "");
  const [description, setDescription] = useState<string>(initialRecipe?.description || "");
  const [servings, setServings] = useState<number>(initialRecipe?.servings || 4);
  const [prepMinutes, setPrepMinutes] = useState<number | undefined>(initialRecipe?.prepMinutes);
  const [cookMinutes, setCookMinutes] = useState<number | undefined>(initialRecipe?.cookMinutes);
  const [courses, setCourses] = useState<string[]>(() => {
    if (initialRecipe?.courses && initialRecipe.courses.length > 0) {
      return [...initialRecipe.courses];
    }
    return ["Dinner"];
  });
  const [tags, setTags] = useState<string[]>(initialRecipe?.tags || []);
  const [customTagInput, setCustomTagInput] = useState<string>("");
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>(initialRecipe?.collectionIds || []);
  const [notes, setNotes] = useState<string>(initialRecipe?.notes || "");
  const [rating, setRating] = useState<RecipeRating>(initialRecipe?.rating || 0);
  const [sourceUrl, setSourceUrl] = useState<string>(initialRecipe?.sourceUrl || "");
  const [sourceName, setSourceName] = useState<string>(initialRecipe?.sourceName || "");

  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => buildInitialIngredients(initialRecipe));
  const [directions, setDirections] = useState<DirectionRow[]>(() => buildInitialDirections(initialRecipe));

  const [showDiscardConfirm, setShowDiscardConfirm] = useState<boolean>(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(false);

  // Quick import state
  const [showUrlModal, setShowUrlModal] = useState<boolean>(Boolean(initialImportUrl));
  const [importUrl, setImportUrl] = useState<string>(initialImportUrl || "");
  const [isFetchingUrl, setIsFetchingUrl] = useState<boolean>(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [showUrlFallback, setShowUrlFallback] = useState<boolean>(false);
  const [pastedHtmlSource, setPastedHtmlSource] = useState<string>("");

  const [showPasteModal, setShowPasteModal] = useState<boolean>(false);
  const [pastedBlob, setPastedBlob] = useState<string>("");

  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Draft restoration on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(draftKey);
      if (!stored) return;
      const parsed: DraftState = JSON.parse(stored);
      const initialUpdatedAt = initialRecipe ? new Date(initialRecipe.updatedAt).getTime() : 0;
      if (parsed.savedAt && parsed.savedAt > initialUpdatedAt) {
        setTitle(parsed.title);
        setDescription(parsed.description);
        setServings(parsed.servings);
        setPrepMinutes(parsed.prepMinutes);
        setCookMinutes(parsed.cookMinutes);
        if (parsed.courses && parsed.courses.length > 0) {
          setCourses(parsed.courses);
        } else if ((parsed as unknown as { course?: string }).course) {
          setCourses([(parsed as unknown as { course: string }).course]);
        }
        if (parsed.tags && parsed.tags.length > 0) {
          setTags(parsed.tags);
        }
        setSelectedCollectionIds(parsed.selectedCollectionIds);
        setNotes(parsed.notes);
        setRating(parsed.rating);
        setSourceUrl(parsed.sourceUrl);
        setSourceName(parsed.sourceName);
        if (parsed.ingredients && parsed.ingredients.length > 0) {
          setIngredients(parsed.ingredients);
        }
        if (parsed.directions && parsed.directions.length > 0) {
          setDirections(parsed.directions);
        }
        setHasRestoredDraft(true);
      }
    } catch {
      // Ignore invalid local draft
    }
  }, [draftKey, initialRecipe]);

  // Draft autosave on change
  useEffect(() => {
    const draft: DraftState = {
      savedAt: Date.now(),
      title,
      description,
      servings,
      prepMinutes,
      cookMinutes,
      courses,
      tags,
      selectedCollectionIds,
      notes,
      rating,
      sourceUrl,
      sourceName,
      ingredients,
      directions
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch {
      // LocalStorage full or blocked
    }
  }, [
    draftKey,
    title,
    description,
    servings,
    prepMinutes,
    cookMinutes,
    courses,
    tags,
    selectedCollectionIds,
    notes,
    rating,
    sourceUrl,
    sourceName,
    ingredients,
    directions
  ]);

  const populateFromParsedRecipe = (recipe: Partial<Recipe>): void => {
    if (recipe.title) setTitle(recipe.title);
    if (recipe.description) setDescription(recipe.description);
    if (recipe.servings) setServings(recipe.servings);
    if (recipe.prepMinutes !== undefined) setPrepMinutes(recipe.prepMinutes);
    if (recipe.cookMinutes !== undefined) setCookMinutes(recipe.cookMinutes);
    if (recipe.courses && recipe.courses.length > 0) setCourses(recipe.courses);
    if (recipe.tags && recipe.tags.length > 0) setTags(recipe.tags);
    if (recipe.sourceUrl) setSourceUrl(recipe.sourceUrl);
    if (recipe.sourceName) setSourceName(recipe.sourceName);
    if (recipe.notes) setNotes(recipe.notes);

    if (recipe.ingredientGroups && recipe.ingredientGroups.length > 0) {
      const newIngs: IngredientRow[] = [];
      for (const group of recipe.ingredientGroups) {
        if (group.heading) {
          newIngs.push({
            id: `hdr-ing-${Math.random().toString(36).slice(2, 8)}`,
            isHeading: true,
            headingText: group.heading,
            raw: ""
          });
        }
        for (const item of group.items) {
          newIngs.push({
            id: item.id || `ing-${Math.random().toString(36).slice(2, 8)}`,
            isHeading: false,
            raw: item.raw,
            ingredientId: item.ingredientId,
            note: item.note,
            scalable: item.scalable
          });
        }
      }
      setIngredients(newIngs.length > 0 ? newIngs : [{ id: "ing-1", isHeading: false, raw: "" }]);
    }

    if (recipe.directionGroups && recipe.directionGroups.length > 0) {
      const newDirs: DirectionRow[] = [];
      for (const group of recipe.directionGroups) {
        if (group.heading) {
          newDirs.push({
            id: `hdr-dir-${Math.random().toString(36).slice(2, 8)}`,
            isHeading: true,
            headingText: group.heading,
            text: ""
          });
        }
        for (const step of group.steps) {
          newDirs.push({
            id: step.id || `step-${Math.random().toString(36).slice(2, 8)}`,
            isHeading: false,
            text: step.text,
            note: step.note,
            showNote: Boolean(step.note),
            timers: step.timers,
            photoId: step.photoId
          });
        }
      }
      setDirections(newDirs.length > 0 ? newDirs : [{ id: "step-1", isHeading: false, text: "", showNote: false }]);
    }
  };

  useEffect(() => {
    if (initialImportUrl && !initialRecipe) {
      setImportUrl(initialImportUrl);
      setShowUrlModal(true);
      setUrlError(null);
      setShowUrlFallback(false);
    }
  }, [initialImportUrl, initialRecipe]);

  const applyParsedPlainText = (rawText: string, overrideSourceUrl?: string): void => {
    const parsed = parsePlainTextRecipe(rawText);
    populateFromParsedRecipe({
      title: parsed.title && parsed.title !== "Untitled Recipe" ? parsed.title : undefined,
      description: parsed.description,
      servings: parsed.servings,
      prepMinutes: parsed.prepMinutes,
      cookMinutes: parsed.cookMinutes,
      sourceUrl: overrideSourceUrl || parsed.sourceUrl,
      notes: parsed.notes,
      ingredientGroups: parsed.ingredientGroups.map((group) => ({
        heading: group.heading,
        items: group.items.map((itemRaw) => ({
          id: `ing-${Math.random().toString(36).slice(2, 8)}`,
          raw: itemRaw,
          name: itemRaw,
          scalable: true
        }))
      })),
      directionGroups: parsed.directionGroups.map((group) => ({
        heading: group.heading,
        steps: group.steps.map((stepText) => ({
          id: `step-${Math.random().toString(36).slice(2, 8)}`,
          text: stepText
        }))
      }))
    });
  };

  const handleFetchUrl = async (): Promise<void> => {
    if (!importUrl.trim()) return;
    setIsFetchingUrl(true);
    setUrlError(null);
    setShowUrlFallback(false);

    try {
      const result = await importRecipesFromUrl(importUrl.trim());
      if (result.ok && result.recipes.length > 0) {
        populateFromParsedRecipe(result.recipes[0]);
        setShowUrlModal(false);
        setImportUrl("");
      } else {
        setShowUrlFallback(true);
        setUrlError(result.error || "Could not extract recipe automatically. Paste the recipe text below.");
      }
    } catch (err: unknown) {
      setShowUrlFallback(true);
      setUrlError(err instanceof Error ? err.message : "Failed to fetch webpage. Paste the recipe text below.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleParsePastedHtml = (): void => {
    if (!pastedHtmlSource.trim()) return;
    const trimmedSourceUrl = importUrl.trim() || undefined;
    const looksLikeHtmlOrJson = /<script\b|<html\b|itemtype\s*=|"@type"\s*:\s*"Recipe"/i.test(pastedHtmlSource);
    if (looksLikeHtmlOrJson) {
      const recipes = extractRecipesFromHtml(pastedHtmlSource);
      if (recipes.length > 0) {
        const rec = recipes[0];
        if (trimmedSourceUrl) rec.sourceUrl = trimmedSourceUrl;
        populateFromParsedRecipe(rec);
        setShowUrlModal(false);
        setPastedHtmlSource("");
        setImportUrl("");
        setShowUrlFallback(false);
        return;
      }
    }
    const plain = parsePlainTextRecipe(pastedHtmlSource);
    const hasPlainItems =
      plain.ingredientGroups.some((g) => g.items.length > 0) ||
      plain.directionGroups.some((g) => g.steps.length > 0);
    if (hasPlainItems) {
      applyParsedPlainText(pastedHtmlSource, trimmedSourceUrl);
      setShowUrlModal(false);
      setPastedHtmlSource("");
      setImportUrl("");
      setShowUrlFallback(false);
      return;
    }
    setUrlError("Could not detect ingredients or instructions in the pasted content.");
  };

  const handleApplyPasteAll = (): void => {
    if (!pastedBlob.trim()) {
      setShowPasteModal(false);
      return;
    }
    applyParsedPlainText(pastedBlob);
    setShowPasteModal(false);
    setPastedBlob("");
  };

  const handleTextFileSelected = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>): void => {
      const text = typeof event.target?.result === "string" ? event.target.result : "";
      if (text) {
        const parsed = parsePlainTextRecipe(text);
        populateFromParsedRecipe({
          title: parsed.title && parsed.title !== "Untitled Recipe" ? parsed.title : undefined,
          description: parsed.description,
          servings: parsed.servings,
          prepMinutes: parsed.prepMinutes,
          cookMinutes: parsed.cookMinutes,
          sourceUrl: parsed.sourceUrl,
          notes: parsed.notes,
          ingredientGroups: parsed.ingredientGroups.map((group) => ({
            heading: group.heading,
            items: group.items.map((itemRaw) => ({
              id: `ing-${Math.random().toString(36).slice(2, 8)}`,
              raw: itemRaw,
              name: itemRaw,
              scalable: true
            }))
          })),
          directionGroups: parsed.directionGroups.map((group) => ({
            heading: group.heading,
            steps: group.steps.map((stepText) => ({
              id: `step-${Math.random().toString(36).slice(2, 8)}`,
              text: stepText
            }))
          }))
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePhotoFileSelected = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrStatus("Photo selected. Review and adjust parsed details.");
    setTimeout((): void => {
      setOcrStatus(null);
    }, 4000);
    e.target.value = "";
  };

  // Ingredient actions
  const addIngredientRow = (): void => {
    setIngredients((prev) => [
      ...prev,
      { id: `ing-${Math.random().toString(36).slice(2, 8)}`, isHeading: false, raw: "" }
    ]);
  };

  const addIngredientHeading = (): void => {
    setIngredients((prev) => [
      ...prev,
      { id: `hdr-ing-${Math.random().toString(36).slice(2, 8)}`, isHeading: true, headingText: "", raw: "" }
    ]);
  };

  const updateIngredientRow = (index: number, patch: Partial<IngredientRow>): void => {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const deleteIngredientRow = (index: number): void => {
    setIngredients((prev) => {
      if (prev.length <= 1) return [{ id: "ing-1", isHeading: false, raw: "" }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveIngredientRow = (from: number, to: number): void => {
    setIngredients((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const updated = [...prev];
      const [item] = updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  };

  // Direction actions
  const addDirectionRow = (): void => {
    setDirections((prev) => [
      ...prev,
      { id: `step-${Math.random().toString(36).slice(2, 8)}`, isHeading: false, text: "", showNote: false }
    ]);
  };

  const addDirectionHeading = (): void => {
    setDirections((prev) => [
      ...prev,
      { id: `hdr-dir-${Math.random().toString(36).slice(2, 8)}`, isHeading: true, headingText: "", text: "" }
    ]);
  };

  const updateDirectionRow = (index: number, patch: Partial<DirectionRow>): void => {
    setDirections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  const deleteDirectionRow = (index: number): void => {
    setDirections((prev) => {
      if (prev.length <= 1) return [{ id: "step-1", isHeading: false, text: "", showNote: false }];
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveDirectionRow = (from: number, to: number): void => {
    setDirections((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const updated = [...prev];
      const [item] = updated.splice(from, 1);
      updated.splice(to, 0, item);
      return updated;
    });
  };

  const handleSubmit = (e?: FormEvent): void => {
    if (e) e.preventDefault();
    if (!title.trim()) return;

    const ingredientGroups: IngredientGroup[] = [];
    let currentGroupHeading: string | undefined = undefined;
    let currentGroupItems: Ingredient[] = [];

    for (const row of ingredients) {
      if (row.isHeading) {
        if (currentGroupItems.length > 0) {
          ingredientGroups.push({ heading: currentGroupHeading, items: currentGroupItems });
          currentGroupItems = [];
        }
        currentGroupHeading = row.headingText?.trim() || undefined;
      } else {
        const trimmed = row.raw.trim();
        if (!trimmed) continue;
        const parsed = parseIngredient(trimmed);
        currentGroupItems.push({
          ...parsed.ingredient,
          id: row.id,
          raw: trimmed,
          note: row.note ?? parsed.ingredient.note,
          ingredientId: row.ingredientId ?? parsed.ingredient.ingredientId,
          scalable: row.scalable ?? parsed.ingredient.scalable
        });
      }
    }
    if (currentGroupItems.length > 0 || ingredientGroups.length === 0) {
      ingredientGroups.push({ heading: currentGroupHeading, items: currentGroupItems });
    }

    const directionGroups: DirectionGroup[] = [];
    let currentDirHeading: string | undefined = undefined;
    let currentDirSteps: Step[] = [];

    for (const row of directions) {
      if (row.isHeading) {
        if (currentDirSteps.length > 0) {
          directionGroups.push({ heading: currentDirHeading, steps: currentDirSteps });
          currentDirSteps = [];
        }
        currentDirHeading = row.headingText?.trim() || undefined;
      } else {
        const trimmed = row.text.trim();
        if (!trimmed) continue;
        currentDirSteps.push({
          id: row.id,
          text: trimmed,
          note: row.note?.trim() || undefined,
          timers: row.timers,
          photoId: row.photoId
        });
      }
    }
    if (currentDirSteps.length > 0 || directionGroups.length === 0) {
      directionGroups.push({ heading: currentDirHeading, steps: currentDirSteps });
    }

    const recipeToSave: Recipe = {
      id: initialRecipe?.id || `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      description: description.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      sourceName: sourceName.trim() || undefined,
      servings: servings || 4,
      prepMinutes,
      cookMinutes,
      ingredientGroups,
      directionGroups,
      notes: notes.trim() || undefined,
      cookLog: initialRecipe?.cookLog || [],
      courses: courses.length > 0 ? courses : ["Dinner"],
      categories: initialRecipe?.categories || [],
      collectionIds: selectedCollectionIds,
      tags: tags,
      rating,
      favorite: initialRecipe?.favorite || false,
      photoIds: initialRecipe?.photoIds || [],
      disallowedSubstitutions: initialRecipe?.disallowedSubstitutions || {},
      createdAt: initialRecipe?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1
    };

    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }

    onSave(normalizeRecipe(recipeToSave));
  };

  const handleCancelClick = (): void => {
    const hasChanges = Boolean(
      title.trim() ||
      description.trim() ||
      ingredients.some((i) => i.raw.trim() || i.headingText?.trim()) ||
      directions.some((d) => d.text.trim() || d.headingText?.trim())
    );

    if (hasChanges) {
      setShowDiscardConfirm(true);
    } else {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // Ignore
      }
      onCancel();
    }
  };

  const handleConfirmDiscard = (): void => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }
    setShowDiscardConfirm(false);
    onCancel();
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md"
        style={{ display: "none" }}
        onChange={handleTextFileSelected}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={handlePhotoFileSelected}
      />

      {/* Import shortcuts toolbar */}
      <div className={styles.importToolbar}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(): void => setShowUrlModal(true)}
        >
          <LinkIcon width={14} height={14} /> Import Link
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(): void => setShowPasteModal(true)}
        >
          <FileTextIcon width={14} height={14} /> Paste Text
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(): void => fileInputRef.current?.click()}
        >
          <FileTextIcon width={14} height={14} /> Text File
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={(): void => photoInputRef.current?.click()}
        >
          <CameraIcon width={14} height={14} /> Scan Photo
        </Button>
        {hasRestoredDraft && (
          <span className={styles.draftBadge}>Restored unsaved draft</span>
        )}
      </div>

      {ocrStatus && (
        <div className={styles.draftBadge}>
          {ocrStatus}
        </div>
      )}

      {/* Recipe Title */}
      <input
        type="text"
        className={styles.titleInput}
        placeholder="Recipe title (required)"
        value={title}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => setTitle(e.target.value)}
        required
      />

      {/* Meta Grid */}
      <div className={styles.section}>
        <div className={styles.metaGrid}>
          <div className={styles.metaField}>
            <label className={styles.label} htmlFor="recipe-servings">Servings</label>
            <input
              id="recipe-servings"
              className={styles.input}
              type="number"
              min={1}
              value={servings}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setServings(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className={styles.metaField}>
            <label className={styles.label} htmlFor="recipe-prep-min">Prep (min)</label>
            <input
              id="recipe-prep-min"
              className={styles.input}
              type="number"
              min={0}
              value={prepMinutes ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setPrepMinutes(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
            />
          </div>
          <div className={styles.metaField}>
            <label className={styles.label} htmlFor="recipe-cook-min">Cook (min)</label>
            <input
              id="recipe-cook-min"
              className={styles.input}
              type="number"
              min={0}
              value={cookMinutes ?? ""}
              onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                setCookMinutes(e.target.value ? parseInt(e.target.value, 10) : undefined)
              }
            />
          </div>
          <div className={styles.metaField} style={{ gridColumn: "1 / -1" }}>
            <label className={styles.label}>Meal Categories & Slots</label>
            <div className={styles.tagChipRow}>
              {(["Breakfast", "Lunch", "Dinner", "Snack", "Dessert", "Appetizer", "Side Dish", "Drink"] as const).map(
                (cat: string): ReactElement => {
                  const isSelected = courses.some((c: string): boolean => c.toLowerCase() === cat.toLowerCase());

                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.tagToggleChip} ${isSelected ? styles.tagToggleChipActive : ""}`}
                      onClick={(): void => {
                        if (isSelected) {
                          setCourses(courses.filter((c: string): boolean => c.toLowerCase() !== cat.toLowerCase()));
                        } else {
                          setCourses([...courses, cat]);
                        }
                      }}
                    >
                      <span>{cat}</span>
                      {isSelected ? <CheckIcon width={12} height={12} /> : <span>+</span>}
                    </button>
                  );
                }
              )}
            </div>

            {/* Custom tags */}
            {tags.length > 0 && (
              <div className={styles.tagChipRow} style={{ marginTop: 6 }}>
                {tags.map((t: string): ReactElement => (
                  <span key={t} className={styles.customTagChip}>
                    #{t}
                    <button
                      type="button"
                      className={styles.tagRemoveBtn}
                      onClick={(): void => setTags(tags.filter((item: string): boolean => item !== t))}
                      aria-label={`Remove tag ${t}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className={styles.addTagRow}>
              <input
                type="text"
                className={styles.addTagInput}
                placeholder="Add custom tag (e.g. quick, holiday)..."
                value={customTagInput}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setCustomTagInput(e.target.value)}
                onKeyDown={(e): void => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const trimmed = customTagInput.trim().toLowerCase();
                    if (trimmed && !tags.includes(trimmed)) {
                      setTags([...tags, trimmed]);
                      setCustomTagInput("");
                    }
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={(): void => {
                  const trimmed = customTagInput.trim().toLowerCase();
                  if (trimmed && !tags.includes(trimmed)) {
                    setTags([...tags, trimmed]);
                    setCustomTagInput("");
                  }
                }}
              >
                Add Tag
              </Button>
            </div>
          </div>
          <div className={styles.metaField}>
            <label className={styles.label} htmlFor="recipe-rating">Rating</label>
            <select
              id="recipe-rating"
              className={styles.input}
              value={rating}
              onChange={(e: ChangeEvent<HTMLSelectElement>): void =>
                setRating((parseInt(e.target.value, 10) || 0) as RecipeRating)
              }
            >
              <option value={0}>No rating</option>
              <option value={1}>1 star</option>
              <option value={2}>2 stars</option>
              <option value={3}>3 stars</option>
              <option value={4}>4 stars</option>
              <option value={5}>5 stars</option>
            </select>
          </div>
        </div>

        {/* Collections */}
        {collections && collections.length > 0 && (
          <div className={styles.metaField}>
            <span className={styles.label}>Collections</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {collections.map((col: Collection) => {
                const isSelected = selectedCollectionIds.includes(col.id);
                return (
                  <Button
                    key={col.id}
                    type="button"
                    variant={isSelected ? "primary" : "secondary"}
                    size="sm"
                    onClick={(): void => {
                      if (isSelected) {
                        setSelectedCollectionIds((prev) => prev.filter((id) => id !== col.id));
                      } else {
                        setSelectedCollectionIds((prev) => [...prev, col.id]);
                      }
                    }}
                  >
                    {isSelected && <CheckIcon width={12} height={12} />}
                    {col.name}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Ingredients Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Ingredients</h2>
        </div>

        {ingredients.map((item, idx) => {
          if (item.isHeading) {
            return (
              <div key={item.id} className={styles.headingRow}>
                <input
                  type="text"
                  className={styles.headingInput}
                  placeholder="Section heading (e.g. Marinade, Sauce)..."
                  value={item.headingText || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    updateIngredientRow(idx, { headingText: e.target.value })
                  }
                />
                <div className={styles.rowActions}>
                  <IconButton
                    icon={<ChevronUp width={16} height={16} />}
                    aria-label="Move section up"
                    size="sm"
                    disabled={idx === 0}
                    onClick={(): void => moveIngredientRow(idx, idx - 1)}
                  />
                  <IconButton
                    icon={<ChevronDown width={16} height={16} />}
                    aria-label="Move section down"
                    size="sm"
                    disabled={idx === ingredients.length - 1}
                    onClick={(): void => moveIngredientRow(idx, idx + 1)}
                  />
                  <IconButton
                    icon={<TrashIcon width={16} height={16} />}
                    aria-label="Delete section"
                    size="sm"
                    onClick={(): void => deleteIngredientRow(idx)}
                  />
                </div>
              </div>
            );
          }

          const parsed = item.raw.trim() ? parseIngredient(item.raw.trim()) : null;
          const qtyStr = parsed?.ingredient.quantity
            ? (parsed.ingredient.quantity.kind === "single"
                ? String(parsed.ingredient.quantity.value)
                : `${parsed.ingredient.quantity.min}-${parsed.ingredient.quantity.max}`)
            : null;

          return (
            <div key={item.id} className={styles.rowItem}>
              <div className={styles.rowContent}>
                <input
                  type="text"
                  className={styles.rowInput}
                  placeholder="e.g. 2 cups all-purpose flour, sifted"
                  value={item.raw}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    updateIngredientRow(idx, { raw: e.target.value })
                  }
                />
                {parsed && item.raw.trim() && (
                  <div className={styles.parseChips}>
                    {qtyStr && <span className={styles.parseChip}>Qty: {qtyStr}</span>}
                    {parsed.ingredient.unit && (
                      <span className={styles.parseChip}>Unit: {parsed.ingredient.unit}</span>
                    )}
                    {parsed.ingredient.name && (
                      <span className={styles.parseChip}>Item: {parsed.ingredient.name}</span>
                    )}
                  </div>
                )}
              </div>
              <div className={styles.rowActions}>
                <IconButton
                  icon={<ChevronUp width={16} height={16} />}
                  aria-label="Move ingredient up"
                  size="sm"
                  disabled={idx === 0}
                  onClick={(): void => moveIngredientRow(idx, idx - 1)}
                />
                <IconButton
                  icon={<ChevronDown width={16} height={16} />}
                  aria-label="Move ingredient down"
                  size="sm"
                  disabled={idx === ingredients.length - 1}
                  onClick={(): void => moveIngredientRow(idx, idx + 1)}
                />
                <IconButton
                  icon={<TrashIcon width={16} height={16} />}
                  aria-label="Delete ingredient"
                  size="sm"
                  onClick={(): void => deleteIngredientRow(idx)}
                />
              </div>
            </div>
          );
        })}

        <div className={styles.sectionActions}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addIngredientRow}
          >
            <PlusIcon width={14} height={14} /> Add Ingredient
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addIngredientHeading}
          >
            <PlusIcon width={14} height={14} /> Add Heading
          </Button>
        </div>
      </div>

      {/* Directions Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Directions</h2>
        </div>

        {directions.map((step, idx) => {
          if (step.isHeading) {
            return (
              <div key={step.id} className={styles.headingRow}>
                <input
                  type="text"
                  className={styles.headingInput}
                  placeholder="Section heading (e.g. Dough, Frosting)..."
                  value={step.headingText || ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                    updateDirectionRow(idx, { headingText: e.target.value })
                  }
                />
                <div className={styles.rowActions}>
                  <IconButton
                    icon={<ChevronUp width={16} height={16} />}
                    aria-label="Move section up"
                    size="sm"
                    disabled={idx === 0}
                    onClick={(): void => moveDirectionRow(idx, idx - 1)}
                  />
                  <IconButton
                    icon={<ChevronDown width={16} height={16} />}
                    aria-label="Move section down"
                    size="sm"
                    disabled={idx === directions.length - 1}
                    onClick={(): void => moveDirectionRow(idx, idx + 1)}
                  />
                  <IconButton
                    icon={<TrashIcon width={16} height={16} />}
                    aria-label="Delete section"
                    size="sm"
                    onClick={(): void => deleteDirectionRow(idx)}
                  />
                </div>
              </div>
            );
          }

          return (
            <div key={step.id} className={styles.rowItem}>
              <div className={styles.rowContent}>
                <textarea
                  className={styles.stepTextarea}
                  placeholder={`Step ${idx + 1}...`}
                  value={step.text}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>): void =>
                    updateDirectionRow(idx, { text: e.target.value })
                  }
                />
                {step.showNote && (
                  <div className={styles.noteRow}>
                    <input
                      type="text"
                      className={styles.noteInput}
                      placeholder="Step note or tip..."
                      value={step.note || ""}
                      onChange={(e: ChangeEvent<HTMLInputElement>): void =>
                        updateDirectionRow(idx, { note: e.target.value })
                      }
                    />
                  </div>
                )}
              </div>
              <div className={styles.rowActions}>
                <IconButton
                  icon={<FileTextIcon width={16} height={16} />}
                  aria-label="Toggle step note"
                  size="sm"
                  onClick={(): void => updateDirectionRow(idx, { showNote: !step.showNote })}
                />
                <IconButton
                  icon={<ChevronUp width={16} height={16} />}
                  aria-label="Move step up"
                  size="sm"
                  disabled={idx === 0}
                  onClick={(): void => moveDirectionRow(idx, idx - 1)}
                />
                <IconButton
                  icon={<ChevronDown width={16} height={16} />}
                  aria-label="Move step down"
                  size="sm"
                  disabled={idx === directions.length - 1}
                  onClick={(): void => moveDirectionRow(idx, idx + 1)}
                />
                <IconButton
                  icon={<TrashIcon width={16} height={16} />}
                  aria-label="Delete step"
                  size="sm"
                  onClick={(): void => deleteDirectionRow(idx)}
                />
              </div>
            </div>
          );
        })}

        <div className={styles.sectionActions}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addDirectionRow}
          >
            <PlusIcon width={14} height={14} /> Add Step
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addDirectionHeading}
          >
            <PlusIcon width={14} height={14} /> Add Heading
          </Button>
        </div>
      </div>

      {/* Notes & Description */}
      <div className={styles.section}>
        <div className={styles.metaField}>
          <label className={styles.label} htmlFor="recipe-description">Description</label>
          <textarea
            id="recipe-description"
            className={styles.stepTextarea}
            placeholder="Brief summary or background..."
            value={description}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setDescription(e.target.value)}
          />
        </div>
        <div className={styles.metaField}>
          <label className={styles.label} htmlFor="recipe-notes">Cook's Notes</label>
          <textarea
            id="recipe-notes"
            className={styles.stepTextarea}
            placeholder="Serving suggestions, variations, or tips..."
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setNotes(e.target.value)}
          />
        </div>
        <div className={styles.metaGrid}>
          <div className={styles.metaField}>
            <label className={styles.label} htmlFor="recipe-source-url">Source URL</label>
            <input
              id="recipe-source-url"
              type="url"
              className={styles.input}
              placeholder="https://..."
              value={sourceUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setSourceUrl(e.target.value)}
            />
          </div>
          <div className={styles.metaField}>
            <label className={styles.label} htmlFor="recipe-source-name">Credit / Source Name</label>
            <input
              id="recipe-source-name"
              type="text"
              className={styles.input}
              placeholder="e.g. Grandma, Food & Wine"
              value={sourceName}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setSourceName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Sticky Save / Cancel Footer */}
      <div className={styles.stickyFooter}>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancelClick}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={(): void => handleSubmit()}
          disabled={!title.trim()}
        >
          Save Recipe
        </Button>
      </div>

      {/* Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDiscardConfirm}
        title="Discard changes?"
        message="You have unsaved changes. Leaving now will discard your edits."
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        isDanger={true}
        onConfirm={handleConfirmDiscard}
        onCancel={(): void => setShowDiscardConfirm(false)}
      />

      {/* URL Import Dialog */}
      <Dialog
        isOpen={showUrlModal}
        title="Import Recipe from URL"
        onClose={(): void => {
          setShowUrlModal(false);
          setUrlError(null);
          setShowUrlFallback(false);
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem" }}>
            Paste a recipe webpage URL to extract ingredients and directions automatically.
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="url"
              className={styles.input}
              placeholder="https://example.com/recipe"
              value={importUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setImportUrl(e.target.value)}
              disabled={isFetchingUrl}
              style={{ flex: 1 }}
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleFetchUrl}
              disabled={isFetchingUrl || !importUrl.trim()}
            >
              {isFetchingUrl ? "Fetching..." : "Fetch"}
            </Button>
          </div>
          {urlError && (
            <div style={{ color: "var(--danger)", fontSize: "0.875rem" }}>
              {urlError}
            </div>
          )}
          {showUrlFallback && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                Fallback: select and copy the recipe text on the website (or page HTML source) and paste it here. The source URL above will be saved automatically.
              </span>
              <textarea
                rows={6}
                className={styles.stepTextarea}
                placeholder={"Paste copied recipe text (Ingredients + Directions) or page HTML source..."}
                value={pastedHtmlSource}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setPastedHtmlSource(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleParsePastedHtml}
                  disabled={!pastedHtmlSource.trim()}
                >
                  Parse Pasted Recipe
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* Plain Text Paste Dialog */}
      <Dialog
        isOpen={showPasteModal}
        title="Paste Recipe Text"
        onClose={(): void => setShowPasteModal(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.875rem" }}>
            Paste recipe text from a website, document, or email. Ingredients and directions will be separated automatically.
          </p>
          <textarea
            rows={10}
            className={styles.stepTextarea}
            placeholder={"Ingredients:\n2 cups flour\n1 cup milk\n\nDirections:\nMix and bake at 350F for 20 minutes."}
            value={pastedBlob}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setPastedBlob(e.target.value)}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={(): void => setShowPasteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleApplyPasteAll}
              disabled={!pastedBlob.trim()}
            >
              Parse & Apply
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
