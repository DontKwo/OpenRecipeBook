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
import { ConvertIcon, CheckIcon } from "../../ui/icons";
import { Dialog } from "../../ui/Dialog";
import { Button } from "../../ui/Button";

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

  const densityCategories = useMemo(() => {
    const groups: Record<string, { key: string; name: string; density: number }[]> = {};
    for (const [key, record] of Object.entries(DENSITY_TABLE)) {
      const cat = record.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ key, name: record.name, density: record.gramsPerMl });
    }
    return groups;
  }, []);

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

  const allAlternatives = useMemo(() => {
    return getAllUnitConversions(inputValue, fromUnit, ingredientQuery, undefined, userIngredients);
  }, [inputValue, fromUnit, ingredientQuery, userIngredients]);

  const detectedDensity = useMemo(() => {
    return findIngredientDensity(ingredientQuery, userIngredients);
  }, [ingredientQuery, userIngredients]);

  const alternativeList = useMemo((): { unit: string; formatted: string }[] => {
    if (!allAlternatives) return [];
    const all = [...allAlternatives.volumeConversions, ...allAlternatives.weightConversions];
    return all.filter((item) => !item.isOriginal).map((item) => ({
      unit: item.unit,
      formatted: item.formattedAmount
    }));
  }, [allAlternatives]);

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <ConvertIcon width={20} height={20} />
          Unit & Density Converter
        </span>
      }
      maxWidth={560}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", width: "100%" }}>
          <Button
            variant="secondary"
            onClick={onClose}
          >
            Cancel
          </Button>
          {onApplyConversion && (
            <Button
              variant="primary"
              disabled={!conversion.success}
              icon={<CheckIcon width={16} height={16} />}
              onClick={(): void => {
                if (conversion.success && conversion.formattedAmount) {
                  onApplyConversion(conversion.formattedAmount, toUnit);
                  onClose();
                }
              }}
            >
              Apply to Line
            </Button>
          )}
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Form controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
              AMOUNT & FROM
            </label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                type="number"
                min="0.01"
                step="any"
                value={Number.isNaN(inputValue) ? "" : inputValue}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setInputValue(parseFloat(e.target.value) || 0)}
                style={{
                  width: "70px",
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
            <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
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

        {/* Density selection */}
        <div>
          <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
            INGREDIENT DENSITY PROFILE
          </label>
          <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
            <select
              value={Object.values(DENSITY_TABLE).find((r) => r.name.toLowerCase() === ingredientQuery.toLowerCase())?.name || ""}
              onChange={(e: ChangeEvent<HTMLSelectElement>): void => {
                if (e.target.value) setIngredientQuery(e.target.value);
              }}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)"
              }}
            >
              <option value="">-- Choose from standard densities --</option>
              {Object.entries(densityCategories).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((item) => (
                    <option key={item.key} value={item.name}>
                      {item.name} ({item.density} g/ml)
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              type="text"
              value={ingredientQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setIngredientQuery(e.target.value)}
              placeholder="Or type ingredient name..."
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: "0.875rem"
              }}
            />
          </div>
          {detectedDensity && (
            <div style={{ marginTop: 4, fontSize: "0.8125rem", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Density: {detectedDensity.gramsPerMl} g/ml ({detectedDensity.matchedName})</span>
              <span>via {detectedDensity.source}</span>
            </div>
          )}
        </div>

        {/* Primary result banner */}
        <div
          style={{
            padding: "var(--space-3) var(--space-4)",
            background: "var(--surface-alt)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Converted result</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: conversion.success ? "var(--accent)" : "var(--danger)" }}>
              {conversion.success ? conversion.formattedText : (conversion.error || "Conversion unavailable")}
            </div>
          </div>
          {conversion.crossFamily && (
            <span style={{ fontSize: "0.75rem", background: "var(--surface)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "var(--radius-full)" }}>
              Volume/Weight
            </span>
          )}
        </div>

        {/* Quick alternative conversions */}
        {alternativeList.length > 0 && (
          <div>
            <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
              QUICK CONVERSIONS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6 }}>
              {alternativeList.slice(0, 8).map((alt) => (
                <div
                  key={alt.unit}
                  style={{
                    padding: "6px 8px",
                    background: "var(--surface-alt)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "0.8125rem",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>{alt.unit}</span>
                  <span style={{ fontWeight: 600 }}>{alt.formatted}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
