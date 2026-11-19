import {
  useState,
  useMemo,
  type FC,
  type ReactElement,
  type ChangeEvent
} from "react";
import type {
  Recipe,
  Collection,
  DictionaryIngredient,
  CookLogEntry,
  StepTimer,
  Step,
  Ingredient
} from "../../domain/recipe/types";
import { scaleRecipeServings, convertIngredientSystem } from "../../domain/scaling/scaler";
import { formatTimeMinutes } from "../../domain/recipe/normalize";
import { appendRecipeNote } from "../../domain/recipe/recipeModifier";
import { calculateRecipeNutrition } from "../../domain/nutrition/nutritionCalculator";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";
import { resolvePhotoUrl } from "../../domain/recipe/photoPipeline";
import { getCoursePlaceholder } from "../../domain/recipe/placeholders";
import { parseScaleMultiplier } from "../../domain/scaling/formatQuantity";
import { convertIngredientUnit } from "../../domain/scaling/universalConverter";
import { getSubstitutionsForIngredient } from "../../domain/ingredients/substitutions";
import { parseIngredient } from "../../domain/scaling/parseIngredient";
import { printRecipeDocument } from "../../domain/export/printRecipe";
import {
  ArrowLeft,
  EditIcon,
  HeartIcon,
  MoreIcon,
  ChefHatIcon,
  ClockIcon,
  StarIcon,
  FolderIcon,
  CameraIcon,
  ShoppingCartIcon,
  CalendarIcon,
  LinkIcon,
  PrinterIcon,
  CopyIcon,
  ConvertIcon,
  HistoryIcon,
  DownloadIcon,
  TrashIcon,
  CheckIcon,
  BookOpenIcon
} from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Menu, type MenuItem } from "../../ui/Menu";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { useToast } from "../../ui/Toast";
import { RichText } from "../../ui/RichText";
import { NutritionFactsCard } from "../nutrition/NutritionFactsCard";
import { QuickUnitConverterModal } from "./QuickUnitConverterModal";
import { RecipeHistoryModal } from "./RecipeHistoryModal";
import { FolderAssignmentModal } from "./FolderAssignmentModal";
import { AddToMealPlanModal } from "./AddToMealPlanModal";
import styles from "./RecipeView.module.css";

export interface RecipeViewProps {
  recipe: Recipe;
  collections: Collection[];
  userIngredients: DictionaryIngredient[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onToggleFavorite: () => void;
  onOpenCookMode: (multiplier?: number) => void;
  onAddToShoppingList: () => void;
  onPrintRecipe?: (recipeId: string) => void;
  onUpdateRecipe: (updatedRecipe: Recipe) => Promise<void>;
  onDuplicateRecipe: (clonedRecipe: Recipe) => Promise<void>;
  onSaveCollection: (collection: Collection) => Promise<void>;
}

export const RecipeView: FC<RecipeViewProps> = ({
  recipe,
  collections,
  userIngredients,
  onBack,
  onEdit,
  onDelete,
  onExport,
  onToggleFavorite,
  onOpenCookMode,
  onAddToShoppingList,
  onPrintRecipe,
  onUpdateRecipe,
  onDuplicateRecipe,
  onSaveCollection
}): ReactElement => {
  const { showToast } = useToast();
  const [heroImageFailed, setHeroImageFailed] = useState<boolean>(false);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [scaleInputText, setScaleInputText] = useState<string>("1x");
  const [unitSystem, setUnitSystem] = useState<"US" | "Metric">("US");
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, boolean>>({});
  const [inlineConvertedUnits, setInlineConvertedUnits] = useState<Record<string, { formatted: string; unit: string }>>({});
  const [openUnitSelectorKey, setOpenUnitSelectorKey] = useState<string | null>(null);
  const [openSubstitutionsKey, setOpenSubstitutionsKey] = useState<string | null>(null);
  const [appliedSubstitutions, setAppliedSubstitutions] = useState<Record<string, string>>({});

  const handleApplyInlineUnitConvert = (key: string, line: string, targetUnit: string): void => {
    const parsed = parseIngredient(line).ingredient;
    if (!parsed || !parsed.quantity) return;
    const numValue = parsed.quantity.kind === "single" ? parsed.quantity.value : parsed.quantity.min;
    if (numValue === undefined || isNaN(numValue)) return;
    const fromUnit = parsed.unit || "unit";
    const res = convertIngredientUnit(
      numValue,
      fromUnit,
      targetUnit,
      parsed.name,
      undefined,
      combinedDictionary
    );
    if (res.success) {
      setInlineConvertedUnits((prev) => ({
        ...prev,
        [key]: { formatted: res.formattedAmount, unit: targetUnit }
      }));
      setOpenUnitSelectorKey(null);
    }
  };

  const handleRejectSubstitution = (ingKey: string, ingRaw: string, subName: string): void => {
    const currentDisallowed = { ...(recipe.disallowedSubstitutions || {}) };
    const existing = currentDisallowed[ingKey] || currentDisallowed[ingRaw.toLowerCase()] || [];
    if (!existing.includes(subName)) {
      currentDisallowed[ingKey] = [...existing, subName];
      const updatedRecipe: Recipe = {
        ...recipe,
        disallowedSubstitutions: currentDisallowed
      };
      onUpdateRecipe?.(updatedRecipe);
      showToast(`Disallowed "${subName}" for this recipe`);
    }
  };

  const handleRestoreSubstitutions = (ingKey: string, ingRaw: string): void => {
    const currentDisallowed = { ...(recipe.disallowedSubstitutions || {}) };
    delete currentDisallowed[ingKey];
    delete currentDisallowed[ingRaw.toLowerCase()];
    const updatedRecipe: Recipe = {
      ...recipe,
      disallowedSubstitutions: currentDisallowed
    };
    onUpdateRecipe?.(updatedRecipe);
    showToast(`Restored substitutions for "${ingRaw}"`);
  };
  const [newNoteInput, setNewNoteInput] = useState<string>("");
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [logNotes, setLogNotes] = useState<string>("");
  const [logRating, setLogRating] = useState<number>(5);

  // Modal open states
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [showMealPlanModal, setShowMealPlanModal] = useState<boolean>(false);
  const [showUnitConverterModal, setShowUnitConverterModal] = useState<boolean>(false);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // Mobile collapse toggles
  const [ingredientsCollapsed, setIngredientsCollapsed] = useState<boolean>(false);
  const [nutritionCollapsed, setNutritionCollapsed] = useState<boolean>(true);

  // Scaled recipe calculation
  const scaledRecipe = useMemo((): Recipe => {
    return scaleRecipeServings(recipe, multiplier);
  }, [recipe, multiplier]);

  // Combined dictionary for nutrition
  const combinedDictionary = useMemo((): DictionaryIngredient[] => {
    return [...BUILT_IN_INGREDIENTS, ...userIngredients];
  }, [userIngredients]);

  // Calculated nutrition estimate
  const nutritionEstimate = useMemo(() => {
    return calculateRecipeNutrition(recipe, multiplier, combinedDictionary);
  }, [recipe, multiplier, combinedDictionary]);

  const toggleIngredientChecked = (id: string): void => {
    setCheckedIngredients((prev: Record<string, boolean>): Record<string, boolean> => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleAddInlineNote = async (): Promise<void> => {
    const trimmed = newNoteInput.trim();
    if (!trimmed) return;
    const updated = appendRecipeNote(recipe, trimmed);
    await onUpdateRecipe(updated);
    setNewNoteInput("");
    showToast("Note added");
  };

  const handleAddCookLog = async (): Promise<void> => {
    const newEntry: CookLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString(),
      note: logNotes.trim() || undefined,
      rating: logRating
    };
    const updated: Recipe = {
      ...recipe,
      cookLog: [newEntry, ...(recipe.cookLog || [])],
      updatedAt: new Date().toISOString()
    };
    await onUpdateRecipe(updated);
    setShowLogModal(false);
    setLogNotes("");
    showToast("Cook logged!");
  };

  const handleShare = async (): Promise<void> => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.description || `Recipe for ${recipe.title}`,
          url: window.location.href
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }
    await navigator.clipboard.writeText(window.location.href);
    showToast("Link copied to clipboard");
  };

  const menuItems: MenuItem[] = [
    {
      id: "add-shopping",
      label: "Add to shopping list",
      icon: <ShoppingCartIcon width={18} height={18} />,
      onClick: onAddToShoppingList
    },
    {
      id: "add-meal-plan",
      label: "Add to meal plan",
      icon: <CalendarIcon width={18} height={18} />,
      onClick: (): void => setShowMealPlanModal(true)
    },
    {
      id: "manage-folders",
      label: "Folders",
      icon: <FolderIcon width={18} height={18} />,
      onClick: (): void => setShowFolderModal(true)
    },
    {
      id: "share-link",
      label: "Share link",
      icon: <LinkIcon width={18} height={18} />,
      onClick: (): void => {
        void handleShare();
      }
    },
    {
      id: "print-recipe",
      label: "Print & PDF Preview",
      icon: <PrinterIcon width={18} height={18} />,
      onClick: (): void => {
        if (onPrintRecipe) {
          onPrintRecipe(recipe.id);
        } else {
          printRecipeDocument(recipe);
        }
      }
    },
    {
      id: "duplicate-recipe",
      label: "Duplicate",
      icon: <CopyIcon width={18} height={18} />,
      onClick: (): void => {
        const cloned: Recipe = {
          ...recipe,
          id: `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: `${recipe.title} (Copy)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        void onDuplicateRecipe(cloned);
      }
    },
    {
      id: "unit-converter",
      label: "Unit converter",
      icon: <ConvertIcon width={18} height={18} />,
      onClick: (): void => setShowUnitConverterModal(true)
    },
    {
      id: "version-history",
      label: "Version history",
      icon: <HistoryIcon width={18} height={18} />,
      onClick: (): void => setShowHistoryModal(true)
    },
    {
      id: "export-recipe",
      label: "Export JSON",
      icon: <DownloadIcon width={18} height={18} />,
      onClick: onExport
    },
    {
      id: "delete-recipe",
      label: "Delete recipe",
      icon: <TrashIcon width={18} height={18} />,
      danger: true,
      dividerBefore: true,
      onClick: (): void => setShowDeleteConfirm(true)
    }
  ];

  const assignedFolders = useMemo((): Collection[] => {
    if (!recipe.collectionIds) return [];
    return collections.filter((c: Collection): boolean => recipe.collectionIds?.includes(c.id) ?? false);
  }, [collections, recipe.collectionIds]);

  const totalTimeDisplay = formatTimeMinutes(
    recipe.totalMinutes || (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0)
  );

  return (
    <div className={styles.viewContainer}>
      {/* Top Bar: ONE Row that NEVER wraps */}
      <header className={styles.topBar}>
        <IconButton
          variant="ghost"
          icon={<ArrowLeft width={20} height={20} />}
          aria-label="Back to Recipes"
          onClick={onBack}
        />

        <div className={styles.topBarTitle}>{recipe.title}</div>

        <div className={styles.topBarActions}>
          {/* Desktop Cook Mode button */}
          <div style={{ display: "none" }} className="desktop-cook-cta">
            <Button
              variant="primary"
              size="sm"
              icon={<ChefHatIcon width={16} height={16} />}
              onClick={(): void => onOpenCookMode(multiplier)}
            >
              Cook Mode
            </Button>
          </div>

          <IconButton
            variant="ghost"
            icon={<EditIcon width={18} height={18} />}
            aria-label="Edit recipe"
            onClick={onEdit}
          />

          <IconButton
            variant="ghost"
            icon={
              <HeartIcon
                width={20}
                height={20}
                fill={recipe.favorite ? "var(--accent)" : "none"}
                style={{ color: recipe.favorite ? "var(--accent)" : "var(--muted)" }}
              />
            }
            aria-label={recipe.favorite ? "Favorited" : "Favorite"}
            onClick={onToggleFavorite}
          />

          <Menu
            trigger={
              <IconButton
                variant="ghost"
                icon={<MoreIcon width={20} height={20} />}
                aria-label="More options"
              />
            }
            items={menuItems}
          />
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        {recipe.photoIds?.[0] && !heroImageFailed ? (
          <img
            src={resolvePhotoUrl(recipe.photoIds[0])}
            alt={recipe.title}
            className={styles.heroImage}
            onError={(): void => setHeroImageFailed(true)}
          />
        ) : (
          <div
            className={styles.heroFallback}
            style={{ background: getCoursePlaceholder(recipe.courses?.[0]).gradient }}
          >
            <div
              className={styles.heroPlaceholderSvg}
              dangerouslySetInnerHTML={{
                __html: getCoursePlaceholder(recipe.courses?.[0]).svgContent
              }}
            />
          </div>
        )}

        <div className={styles.heroGradient}>
          <h1 className={styles.heroTitle}>{recipe.title}</h1>
          <div className={styles.heroTags}>
            {assignedFolders.map((col: Collection): ReactElement => (
              <span key={col.id} className={styles.folderBadge}>
                <FolderIcon width={14} height={14} />
                {col.name}
              </span>
            ))}
            {recipe.courses?.map((course: string): ReactElement => (
              <span key={course} className={styles.tagBadge}>
                {course}
              </span>
            ))}
          </div>
        </div>

        <IconButton
          variant="secondary"
          size="sm"
          className={styles.heroPhotoButton}
          icon={<CameraIcon width={18} height={18} />}
          aria-label="Recipe photo gallery"
          onClick={(): void => showToast("Photo gallery")}
        />
      </section>

      {/* Meal Category Slot Tagging Bar */}
      <section className={styles.mealSlotStrip} aria-label="Meal slot categories">
        <span className={styles.mealSlotStripLabel}>Meal Slots:</span>
        {(["Breakfast", "Lunch", "Dinner", "Snack"] as const).map((slotName: string): ReactElement => {
          const isSlotActive = (recipe.courses || []).some(
            (c: string): boolean => c.toLowerCase() === slotName.toLowerCase()
          ) || (recipe.categories || []).some(
            (c: string): boolean => c.toLowerCase() === slotName.toLowerCase()
          ) || (recipe.tags || []).some(
            (t: string): boolean => t.toLowerCase() === slotName.toLowerCase()
          );

          const renderCategoryIcon = (): ReactElement => {
            if (slotName === "Breakfast") return <BookOpenIcon width={13} height={13} />;
            if (slotName === "Lunch") return <ClockIcon width={13} height={13} />;
            if (slotName === "Dinner") return <ChefHatIcon width={13} height={13} />;
            return <StarIcon width={13} height={13} />;
          };

          return (
            <button
              key={slotName}
              type="button"
              className={`${styles.mealSlotChip} ${isSlotActive ? styles.mealSlotChipActive : ""}`}
              onClick={async (): Promise<void> => {
                const currentCourses = recipe.courses || [];
                let nextCourses: string[];
                if (isSlotActive) {
                  nextCourses = currentCourses.filter(
                    (c: string): boolean => c.toLowerCase() !== slotName.toLowerCase()
                  );
                  showToast(`Removed "${slotName}" tag`);
                } else {
                  nextCourses = [...currentCourses, slotName];
                  showToast(`Tagged as "${slotName}"`);
                }
                await onUpdateRecipe({
                  ...recipe,
                  courses: nextCourses,
                  updatedAt: new Date().toISOString()
                });
              }}
              title={`Click to ${isSlotActive ? "remove" : "add"} ${slotName} tag`}
            >
              <span>{renderCategoryIcon()}</span>
              <span>{slotName}</span>
              <span className={styles.slotChipStatus}>
                {isSlotActive ? <CheckIcon width={11} height={11} /> : "+"}
              </span>
            </button>
          );
        })}
      </section>

      {/* Meta Strip */}
      <section className={styles.metaContainer}>
        <div className={styles.metaRow}>
          {recipe.prepMinutes !== undefined && recipe.prepMinutes > 0 && (
            <div className={styles.metaItem}>
              <span>Prep:</span>
              <strong>{formatTimeMinutes(recipe.prepMinutes)}</strong>
            </div>
          )}
          {recipe.cookMinutes !== undefined && recipe.cookMinutes > 0 && (
            <div className={styles.metaItem}>
              <span>Cook:</span>
              <strong>{formatTimeMinutes(recipe.cookMinutes)}</strong>
            </div>
          )}
          {totalTimeDisplay && (
            <div className={styles.metaItem}>
              <ClockIcon width={14} height={14} />
              <span>Total:</span>
              <strong>{totalTimeDisplay}</strong>
            </div>
          )}
          <div className={styles.metaItem}>
            <span>Servings:</span>
            <strong>
              {Math.round((recipe.servings || 4) * multiplier)} {recipe.servingsLabel || "servings"}
            </strong>
          </div>
          {recipe.rating !== undefined && recipe.rating > 0 && (
            <div className={styles.metaItem} style={{ color: "var(--accent)" }}>
              <StarIcon width={15} height={15} fill="currentColor" />
              <strong>{recipe.rating}/5</strong>
            </div>
          )}
        </div>

        {/* Controls Row */}
        <div className={styles.controlsRow}>
          <div className={styles.controlsGroup}>
            <span style={{ fontSize: "0.8125rem", color: "var(--muted)", fontWeight: 600 }}>
              SCALE:
            </span>
            <div className={styles.scaleTyper}>
              <input
                type="text"
                className={styles.scaleInput}
                value={scaleInputText}
                aria-label="Recipe scale multiplier (e.g. 1.22x)"
                onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                  const val = e.target.value;
                  setScaleInputText(val);
                  const parsed = parseScaleMultiplier(val);
                  if (parsed !== null) {
                    setMultiplier(parsed);
                  }
                }}
                onBlur={(): void => {
                  setScaleInputText(`${multiplier}x`);
                }}
              />
            </div>

            <SegmentedControl
              value={multiplier}
              onChange={(val: number): void => {
                setMultiplier(val);
                setScaleInputText(`${val}x`);
              }}
              options={[
                { value: 0.5, label: "1/2x" },
                { value: 1, label: "1x" },
                { value: 2, label: "2x" },
                { value: 3, label: "3x" }
              ]}
            />
          </div>

          <div className={styles.controlsGroup}>
            <SegmentedControl
              value={unitSystem}
              onChange={setUnitSystem}
              options={[
                { value: "US", label: "US" },
                { value: "Metric", label: "Metric" }
              ]}
            />
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className={styles.contentArea}>
        <div className={styles.columnsGrid}>
          {/* 1. INGREDIENTS COLUMN (Sticky on Desktop) */}
          <section className={styles.ingredientsPanel}>
            <div className={styles.sectionTitle}>
              <span>Ingredients</span>
              <button
                type="button"
                onClick={(): void => setIngredientsCollapsed((prev: boolean): boolean => !prev)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {ingredientsCollapsed ? "Show" : "Hide"}
              </button>
            </div>

            {!ingredientsCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {scaledRecipe.ingredientGroups.map((group, gIdx: number): ReactElement => (
                  <div key={gIdx} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.heading && (
                      <h4
                        style={{
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: "var(--muted)",
                          margin: "var(--space-2) 0 4px 0"
                        }}
                      >
                        {group.heading}
                      </h4>
                    )}
                    {group.items.map((ing: Ingredient, iIdx: number): ReactElement => {
                      const ingKey = ing.id || `ing-${gIdx}-${iIdx}`;
                      const baseLine =
                        appliedSubstitutions[ingKey] ||
                        (unitSystem === "Metric" ? convertIngredientSystem(ing.raw, "Metric") : ing.raw);
                      const isChecked = Boolean(checkedIngredients[ingKey]);
                      const parsed = parseIngredient(baseLine).ingredient;
                      const canConvert = Boolean(parsed && parsed.quantity && parsed.unit);
                      const convertedResult = inlineConvertedUnits[ingKey];
                      const rawSubstitutions = getSubstitutionsForIngredient(ing.raw, {
                        courses: recipe.courses,
                        tags: recipe.tags,
                        title: recipe.title
                      });
                      const disallowedMap = recipe.disallowedSubstitutions || {};
                      const rejectedSubs = disallowedMap[ingKey] || disallowedMap[ing.raw.toLowerCase()] || [];
                      const substitutions = rawSubstitutions.filter(
                        (sub) => !rejectedSubs.includes(sub.substituteIngredient)
                      );

                      return (
                        <div key={ingKey} style={{ display: "flex", flexDirection: "column" }}>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 10,
                              padding: "6px 8px",
                              borderRadius: "var(--radius-sm)",
                              background: isChecked ? "var(--surface-alt)" : "transparent",
                              cursor: "pointer",
                              fontSize: "0.9375rem"
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(): void => toggleIngredientChecked(ingKey)}
                              style={{
                                marginTop: 3,
                                width: 17,
                                height: 17,
                                accentColor: "var(--accent)"
                              }}
                            />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  lineHeight: 1.45,
                                  textDecoration: isChecked ? "line-through" : "none",
                                  color: isChecked ? "var(--muted)" : "var(--text)"
                                }}
                              >
                                {baseLine}
                              </span>
                              {convertedResult && (
                                <span className={styles.inlineConvertedResult} style={{ marginLeft: "8px" }}>
                                  = {convertedResult.formatted} {convertedResult.unit}
                                  <button
                                    type="button"
                                    aria-label="Remove converted unit"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "inherit",
                                      cursor: "pointer",
                                      padding: "0 2px"
                                    }}
                                    onClick={(): void => {
                                      setInlineConvertedUnits((prev) => {
                                        const next = { ...prev };
                                        delete next[ingKey];
                                        return next;
                                      });
                                    }}
                                  >
                                    ×
                                  </button>
                                </span>
                              )}
                            </div>
                          </label>

                          {/* Inline Convert and Substitute Actions */}
                          <div className={styles.inlineActionRow}>
                            {canConvert &&
                              (openUnitSelectorKey === ingKey ? (
                                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <select
                                    className={styles.inlineUnitSelect}
                                    aria-label="Select target unit"
                                    defaultValue=""
                                    onChange={(e: ChangeEvent<HTMLSelectElement>): void => {
                                      if (e.target.value) {
                                        handleApplyInlineUnitConvert(ingKey, baseLine, e.target.value);
                                      }
                                    }}
                                  >
                                    <option value="" disabled>
                                      Convert to unit...
                                    </option>
                                    {["g", "ml", "cup", "tbsp", "tsp", "oz", "lb", "kg", "l", "fl oz", "packet", "pinch"].map((u: string) => (
                                      <option key={u} value={u}>
                                        {u}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    className={styles.inlineConvertTrigger}
                                    onClick={(): void => setOpenUnitSelectorKey(null)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className={styles.inlineConvertTrigger}
                                  onClick={(): void => setOpenUnitSelectorKey(ingKey)}
                                >
                                  <ConvertIcon width={12} height={12} /> Convert Unit
                                </button>
                              ))}

                            {(substitutions.length > 0 || rejectedSubs.length > 0) && (
                              <button
                                type="button"
                                className={styles.inlineConvertTrigger}
                                onClick={(): void =>
                                  setOpenSubstitutionsKey(openSubstitutionsKey === ingKey ? null : ingKey)
                                }
                              >
                                {substitutions.length > 0
                                  ? `${substitutions.length} Substitute${substitutions.length > 1 ? "s" : ""}`
                                  : `${rejectedSubs.length} Disallowed`}
                              </button>
                            )}
                          </div>

                          {/* Inline Substitutions Panel */}
                          {openSubstitutionsKey === ingKey && (substitutions.length > 0 || rejectedSubs.length > 0) && (
                            <div className={styles.subCard}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center"
                                }}
                              >
                                <span>Substitutions for: {ing.raw}</span>
                                <button
                                  type="button"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--muted)",
                                    fontSize: "0.875rem"
                                  }}
                                  onClick={(): void => setOpenSubstitutionsKey(null)}
                                >
                                  x
                                </button>
                              </div>

                              {substitutions.map((sub, sIdx: number): ReactElement => {
                                const isGoodGrade = sub.qualityGrade.startsWith("A");
                                const isMediumGrade = sub.qualityGrade.startsWith("B");
                                const badgeBg = isGoodGrade ? "#e8f5e9" : isMediumGrade ? "#fff3e0" : "#ffebee";
                                const badgeColor = isGoodGrade ? "#2e7d32" : isMediumGrade ? "#b26a00" : "#c62828";

                                return (
                                  <div
                                    key={sIdx}
                                    style={{
                                      padding: "8px",
                                      borderRadius: "var(--radius-sm)",
                                      border: "1px solid var(--border)",
                                      background: "var(--surface)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 4
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: 4
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <span
                                          className={styles.subGradeBadge}
                                          style={{ background: badgeBg, color: badgeColor }}
                                        >
                                          Grade {sub.qualityGrade}
                                        </span>
                                        <strong>{sub.substituteIngredient}</strong>
                                      </div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={(): void => {
                                            setAppliedSubstitutions((prev) => ({
                                              ...prev,
                                              [ingKey]: `${sub.substituteIngredient} (substitute for ${ing.raw})`
                                            }));
                                            setOpenSubstitutionsKey(null);
                                          }}
                                        >
                                          Use Sub
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={(): void =>
                                            handleRejectSubstitution(ingKey, ing.raw, sub.substituteIngredient)
                                          }
                                        >
                                          Disallow
                                        </Button>
                                      </div>
                                    </div>

                                    {sub.amountNote && (
                                      <div style={{ fontWeight: 600, color: "var(--warning)", fontSize: "0.75rem" }}>
                                        {sub.amountNote}
                                      </div>
                                    )}
                                    <div style={{ fontSize: "0.75rem", color: "var(--text)" }}>
                                      <strong>Why:</strong> {sub.why}
                                    </div>
                                    <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                      <strong>When:</strong> {sub.when} | <strong>How:</strong> {sub.how}
                                    </div>
                                  </div>
                                );
                              })}

                              {rejectedSubs.length > 0 && (
                                <div
                                  style={{
                                    marginTop: 4,
                                    padding: "6px 8px",
                                    borderRadius: "var(--radius-sm)",
                                    border: "1px dashed var(--border)",
                                    background: "var(--surface-alt)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    fontSize: "0.75rem",
                                    gap: 8
                                  }}
                                >
                                  <span>Disallowed for this recipe: <strong>{rejectedSubs.join(", ")}</strong></span>
                                  <button
                                    type="button"
                                    onClick={(): void => handleRestoreSubstitutions(ingKey, ing.raw)}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--accent)",
                                      cursor: "pointer",
                                      fontWeight: 600,
                                      fontSize: "0.75rem",
                                      textDecoration: "underline"
                                    }}
                                  >
                                    Restore
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* 2. DIRECTIONS COLUMN */}
          <section className={styles.directionsPanel}>
            <h2 className={styles.sectionTitle}>Directions</h2>

            {scaledRecipe.directionGroups.map((group, gIdx: number): ReactElement => (
              <div key={gIdx} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                {group.heading && (
                  <h4
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "var(--accent)",
                      margin: "var(--space-2) 0 0 0"
                    }}
                  >
                    {group.heading}
                  </h4>
                )}

                {group.steps.map((step: Step, sIdx: number): ReactElement => (
                  <div
                    key={step.id || `step-${gIdx}-${sIdx}`}
                    style={{
                      display: "flex",
                      gap: "var(--space-3)",
                      paddingBottom: "var(--space-3)",
                      borderBottom: "1px solid var(--border)"
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "var(--radius-full)",
                        backgroundColor: "var(--surface-alt)",
                        color: "var(--accent)",
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}
                    >
                      {sIdx + 1}
                    </span>

                    <div style={{ flex: 1 }}>
                      <RichText text={step.text} />
                      {step.note && (
                        <div
                          style={{
                            marginTop: 6,
                            padding: "6px 10px",
                            backgroundColor: "var(--surface-alt)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.875rem",
                            color: "var(--muted)"
                          }}
                        >
                          <RichText text={step.note} />
                        </div>
                      )}
                      {step.timers && step.timers.length > 0 && (
                        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                          {step.timers.map((t: StepTimer, tIdx: number): ReactElement => (
                            <span
                              key={tIdx}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "3px 8px",
                                borderRadius: "var(--radius-full)",
                                backgroundColor: "var(--surface-alt)",
                                border: "1px solid var(--border)",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                color: "var(--accent)"
                              }}
                            >
                              <ClockIcon width={12} height={12} />
                              {t.label}: {Math.round(t.seconds / 60)}m
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
        </div>

        {/* FULL WIDTH BOTTOM SECTIONS: 3. Notes, 4. History, 5. Nutrition */}
        <div className={styles.fullWidthBottom}>
          {/* 3. NOTES SECTION */}
          <section className={styles.cardSection}>
            <h3 className={styles.sectionTitle}>Cook&apos;s Notes</h3>
            {recipe.notes ? (
              <RichText text={recipe.notes} />
            ) : (
              <p style={{ color: "var(--muted)", fontStyle: "italic", margin: "0 0 var(--space-3) 0" }}>
                No notes added yet.
              </p>
            )}

            {/* Always-visible Add a note row */}
            <div style={{ display: "flex", gap: 8, marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
              <input
                type="text"
                placeholder="Add a private kitchen note..."
                value={newNoteInput}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewNoteInput(e.target.value)}
                onKeyDown={(e): void => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleAddInlineNote();
                  }
                }}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--text)",
                  fontSize: "0.875rem"
                }}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddInlineNote}
                disabled={!newNoteInput.trim()}
              >
                Add Note
              </Button>
            </div>
          </section>

          {/* 4. COOKING HISTORY SECTION */}
          <section className={styles.cardSection}>
            <div className={styles.sectionTitle}>
              <span>Cooking History</span>
              <Button
                variant="secondary"
                size="sm"
                icon={<CheckIcon width={14} height={14} />}
                onClick={(): void => setShowLogModal(true)}
              >
                I made this
              </Button>
            </div>

            {recipe.cookLog && recipe.cookLog.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {recipe.cookLog.map((log: CookLogEntry): ReactElement => (
                  <div
                    key={log.id}
                    style={{
                      padding: "8px 12px",
                      background: "var(--surface-alt)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                        {new Date(log.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })}
                      </div>
                      {log.note && (
                        <div style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: 2 }}>
                          {log.note}
                        </div>
                      )}
                    </div>
                    {log.rating !== undefined && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, color: "var(--accent)", fontSize: "0.8125rem" }}>
                        <StarIcon width={13} height={13} fill="currentColor" /> {log.rating}/5
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontStyle: "italic", margin: 0 }}>
                You haven&apos;t logged cooking this dish yet. Tap &ldquo;I made this&rdquo; above!
              </p>
            )}
          </section>

          {/* 5. NUTRITION FACTS (Last, Full Width, Collapsible on Mobile) */}
          <section className={styles.cardSection}>
            <div className={styles.sectionTitle}>
              <span>Nutrition Facts</span>
              <button
                type="button"
                onClick={(): void => setNutritionCollapsed((prev: boolean): boolean => !prev)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {nutritionCollapsed ? "Show" : "Hide"}
              </button>
            </div>
            {!nutritionCollapsed && (
              <NutritionFactsCard estimate={nutritionEstimate} />
            )}
          </section>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar: Cook Mode CTA */}
      <div className={styles.mobileStickyBar}>
        <Button
          variant="primary"
          icon={<ChefHatIcon width={18} height={18} />}
          onClick={(): void => onOpenCookMode(multiplier)}
          style={{ width: "100%", justifyContent: "center" }}
        >
          Cook Mode
        </Button>
      </div>

      {/* Modals & Dialogs */}
      {showFolderModal && (
        <FolderAssignmentModal
          recipe={recipe}
          collections={collections}
          onSaveCollection={onSaveCollection}
          onUpdateRecipe={onUpdateRecipe}
          onClose={(): void => setShowFolderModal(false)}
        />
      )}

      {showMealPlanModal && (
        <AddToMealPlanModal
          recipe={recipe}
          onSuccess={(): void => showToast(`Added "${recipe.title}" to meal plan`)}
          onClose={(): void => setShowMealPlanModal(false)}
        />
      )}

      {showUnitConverterModal && (
        <QuickUnitConverterModal
          userIngredients={userIngredients}
          onClose={(): void => setShowUnitConverterModal(false)}
        />
      )}

      {showHistoryModal && (
        <RecipeHistoryModal
          recipeId={recipe.id}
          onRestore={async (restored: Recipe): Promise<void> => {
            await onUpdateRecipe(restored);
            showToast("Restored previous version snapshot");
          }}
          onClose={(): void => setShowHistoryModal(false)}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Recipe"
        message={`Move "${recipe.title}" to trash?`}
        confirmLabel="Move to Trash"
        isDanger
        onConfirm={onDelete}
        onCancel={(): void => setShowDeleteConfirm(false)}
      />

      {/* I Made This Log Modal */}
      {showLogModal && (
        <ConfirmDialog
          isOpen
          title="Log Cooking Session"
          confirmLabel="Save Log"
          onConfirm={(): void => {
            void handleAddCookLog();
          }}
          onCancel={(): void => setShowLogModal(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                RATING
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4, 5].map((star: number): ReactElement => (
                  <button
                    key={star}
                    type="button"
                    onClick={(): void => setLogRating(star)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: star <= logRating ? "var(--accent)" : "var(--border)",
                      padding: 2
                    }}
                  >
                    <StarIcon width={22} height={22} fill={star <= logRating ? "currentColor" : "none"} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                COOKING NOTES
              </label>
              <textarea
                value={logNotes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>): void => setLogNotes(e.target.value)}
                placeholder="How did it turn out? Any changes?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontFamily: "inherit",
                  fontSize: "0.875rem"
                }}
              />
            </div>
          </div>
        </ConfirmDialog>
      )}
    </div>
  );
};
