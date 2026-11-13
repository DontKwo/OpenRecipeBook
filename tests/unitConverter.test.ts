import { describe, it, expect } from "vitest";
import { convertIngredientUnitSystem, convertStepTemperatures } from "../src/domain/scaling/unitConverter";
import { parseIngredient } from "../src/domain/scaling/parseIngredient";

describe("Unit System Converter", (): void => {
  it("converts US cups to Metric ml", (): void => {
    const parsed = parseIngredient("2 cups all-purpose flour");
    const result = convertIngredientUnitSystem(parsed.ingredient, "metric");
    expect(result.formattedText).toBe("480 ml all-purpose flour");
  });

  it("converts US ounces to Metric grams with 5g rounding above 100g", (): void => {
    const parsed = parseIngredient("8 oz cream cheese");
    const result = convertIngredientUnitSystem(parsed.ingredient, "metric");
    expect(result.formattedText).toBe("225 g cream cheese");
  });

  it("converts Metric grams to US ounces or pounds", (): void => {
    const parsed = parseIngredient("250 g butter");
    const result = convertIngredientUnitSystem(parsed.ingredient, "us");
    expect(result.formattedText).toBe("9 oz butter");
  });

  it("converts temperatures in step directions", (): void => {
    const direction = "Preheat oven to 350°F and bake for 25 minutes.";
    const converted = convertStepTemperatures(direction, "metric");
    expect(converted).toBe("Preheat oven to 177°C and bake for 25 minutes.");

    const metricDir = "Bake at 180°C for 20 minutes.";
    const usConverted = convertStepTemperatures(metricDir, "us");
    expect(usConverted).toBe("Bake at 356°F for 20 minutes.");
  });
});
