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

    expect(res.volumeConversions).toHaveLength(11);
    expect(res.weightConversions).toHaveLength(5);

    const tbspConv = res.volumeConversions.find((c) => c.unit === "tbsp");
    expect(tbspConv?.formattedAmount).toBe("4");

    const gramsConv = res.weightConversions.find((c) => c.unit === "g");
    expect(gramsConv?.formattedAmount).toBe("31");
  });

  it("converts (2 1/4 tsp) pack of active dry yeast to any unit (grams, tbsp, packets, oz)", async () => {
    const { parseIngredient } = await import("../src/domain/scaling/parseIngredient");
    const parsed = parseIngredient("(2 1/4 tsp) pack of active dry yeast");
    expect(parsed.confidence).toBe("high");
    expect(parsed.ingredient.quantity).toEqual({ kind: "single", value: 2.25 });
    expect(parsed.ingredient.unit).toBe("tsp");
    expect(parsed.ingredient.name).toBe("active dry yeast");

    // Convert to tablespoons: 2.25 tsp / 3 = 0.75 tbsp (3/4 tbsp)
    const toTbsp = convertIngredientUnit(2.25, "tsp", "tbsp", "active dry yeast");
    expect(toTbsp.success).toBe(true);
    expect(toTbsp.value).toBeCloseTo(0.75, 2);
    expect(toTbsp.formattedAmount).toBe("\u00BE");

    // Convert to grams: 2.25 tsp * 4.929 ml * 0.64 g/ml ≈ 7.1g (rounds to 7)
    const toGrams = convertIngredientUnit(2.25, "tsp", "g", "active dry yeast");
    expect(toGrams.success).toBe(true);
    expect(toGrams.crossFamily).toBe(true);
    expect(toGrams.value).toBeCloseTo(7.1, 1);
    expect(toGrams.formattedAmount).toBe("7");

    // Convert to packets: ~1 packet
    const toPacket = convertIngredientUnit(2.25, "tsp", "packet", "active dry yeast");
    expect(toPacket.success).toBe(true);
    expect(toPacket.value).toBeCloseTo(1, 0);

    // Convert to ounces: ~0.25 oz
    const toOz = convertIngredientUnit(2.25, "tsp", "oz", "active dry yeast");
    expect(toOz.success).toBe(true);
    expect(toOz.value).toBeCloseTo(0.25, 2);
  });

  it("parses and converts 1 packet (2 1/4 tsp) active dry yeast", async () => {
    const { parseIngredient } = await import("../src/domain/scaling/parseIngredient");
    const parsed = parseIngredient("1 packet (2 1/4 tsp) active dry yeast");
    expect(parsed.confidence).toBe("high");
    expect(parsed.ingredient.quantity).toEqual({ kind: "single", value: 2.25 });
    expect(parsed.ingredient.unit).toBe("tsp");
    expect(parsed.ingredient.name).toBe("active dry yeast");

    const toGrams = convertIngredientUnit(2.25, "tsp", "g", "active dry yeast");
    expect(toGrams.success).toBe(true);
    expect(toGrams.formattedAmount).toBe("7");
  });

  it("converts packet directly to tsp and grams", () => {
    // 1 packet = 7g
    const toGrams = convertIngredientUnit(1, "packet", "g", "active dry yeast");
    expect(toGrams.success).toBe(true);
    expect(toGrams.formattedAmount).toBe("7");

    // 1 packet to tsp: 7g / 0.64 g/ml ≈ 10.94 ml / 4.93 ml/tsp ≈ 2.22 tsp (2 1/4 tsp)
    const toTsp = convertIngredientUnit(1, "packet", "tsp", "active dry yeast");
    expect(toTsp.success).toBe(true);
    expect(toTsp.value).toBeCloseTo(2.22, 1);
    expect(toTsp.formattedAmount).toBe("2 \u00BC");
  });
});
