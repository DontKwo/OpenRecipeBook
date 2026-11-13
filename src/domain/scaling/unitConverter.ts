import type { Ingredient, Quantity } from "../recipe/types";
import { formatQuantityValue, type FormatOptions } from "./formatQuantity";
import { convertFahrenheitToCelsius, convertCelsiusToFahrenheit } from "./density";

export type UnitSystem = "us" | "metric";

export function convertIngredientUnitSystem(
  ingredient: Ingredient,
  targetSystem: UnitSystem,
  options: FormatOptions = {}
): { formattedText: string; convertedUnit?: string } {
  if (!ingredient.scalable || !ingredient.quantity || !ingredient.unit) {
    return { formattedText: ingredient.raw };
  }

  const rawUnit = ingredient.unit.toLowerCase();
  const quantity = ingredient.quantity;
  const numericValue = quantity.kind === "single" ? quantity.value : quantity.max;

  if (targetSystem === "metric") {
    // US -> Metric
    if (rawUnit === "tsp") {
      const ml = Math.round(numericValue * 5);
      return formatConverted(ml, "ml", ingredient, options);
    }
    if (rawUnit === "tbsp") {
      const ml = Math.round(numericValue * 15);
      return formatConverted(ml, "ml", ingredient, options);
    }
    if (rawUnit === "fl oz") {
      const ml = Math.round(numericValue * 30);
      return formatConverted(ml, "ml", ingredient, options);
    }
    if (rawUnit === "cup" || rawUnit === "cups") {
      const ml = Math.round(numericValue * 240);
      if (ml >= 1000) {
        return formatConverted(Math.round((ml / 1000) * 10) / 10, "l", ingredient, options);
      }
      return formatConverted(ml, "ml", ingredient, options);
    }
    if (rawUnit === "oz" || rawUnit === "ounce" || rawUnit === "ounces") {
      const grams = Math.round(numericValue * 28.35);
      if (grams >= 1000) {
        return formatConverted(Math.round((grams / 1000) * 100) / 100, "kg", ingredient, options);
      }
      return formatConverted(grams, "g", ingredient, options);
    }
    if (rawUnit === "lb" || rawUnit === "lbs" || rawUnit === "pound" || rawUnit === "pounds") {
      const grams = Math.round(numericValue * 453.59);
      if (grams >= 1000) {
        return formatConverted(Math.round((grams / 1000) * 10) / 10, "kg", ingredient, options);
      }
      return formatConverted(grams, "g", ingredient, options);
    }
  } else {
    // Metric -> US
    if (rawUnit === "g" || rawUnit === "gram" || rawUnit === "grams") {
      if (numericValue >= 450) {
        const lbs = Math.round((numericValue / 453.59) * 4) / 4;
        return formatConverted(lbs, "lb", ingredient, options);
      }
      const oz = Math.round((numericValue / 28.35) * 2) / 2;
      return formatConverted(oz, "oz", ingredient, options);
    }
    if (rawUnit === "ml" || rawUnit === "milliliter" || rawUnit === "milliliters") {
      if (numericValue >= 240) {
        const cups = Math.round((numericValue / 240) * 4) / 4;
        return formatConverted(cups, "cup", ingredient, options);
      }
      if (numericValue >= 15) {
        const tbsp = Math.round((numericValue / 15) * 2) / 2;
        return formatConverted(tbsp, "tbsp", ingredient, options);
      }
      const tsp = Math.round(numericValue / 5);
      return formatConverted(tsp, "tsp", ingredient, options);
    }
  }

  // Unit does not require conversion
  const formatted = formatQuantityValue(quantity, ingredient.unit, options);
  const text = `${formatted.formattedQuantity} ${formatted.resolvedUnit || ""} ${ingredient.name || ""}`.trim();
  return { formattedText: text };
}

function formatConverted(
  amount: number,
  unit: string,
  ingredient: Ingredient,
  options: FormatOptions
): { formattedText: string; convertedUnit: string } {
  const convertedQuantity: Quantity = { kind: "single", value: amount };
  const formatted = formatQuantityValue(convertedQuantity, unit, options);
  const parts: string[] = [formatted.formattedQuantity];
  if (ingredient.note && ingredient.note.startsWith("(")) {
    parts.push(ingredient.note);
  }
  if (formatted.resolvedUnit) {
    parts.push(formatted.resolvedUnit);
  }
  if (ingredient.name) {
    parts.push(ingredient.name);
  }
  if (ingredient.note && !ingredient.note.startsWith("(")) {
    parts.push(`, ${ingredient.note}`);
  }
  return {
    formattedText: parts.join(" ").replace(/\s+,/g, ",").trim(),
    convertedUnit: unit
  };
}

export function convertStepTemperatures(stepText: string, targetSystem: UnitSystem): string {
  if (targetSystem === "metric") {
    // 350°F -> 177°C
    return stepText.replace(/(\d+)\s*°F\b/gi, (_match, degreesF) => {
      const celsius = convertFahrenheitToCelsius(parseInt(degreesF, 10));
      return `${celsius}°C`;
    });
  } else {
    // 180°C -> 356°F
    return stepText.replace(/(\d+)\s*°C\b/gi, (_match, degreesC) => {
      const fahrenheit = convertCelsiusToFahrenheit(parseInt(degreesC, 10));
      return `${fahrenheit}°F`;
    });
  }
}
