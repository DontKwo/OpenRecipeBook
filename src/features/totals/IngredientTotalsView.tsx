import { useState, useMemo, type FC, type ReactElement } from "react";
import type { Recipe, Combo } from "../../domain/recipe/types";
import { computeIngredientTotals, type TotalsSelectionItem } from "../../domain/ingredients/totals";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";

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
  const [selectedMultipliers, setSelectedMultipliers] = useState<Record<string, number>>({});
  const [expandedTraces, setExpandedTraces] = useState<Record<string, boolean>>({});
  const [newComboName, setNewComboName] = useState<string>("");
  const [showSaveComboModal, setShowSaveComboModal] = useState<boolean>(false);

  const toggleSelectRecipe = (id: string) => {
    setSelectedMultipliers((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  };

  const updateMultiplier = (id: string, multiplier: number) => {
    setSelectedMultipliers((prev) => ({
      ...prev,
      [id]: Math.max(0.25, multiplier)
    }));
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

  const toggleTrace = (key: string) => {
    setExpandedTraces((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleApplyCombo = (combo: Combo) => {
    const nextMap: Record<string, number> = {};
    for (const entry of combo.entries) {
      nextMap[entry.recipeId] = entry.multiplier;
    }
    setSelectedMultipliers(nextMap);
  };

  const handleSaveCombo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComboName.trim() || !onSaveCombo) return;

    const entries = Object.entries(selectedMultipliers).map(([recipeId, multiplier]) => ({
      recipeId,
      multiplier
    }));

    const combo: Combo = {
      id: `combo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newComboName.trim(),
      entries,
      createdAt: new Date().toISOString()
    };

    onSaveCombo(combo);
    setNewComboName("");
    setShowSaveComboModal(false);
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "var(--space-6)" }}>
      <header style={{ marginBottom: "var(--space-6)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.25rem", marginBottom: "var(--space-2)" }}>
            Ingredient Totals
          </h1>
          <p style={{ color: "var(--muted)" }}>
            Select any number of recipes to combine and aggregate total ingredient quantities across your cooking plan.
          </p>
        </div>

        {selectionItems.length > 0 && onSaveCombo && (
          <button
            type="button"
            onClick={() => setShowSaveComboModal(true)}
            style={{
              background: "var(--surface)",
              color: "var(--accent)",
              border: "1px solid var(--border)",
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Save as Combo
          </button>
        )}
      </header>

      {/* Saved Combos Tray */}
      {combos.length > 0 && (
        <section style={{ marginBottom: "var(--space-6)", background: "var(--surface)", padding: "var(--space-4) var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <h3 style={{ fontSize: "0.95rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px", marginBottom: "var(--space-3)" }}>
            Saved Combos
          </h3>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            {combos.map((combo) => (
              <div
                key={combo.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  background: "var(--surface-alt)",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-full)"
                }}
              >
                <button
                  type="button"
                  onClick={() => handleApplyCombo(combo)}
                  style={{
                    background: "none",
                    border: "none",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.9rem"
                  }}
                >
                  {combo.name} ({combo.entries.length} recipes)
                </button>
                {onDeleteCombo && (
                  <button
                    type="button"
                    onClick={() => onDeleteCombo(combo.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      cursor: "pointer",
                      padding: "2px 4px"
                    }}
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recipe Picker Section */}
      <section style={{ marginBottom: "var(--space-8)", background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
        <h2 style={{ fontSize: "1.2rem", marginBottom: "var(--space-4)" }}>
          1. Choose Recipes to Combine ({selectionItems.length} selected)
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--space-3)" }}>
          {recipes.map((recipe) => {
            const isSelected = !!selectedMultipliers[recipe.id];
            const multiplier = selectedMultipliers[recipe.id] || 1;

            return (
              <div
                key={recipe.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "var(--space-3) var(--space-4)",
                  background: isSelected ? "var(--surface-alt)" : "transparent",
                  border: "1px solid " + (isSelected ? "var(--accent)" : "var(--border)"),
                  borderRadius: "var(--radius-sm)"
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectRecipe(recipe.id)}
                  />
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{recipe.title}</span>
                </label>

                {isSelected && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => updateMultiplier(recipe.id, multiplier - 0.5)}
                      style={{ padding: "2px 8px", cursor: "pointer" }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, minWidth: "32px", textAlign: "center" }}>
                      {multiplier}\u00D7
                    </span>
                    <button
                      type="button"
                      onClick={() => updateMultiplier(recipe.id, multiplier + 0.5)}
                      style={{ padding: "2px 8px", cursor: "pointer" }}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Aggregated Totals Results */}
      {selectionItems.length > 0 ? (
        <section style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "1.3rem", marginBottom: "var(--space-4)", color: "var(--accent)" }}>
            2. Combined Total Requirements
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {totalsResult.items.map((item, index) => {
              const traceKey = `item-${index}`;
              const isTraceOpen = !!expandedTraces[traceKey];

              return (
                <div
                  key={index}
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>
                      {item.totalDisplay}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", background: "var(--surface-alt)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
                      {item.aisle}
                    </span>
                  </div>

                  {/* Trace toggle */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleTrace(traceKey)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent)",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "underline"
                      }}
                    >
                      {isTraceOpen ? "Hide Breakdown" : `Why this total? (${item.traces.length} recipes)`}
                    </button>

                    {isTraceOpen && (
                      <ul style={{ marginTop: "6px", paddingLeft: "var(--space-4)", fontSize: "0.85rem", color: "var(--muted)" }}>
                        {item.traces.map((trace, traceIndex) => (
                          <li key={traceIndex}>
                            <strong>{trace.recipeTitle}</strong>: {trace.scaledQuantityText} (from "{trace.originalRaw}")
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
            <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "2px solid var(--border)" }}>
              <h3 style={{ fontSize: "1rem", color: "var(--muted)", textTransform: "uppercase", marginBottom: "var(--space-3)" }}>
                Also Needed (Non-scalable or unquantified)
              </h3>
              <ul style={{ paddingLeft: "var(--space-4)", color: "var(--text)" }}>
                {totalsResult.alsoNeeded.map((item, index) => (
                  <li key={index} style={{ marginBottom: "4px" }}>
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <div style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--muted)" }}>
          Check one or more recipes above to see combined ingredient totals.
        </div>
      )}

      {/* Save Combo Modal */}
      {showSaveComboModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100
          }}
        >
          <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", width: "90%", maxWidth: "400px" }}>
            <h3 style={{ marginBottom: "var(--space-3)" }}>Save Selection as Combo</h3>
            <form onSubmit={handleSaveCombo}>
              <input
                type="text"
                autoFocus
                required
                value={newComboName}
                onChange={(e) => setNewComboName(e.target.value)}
                placeholder="e.g. Thanksgiving Dinner, Sunday Baking..."
                style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "var(--space-4)" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={() => setShowSaveComboModal(false)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "8px 18px", borderRadius: "var(--radius-full)", cursor: "pointer", fontWeight: 600 }}
                >
                  Save Combo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
