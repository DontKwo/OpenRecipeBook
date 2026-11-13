import { describe, it, expect } from "vitest";
import {
  convertIngredientUnit,
  getAllUnitConversions,
  normalizeUnitKey
} from "../src/domain/scaling/universalConverter";

describe("Universal Unit Converter", () => {
  it("normalizes unit variations and abbreviations correctly", () => {
    expect(normalizeUnitKey("cups")).toBe("cup");
    expect(normalizeUnitKey("Tablespoons")).toBe("tbsp");
    expect(normalizeUnitKey("T")).toBe("tbsp");
    expect(normalizeUnitKey("t")).toBe("tsp");
    expect(normalizeUnitKey("fl. oz.")).toBe("fl oz");
    expect(normalizeUnitKey("lbs")).toBe("lb");
    expect(normalizeUnitKey("grams")).toBe("g");
  });

  it("converts 1/4 cup to tbsp accurately (returns 4 tbsp)", () => {
    const res = convertIngredientUnit(0.25, "cup", "tbsp");
    expect(res.success).toBe(true);
    expect(res.targetUnit).toBe("tbsp");
    expect(res.formattedAmount).toBe("4");
    expect(res.crossFamily).toBe(false);
  });

  it("converts 1 tbsp to tsp (returns 3 tsp)", () => {
    const res = convertIngredientUnit(1, "tbsp", "tsp");
    expect(res.success).toBe(true);
    expect(res.formattedAmount).toBe("3");
  });

  it("converts 1 lb to oz (returns 16 oz)", () => {
    const res = convertIngredientUnit(1, "lb", "oz");
    expect(res.success).toBe(true);
    expect(res.formattedAmount).toBe("16");
    expect(res.crossFamily).toBe(false);
  });

  it("converts 100g flour to tbsp using flour density", () => {
    // 100g / 0.53 g/ml ≈ 188.68 ml / 14.79 ml/tbsp ≈ 12.76 tbsp (12 3/4 tbsp)
    const res = convertIngredientUnit(100, "g", "tbsp", "all-purpose flour");
    expect(res.success).toBe(true);
    expect(res.crossFamily).toBe(true);
    expect(res.densityUsed).toBe(0.53);
    expect(res.targetUnit).toBe("tbsp");
    expect(res.formattedAmount).toBe("12 \u00BE");
  });

  it("converts 1 cup flour to grams using flour density (approx 125g)", () => {
    const res = convertIngredientUnit(1, "cup", "g", "all-purpose flour");
    expect(res.success).toBe(true);
    expect(res.crossFamily).toBe(true);
    expect(res.value).toBeCloseTo(125.4, 0);
    expect(res.formattedAmount).toBe("125");
  });

  it("converts 1 cup granulated sugar to grams (approx 201g)", () => {
    const res = convertIngredientUnit(1, "cup", "g", "granulated sugar");
    expect(res.success).toBe(true);
    expect(res.value).toBeCloseTo(201, 0);
    expect(res.formattedAmount).toBe("201");
  });

  it("converts 100g butter to tbsp (approx 7 tbsp)", () => {
    // 100g / 0.96 ≈ 104.16 ml / 14.79 ≈ 7.04 tbsp
    const res = convertIngredientUnit(100, "g", "tbsp", "butter");
    expect(res.success).toBe(true);
    expect(res.formattedAmount).toBe("7");
  });

  it("returns conversions to all units simultaneously with getAllUnitConversions", () => {
    const res = getAllUnitConversions(0.25, "cup", "all-purpose flour");
    expect(res).not.toBeNull();
    if (!res) return;

    expect(res.volumeConversions).toHaveLength(9);
    expect(res.weightConversions).toHaveLength(4);

    const tbspConv = res.volumeConversions.find((c) => c.unit === "tbsp");
    expect(tbspConv?.formattedAmount).toBe("4");

    const gramsConv = res.weightConversions.find((c) => c.unit === "g");
    expect(gramsConv?.formattedAmount).toBe("31");
  });
});
