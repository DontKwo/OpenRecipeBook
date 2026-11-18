import { useState, useMemo, type FC, type ReactElement, type FormEvent } from "react";
import type { Recipe, Combo } from "../../domain/recipe/types";
import { computeIngredientTotals, type TotalsSelectionItem } from "../../domain/ingredients/totals";
import { parseIngredient } from "../../domain/scaling/parseIngredient";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";
import { QuickUnitConverterModal } from "../recipe-view/QuickUnitConverterModal";
import { ConvertIcon, XIcon, PlusIcon, MinusIcon } from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { RecipePicker } from "../../ui/RecipePicker";
import { Dialog } from "../../ui/Dialog";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { useToast } from "../../ui/Toast";
import styles from "./IngredientTotalsView.module.css";

interface ActiveConversionTarget {
  value: number;
  unit: string;
  ingredient: string;
}

export interface IngredientTotalsViewProps {
  recipes: Recipe[];
  combos?: Combo[];
  onSaveCombo?: (combo: Combo) => void;
  onDeleteCombo?: (comboId: string) => void;
}

export const IngredientTotalsView: FC<IngredientTotalsViewProps> = ({
  recipes,
  combos = [],
  onSaveCombo,
  onDeleteCombo
}): ReactElement => {
  const { showToast } = useToast();

  const [selectedMultipliers, setSelectedMultipliers] = useState<Record<string, number>>({});
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const [newComboName, setNewComboName] = useState<string>("");
  const [showSaveComboModal, setShowSaveComboModal] = useState<boolean>(false);
  const [comboToDelete, setComboToDelete] = useState<Combo | null>(null);
  const [activeConverter, setActiveConverter] = useState<ActiveConversionTarget | null>(null);
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const toggleSelectRecipe = (id: string): void => {
    setSelectedMultipliers((prev: Record<string, number>): Record<string, number> => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const updateMultiplier = (id: string, multiplier: number): void => {
    setSelectedMultipliers((prev: Record<string, number>): Record<string, number> => ({
      ...prev,
      [id]: Math.max(0.25, Math.round(multiplier * 100) / 100)
    }));
  };

  const handleSelectRecipeFromPicker = (recipe: Recipe): void => {
    setSelectedMultipliers((prev: Record<string, number>): Record<string, number> => ({
      ...prev,
      [recipe.id]: (prev[recipe.id] || 0) + 1
    }));
    setShowPicker(false);
  };

  const selectionItems: TotalsSelectionItem[] = useMemo(() => {
    const list: TotalsSelectionItem[] = [];
    for (const recipe of recipes) {
      const mult = selectedMultipliers[recipe.id];
      if (mult) {
        list.push({ recipe, multiplier: mult });
      }
    }
    return list;
  }, [recipes, selectedMultipliers]);

  const totalsResult = useMemo(() => {
    return computeIngredientTotals(selectionItems, BUILT_IN_INGREDIENTS);
  }, [selectionItems]);

  const toggleTrace = (key: string): void => {
    setExpandedTraces((prev: Record<string, boolean>): Record<string, boolean> => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleApplyCombo = (combo: Combo): void => {
    const nextMap: Record<string, number> = {};
    for (const entry of combo.entries) {
      nextMap[entry.recipeId] = entry.multiplier;
    }
    setSelectedMultipliers(nextMap);
    showToast(`Loaded combo "${combo.name}"`);
  };

  const handleSaveCombo = (e: FormEvent): void => {
    e.preventDefault();
    if (!newComboName.trim() || !onSaveCombo) return;

    const entries = Object.entries(selectedMultipliers).map(([recipeId, multiplier]) => ({
      recipeId,
      multiplier
    }));

    const combo: Combo = {
      id: `combo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newComboName.trim(),
      entries,
      createdAt: new Date().toISOString()
    };

    onSaveCombo(combo);
    setNewComboName("");
    setShowSaveComboModal(false);
    showToast(`Saved combo "${combo.name}"`);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Ingredient Totals</h1>
          <p style={{ margin: "4px 0 0 0", color: "var(--muted)", fontSize: "0.9375rem" }}>
            Aggregate ingredient quantities across multiple recipes for bulk prep or shopping.
          </p>
        </div>

        {selectionItems.length > 0 && onSaveCombo && (
          <Button
            type="button"
            variant="secondary"
            onClick={(): void => setShowSaveComboModal(true)}
          >
            Save as Combo
          </Button>
        )}
      </div>

      {/* Saved Combos Tray */}
      {combos.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Saved Combinations</h2>
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            {combos.map((combo) => (
              <div
                key={combo.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "var(--surface-alt)",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--border)"
                }}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(): void => handleApplyCombo(combo)}
                >
                  {combo.name} ({combo.entries.length})
                </Button>
                {onDeleteCombo && (
                  <IconButton
                    icon={<XIcon width={14} height={14} />}
                    aria-label={`Delete combination ${combo.name}`}
                    size="sm"
                    onClick={(): void => setComboToDelete(combo)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Selection Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Selected Recipes ({selectionItems.length})
          </h2>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {selectionItems.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(): void => setSelectedMultipliers({})}
              >
                Clear All
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(): void => setShowPicker(!showPicker)}
            >
              <PlusIcon width={14} height={14} /> Add Recipe
            </Button>
          </div>
        </div>

        {/* Recipe Picker Combobox */}
        {showPicker && (
          <div className={styles.pickerBox}>
            <RecipePicker
              recipes={recipes}
              onSelectRecipe={handleSelectRecipeFromPicker}
              placeholder="Search recipe by name or course to add..."
              onCancel={(): void => setShowPicker(false)}
              autoFocus={false}
            />
          </div>
        )}

        {/* Selected Recipes Active Tray */}
        {selectionItems.length > 0 ? (
          <div className={styles.activeTray}>
            {selectionItems.map(({ recipe, multiplier }) => (
              <div key={recipe.id} className={styles.recipeCard}>
                <span className={styles.recipeTitle} title={recipe.title}>
                  {recipe.title}
                </span>

                <div className={styles.stepper}>
                  <IconButton
                    icon={<MinusIcon width={14} height={14} />}
                    aria-label={`Decrease multiplier for ${recipe.title}`}
                    size="sm"
                    variant="secondary"
                    onClick={(): void => updateMultiplier(recipe.id, multiplier - 0.5)}
                  />
                  <span className={styles.stepperValue}>
                    {multiplier}&times;
                  </span>
                  <IconButton
                    icon={<PlusIcon width={14} height={14} />}
                    aria-label={`Increase multiplier for ${recipe.title}`}
                    size="sm"
                    variant="secondary"
                    onClick={(): void => updateMultiplier(recipe.id, multiplier + 0.5)}
                  />
                  <IconButton
                    icon={<XIcon width={14} height={14} />}
                    aria-label={`Remove ${recipe.title} from totals`}
                    size="sm"
                    variant="ghost"
                    onClick={(): void => toggleSelectRecipe(recipe.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            No recipes selected yet. Click "Add Recipe" above to search and pick recipes to aggregate.
          </div>
        )}
      </div>

      {/* Aggregate Totals Output */}
      {selectionItems.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              Combined Ingredients ({totalsResult.items.length})
            </h2>
          </div>

          <div className={styles.totalsGrid}>
            {totalsResult.items.map((item, index) => {
              const traceKey = `${item.displayName}-${index}`;
              const isTraceOpen = !!expandedTraces[traceKey];

              return (
                <div key={traceKey} className={styles.ingredientCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div>
                      <div className={styles.ingredientAmount}>{item.totalDisplay}</div>
                      <div className={styles.ingredientName}>{item.displayName}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(): void => {
                        const parsedTotal = parseIngredient(item.totalDisplay.replace("≈", "").trim(), `total-${index}`);
                        const qty = parsedTotal.ingredient.quantity;
                        const totalNumeric = qty ? (qty.kind === "single" ? qty.value : qty.max) : 1;
                        setActiveConverter({
                          value: totalNumeric,
                          unit: parsedTotal.ingredient.unit || (item.unitFamily === "weight" ? "g" : "cup"),
                          ingredient: item.displayName || parsedTotal.ingredient.name || "ingredient"
                        });
                      }}
                    >
                      <ConvertIcon width={12} height={12} /> Convert
                    </Button>
                  </div>

                  <div className={styles.ingredientSources}>
                    Aisle: {item.aisle} · {item.traces.length} {item.traces.length === 1 ? "recipe" : "recipes"}
                  </div>

                  {/* Trace Breakdown Toggle */}
                  <div style={{ marginTop: "4px" }}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(): void => toggleTrace(traceKey)}
                      style={{ padding: 0, fontSize: "0.75rem", textDecoration: "underline" }}
                    >
                      {isTraceOpen ? "Hide Breakdown" : "View Breakdown"}
                    </Button>

                    {isTraceOpen && (
                      <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px", fontSize: "0.8125rem", color: "var(--muted)" }}>
                        {item.traces.map((trace, traceIndex) => (
                          <li key={traceIndex}>
                            <strong>{trace.recipeTitle}</strong>: {trace.scaledQuantityText}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Also Needed */}
          {totalsResult.alsoNeeded.length > 0 && (
            <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-3)", borderTop: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "0.875rem", color: "var(--muted)", textTransform: "uppercase", margin: "0 0 8px 0" }}>
                Also Needed (Unscaled items)
              </h3>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text)", fontSize: "0.875rem" }}>
                {totalsResult.alsoNeeded.map((item, index) => (
                  <li key={index}>
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Save Combo Dialog */}
      <Dialog
        isOpen={showSaveComboModal}
        title="Save Current Recipe Combo"
        onClose={(): void => setShowSaveComboModal(false)}
        maxWidth={400}
      >
        <form onSubmit={handleSaveCombo} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)" }}>
            Save this set of {selectionItems.length} recipes and multipliers for one-click re-use.
          </p>
          <input
            type="text"
            autoFocus
            required
            value={newComboName}
            onChange={(e): void => setNewComboName(e.target.value)}
            placeholder="e.g. Sunday Meal Prep, Taco Night..."
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)"
            }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
            <Button
              type="button"
              variant="secondary"
              onClick={(): void => setShowSaveComboModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!newComboName.trim()}
            >
              Save Combo
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Delete Combo Confirm */}
      <ConfirmDialog
        isOpen={Boolean(comboToDelete)}
        title={`Delete combo "${comboToDelete?.name}"?`}
        message="Are you sure you want to delete this saved recipe combination?"
        confirmLabel="Delete"
        isDanger={true}
        onConfirm={(): void => {
          if (comboToDelete && onDeleteCombo) {
            onDeleteCombo(comboToDelete.id);
            showToast(`Deleted combo "${comboToDelete.name}"`);
            setComboToDelete(null);
          }
        }}
        onCancel={(): void => setComboToDelete(null)}
      />

      {/* Quick Unit Converter Modal */}
      {activeConverter && (
        <QuickUnitConverterModal
          initialIngredient={activeConverter.ingredient}
          initialValue={activeConverter.value}
          initialUnit={activeConverter.unit}
          onClose={(): void => setActiveConverter(null)}
        />
      )}
    </div>
  );
};
