import { useState, type FC, type ReactElement } from "react";
import type { RecipeNutritionEstimate } from "../../domain/nutrition/nutritionCalculator";

export interface NutritionFactsCardProps {
  estimate: RecipeNutritionEstimate;
}

export const NutritionFactsCard: FC<NutritionFactsCardProps> = ({
  estimate
}): ReactElement => {
  const [viewMode, setViewMode] = useState<"serving" | "batch">("serving");
  const [showBreakdown, setShowBreakdown] = useState<boolean>(false);

  const activeValues = viewMode === "serving" ? estimate.perServing : estimate.totalBatch;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-6)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-sm)"
      }}
    >
      {/* Header with Title and Mode Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          borderBottom: "2px solid var(--border)",
          paddingBottom: "var(--space-3)",
          marginBottom: "var(--space-4)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <h3
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.25rem",
              fontWeight: 700,
              margin: 0
            }}
          >
            Nutrition Facts
          </h3>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "2px 8px",
              borderRadius: "var(--radius-full)",
              background: "var(--surface-alt)",
              color: "var(--muted)",
              border: "1px solid var(--border)"
            }}
          >
            Estimated
          </span>
        </div>

        {/* View toggle */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-full)",
            padding: "2px"
          }}
        >
          <button
            type="button"
            onClick={(): void => setViewMode("serving")}
            style={{
              background: viewMode === "serving" ? "var(--surface)" : "transparent",
              color: viewMode === "serving" ? "var(--text)" : "var(--muted)",
              border: "none",
              borderRadius: "var(--radius-full)",
              padding: "4px 12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: viewMode === "serving" ? "var(--shadow-sm)" : "none"
            }}
          >
            Per Serving
          </button>
          <button
            type="button"
            onClick={(): void => setViewMode("batch")}
            style={{
              background: viewMode === "batch" ? "var(--surface)" : "transparent",
              color: viewMode === "batch" ? "var(--text)" : "var(--muted)",
              border: "none",
              borderRadius: "var(--radius-full)",
              padding: "4px 12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: viewMode === "batch" ? "var(--shadow-sm)" : "none"
            }}
          >
            Entire Batch
          </button>
        </div>
      </div>

      {/* Servings display */}
      <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "var(--space-3)" }}>
        {viewMode === "serving" ? `Serving size: 1 of ${estimate.servings} servings` : `Total batch: ${estimate.servings} servings`}
      </div>

      {/* Calories row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          borderBottom: "6px solid var(--border)",
          paddingBottom: "var(--space-2)",
          marginBottom: "var(--space-3)"
        }}
      >
        <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>Calories</span>
        <span style={{ fontSize: "2rem", fontWeight: 800 }}>{activeValues.calories}</span>
      </div>

      {/* Nutrients breakdown list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.9rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
          <span><strong style={{ fontWeight: 700 }}>Total Fat</strong> {activeValues.fat}g</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
          <span><strong style={{ fontWeight: 700 }}>Sodium</strong> {activeValues.sodium}mg</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "4px" }}>
          <span><strong style={{ fontWeight: 700 }}>Total Carbohydrate</strong> {activeValues.carbs}g</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "var(--space-4)", borderBottom: "1px solid var(--border)", paddingBottom: "4px", color: "var(--muted)" }}>
          <span>Dietary Fiber {activeValues.fiber}g</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "var(--space-4)", borderBottom: "1px solid var(--border)", paddingBottom: "4px", color: "var(--muted)" }}>
          <span>Total Sugars {activeValues.sugar}g</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid var(--border)", paddingBottom: "6px" }}>
          <span><strong style={{ fontWeight: 700 }}>Protein</strong> {activeValues.protein}g</span>
        </div>
      </div>

      {/* Coverage indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "0.8rem",
          color: "var(--muted)",
          marginTop: "var(--space-4)"
        }}
      >
        <span>Coverage: {estimate.coveragePercent}% ({estimate.matchedCount}/{estimate.totalIngredientsCount} items)</span>
        <button
          type="button"
          onClick={(): void => setShowBreakdown((prev: boolean): boolean => !prev)}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.8rem",
            padding: 0
          }}
        >
          {showBreakdown ? "Hide Item Details" : "Show Item Details"}
        </button>
      </div>

      {/* Expanded item breakdown table */}
      {showBreakdown && (
        <div style={{ marginTop: "var(--space-4)", borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
          <table style={{ width: "100%", fontSize: "0.8rem", textAlign: "left", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th style={{ padding: "4px 8px" }}>Ingredient</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Grams</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Calories</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Carbs</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Fat</th>
                <th style={{ padding: "4px 8px", textAlign: "right" }}>Protein</th>
              </tr>
            </thead>
            <tbody>
              {estimate.items.map((item, idx) => (
                <tr key={`${item.ingredientRaw}-${idx}`} style={{ borderBottom: "1px solid var(--border)", opacity: item.matched ? 1 : 0.5 }}>
                  <td style={{ padding: "6px 8px" }}>
                    {item.ingredientName}
                    {!item.matched && " (not matched)"}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.weightGrams}g</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.nutrients.calories}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.nutrients.carbs}g</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.nutrients.fat}g</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.nutrients.protein}g</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* USDA Disclaimer */}
      <div style={{ marginTop: "var(--space-4)", fontSize: "0.75rem", color: "var(--muted)", fontStyle: "italic", lineHeight: 1.4 }}>
        Disclaimer: Nutritional values are approximate estimates calculated from standard USDA FoodData Central reference values and densities. Actual values vary with specific brands, ingredient trims, and cooking methods.
      </div>
    </div>
  );
};
