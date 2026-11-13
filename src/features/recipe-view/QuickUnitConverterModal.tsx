import { useState, useMemo, type FC, type ReactElement, type ChangeEvent } from "react";
import type { DictionaryIngredient } from "../../domain/recipe/types";
import {
  convertIngredientUnit,
  getAllUnitConversions,
  normalizeUnitKey,
  VOLUME_UNITS,
  WEIGHT_UNITS,
  type SupportedUnit
} from "../../domain/scaling/universalConverter";
import { DENSITY_TABLE, findIngredientDensity } from "../../domain/scaling/density";
import { XIcon, ConvertIcon, CheckIcon } from "../../ui/icons";

export interface QuickUnitConverterModalProps {
  initialValue?: number;
  initialUnit?: string;
  initialIngredient?: string;
  userIngredients?: DictionaryIngredient[];
  onApplyConversion?: (convertedText: string, targetUnit: string) => void;
  onClose: () => void;
}

export const QuickUnitConverterModal: FC<QuickUnitConverterModalProps> = ({
  initialValue = 1,
  initialUnit = "cup",
  initialIngredient = "All-Purpose Flour",
  userIngredients = [],
  onApplyConversion,
  onClose
}): ReactElement => {
  const [inputValue, setInputValue] = useState<number>(initialValue);
  const [fromUnit, setFromUnit] = useState<SupportedUnit>(normalizeUnitKey(initialUnit) || "cup");
  const [toUnit, setToUnit] = useState<SupportedUnit>("tbsp");
  const [ingredientQuery, setIngredientQuery] = useState<string>(initialIngredient);

  // Suggested density records
  const densityOptions = useMemo((): { key: string; name: string; density: number }[] => {
    return Object.entries(DENSITY_TABLE).map(([key, record]) => ({
      key,
      name: record.name,
      density: record.gramsPerMl
    }));
  }, []);

  // Live conversion result
  const conversion = useMemo(() => {
    return convertIngredientUnit(
      inputValue,
      fromUnit,
      toUnit,
      ingredientQuery,
      undefined,
      userIngredients
    );
  }, [inputValue, fromUnit, toUnit, ingredientQuery, userIngredients]);

  // All units simultaneous calculation
  const allConversions = useMemo(() => {
    return getAllUnitConversions(
      inputValue,
      fromUnit,
      ingredientQuery,
      undefined,
      userIngredients
    );
  }, [inputValue, fromUnit, ingredientQuery, userIngredients]);

  // Detected density feedback
  const detectedDensity = useMemo(() => {
    return findIngredientDensity(ingredientQuery, userIngredients);
  }, [ingredientQuery, userIngredients]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 130,
        padding: "var(--space-4)"
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          width: "100%",
          maxWidth: "580px",
          boxShadow: "var(--shadow-lg)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <ConvertIcon width={20} height={20} />
            <h3 style={{ fontFamily: "var(--font-serif)", margin: 0, fontSize: "1.25rem" }}>
              Universal Unit & Density Converter
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
            aria-label="Close converter modal"
          >
            <XIcon width={20} height={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: "var(--space-6)", overflowY: "auto", flex: 1 }}>
          {/* Controls Form Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                AMOUNT & FROM UNIT
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="number"
                  step="any"
                  min={0.01}
                  value={inputValue}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setInputValue(parseFloat(e.target.value) || 0)}
                  style={{
                    width: "85px",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)",
                    fontWeight: 600
                  }}
                />
                <select
                  value={fromUnit}
                  onChange={(e: ChangeEvent<HTMLSelectElement>): void => setFromUnit(e.target.value as SupportedUnit)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                >
                  <optgroup label="Volume Units">
                    {VOLUME_UNITS.map((u: string) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Weight Units">
                    {WEIGHT_UNITS.map((u: string) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
                CONVERT TO
              </label>
              <select
                value={toUnit}
                onChange={(e: ChangeEvent<HTMLSelectElement>): void => setToUnit(e.target.value as SupportedUnit)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--accent)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontWeight: 600
                }}
              >
                <optgroup label="Volume Units">
                  {VOLUME_UNITS.map((u: string) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </optgroup>
                <optgroup label="Weight Units">
                  {WEIGHT_UNITS.map((u: string) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Ingredient Selector with Preset Density Quick-Chips */}
          <div style={{ marginBottom: "var(--space-6)" }}>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
              INGREDIENT DENSITY PROFILE
            </label>
            <input
              type="text"
              value={ingredientQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setIngredientQuery(e.target.value)}
              placeholder="e.g. All-Purpose Flour, Granulated Sugar, Butter..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                marginBottom: "6px"
              }}
            />

            {/* Quick Preset Buttons */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
              {densityOptions.slice(0, 6).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={(): void => setIngredientQuery(item.name)}
                  style={{
                    background: ingredientQuery === item.name ? "var(--accent)" : "var(--surface-alt)",
                    color: ingredientQuery === item.name ? "var(--accent-contrast)" : "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-full)",
                    padding: "3px 10px",
                    fontSize: "0.75rem",
                    cursor: "pointer"
                  }}
                >
                  {item.name}
                </button>
              ))}
            </div>

            {detectedDensity && (
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Density matched: <strong>{detectedDensity.gramsPerMl} g/ml</strong> ({detectedDensity.matchedName})</span>
                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>via {detectedDensity.source}</span>
              </div>
            )}
          </div>

          {/* Primary Result Banner */}
          <div
            style={{
              padding: "var(--space-4) var(--space-6)",
              background: "var(--surface-alt)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--accent)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-6)"
            }}
          >
            <div>
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 700 }}>
                CONVERTED RESULT
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", color: "var(--accent)", lineHeight: 1.2 }}>
                {conversion.formattedAmount} {conversion.targetUnit}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text)", marginTop: "2px" }}>
                of {ingredientQuery || "ingredient"}
              </div>
            </div>

            {onApplyConversion && (
              <button
                type="button"
                onClick={(): void => {
                  onApplyConversion(conversion.formattedText, conversion.targetUnit);
                  onClose();
                }}
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <CheckIcon width={16} height={16} /> Apply to Recipe
              </button>
            )}
          </div>

          {/* All Units Matrix View */}
          {allConversions && (
            <div>
              <h4 style={{ fontSize: "0.88rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.5px", marginBottom: "8px" }}>
                All Units Equivalents ({inputValue} {fromUnit})
              </h4>

              {/* Volume table */}
              <div style={{ marginBottom: "var(--space-3)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                  VOLUME UNITS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "6px" }}>
                  {allConversions.volumeConversions.map((conv) => (
                    <div
                      key={conv.unit}
                      onClick={(): void => setToUnit(conv.unit)}
                      style={{
                        padding: "6px 8px",
                        background: toUnit === conv.unit ? "var(--surface-alt)" : "var(--surface)",
                        border: "1px solid " + (toUnit === conv.unit ? "var(--accent)" : "var(--border)"),
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" }}>{conv.unit}</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{conv.formattedAmount}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weight table */}
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", marginBottom: "4px" }}>
                  WEIGHT UNITS
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "6px" }}>
                  {allConversions.weightConversions.map((conv) => (
                    <div
                      key={conv.unit}
                      onClick={(): void => setToUnit(conv.unit)}
                      style={{
                        padding: "6px 8px",
                        background: toUnit === conv.unit ? "var(--surface-alt)" : "var(--surface)",
                        border: "1px solid " + (toUnit === conv.unit ? "var(--accent)" : "var(--border)"),
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer"
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase" }}>{conv.unit}</div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{conv.formattedAmount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "var(--space-3) var(--space-6)",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center"
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              padding: "6px 16px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontSize: "0.85rem"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
