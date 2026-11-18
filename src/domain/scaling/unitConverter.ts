import type { Ingredient, Quantity } from "../recipe/types";
import { formatQuantityValue, type FormatOptions } from "./formatQuantity";
import {
  convertFahrenheitToCelsius,
  convertCelsiusToFahrenheit,
  findIngredientDensity,
  convertVolumeToGrams
} from "./density";
import { parseIngredient } from "./parseIngredient";
import { getConversionConfig } from "./customConversions";
import { convertIngredientUnit } from "./universalConverter";

export type UnitSystem = "us" | "metric";

export interface ConvertUnitSystemOptions extends FormatOptions {
  multiplier?: number;
  preferGramsForDry?: boolean;
}

const UNIT_MAP: Record<string, string> = {
  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  t: "tsp",
  tbsp: "tbsp",
  tbsps: "tbsp",
  tbs: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  T: "tbsp",
  cup: "cup",
  cups: "cup",
  c: "cup",
  "fl oz": "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  pint: "pint",
  pints: "pint",
  pt: "pint",
  quart: "quart",
  quarts: "quart",
  qt: "quart",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l"
};

export function convertIngredientUnitSystem(
  ingredient: Ingredient,
  targetSystem: UnitSystem,
  options: ConvertUnitSystemOptions = {}
): { formattedText: string; convertedUnit?: string } {
  let effective = ingredient;
  if ((!effective.quantity || !effective.unit) && effective.raw) {
    const parsed = parseIngredient(effective.raw, effective.id);
    if (parsed.confidence !== "none") {
      effective = parsed.ingredient;
    }
  }

  if (!effective.scalable || !effective.quantity || !effective.unit) {
    return { formattedText: effective.raw };
  }

  const rawUnit = effective.unit.toLowerCase().trim();
  const canonicalUnit = UNIT_MAP[rawUnit] || rawUnit;
  const quantity = effective.quantity;
  const multiplier = options.multiplier ?? 1;
  const baseValue = quantity.kind === "single" ? quantity.value : quantity.max;
  const numericValue = baseValue * multiplier;

  // Apply user custom conversion overrides if defined for this unit
  const customConfig = getConversionConfig();
  if (customConfig.units[canonicalUnit] || customConfig.units[rawUnit]) {
    const targetOverrideUnit =
      targetSystem === "metric"
        ? customConfig.units[canonicalUnit]?.family === "weight" || canonicalUnit === "oz" || canonicalUnit === "lb"
          ? "g"
          : "ml"
        : customConfig.units[canonicalUnit]?.family === "weight" || canonicalUnit === "g" || canonicalUnit === "kg"
          ? "oz"
          : "cup";
    const res = convertIngredientUnit(numericValue, canonicalUnit, targetOverrideUnit, effective.name);
    if (res.success) {
      return formatConverted(res.value, targetOverrideUnit, effective, options);
    }
  }

  if (targetSystem === "metric") {
    // FDA 21 CFR 101.9 metric household volume equivalents (1 tsp=5ml, 1 tbsp=15ml, 1 cup=240ml)
    if (canonicalUnit === "tsp") {
      const ml = Math.round(numericValue * 5);
      return formatConverted(ml, "ml", effective, options);
    }
    if (canonicalUnit === "tbsp") {
      const ml = Math.round(numericValue * 15);
      return formatConverted(ml, "ml", effective, options);
    }
    if (canonicalUnit === "fl oz") {
      const ml = Math.round(numericValue * 30);
      return formatConverted(ml, "ml", effective, options);
    }
    if (canonicalUnit === "cup") {
      const ml = Math.round(numericValue * 240);
      if (options.preferGramsForDry && effective.name) {
        const density = findIngredientDensity(effective.name);
        if (density) {
          const grams = convertVolumeToGrams(ml, density.gramsPerMl);
          if (grams >= 1000) {
            return formatConverted(Math.round((grams / 1000) * 100) / 100, "kg", effective, options);
          }
          return formatConverted(grams, "g", effective, options);
        }
      }
      if (ml >= 1000) {
        return formatConverted(Math.round((ml / 1000) * 100) / 100, "l", effective, options);
      }
      return formatConverted(ml, "ml", effective, options);
    }
    if (canonicalUnit === "pint") {
      const ml = Math.round(numericValue * 473.176473);
      if (ml >= 1000) {
        return formatConverted(Math.round((ml / 1000) * 100) / 100, "l", effective, options);
      }
      return formatConverted(ml, "ml", effective, options);
    }
    if (canonicalUnit === "quart") {
      const l = Math.round(numericValue * 0.946352946 * 100) / 100;
      return formatConverted(l, "l", effective, options);
    }
    if (canonicalUnit === "gallon") {
      const l = Math.round(numericValue * 3.785411784 * 100) / 100;
      return formatConverted(l, "l", effective, options);
    }

    // Weight conversions (NIST Handbook 44 exact definitions)
    if (canonicalUnit === "oz") {
      const grams = Math.round(numericValue * 28.349523125);
      const roundedGrams = grams >= 100 ? Math.round(grams / 5) * 5 : grams;
      if (roundedGrams >= 1000) {
        return formatConverted(Math.round((roundedGrams / 1000) * 100) / 100, "kg", effective, options);
      }
      return formatConverted(roundedGrams, "g", effective, options);
    }
    if (canonicalUnit === "lb") {
      const grams = Math.round(numericValue * 453.59237);
      if (grams >= 1000) {
        return formatConverted(Math.round((grams / 1000) * 100) / 100, "kg", effective, options);
      }
      return formatConverted(grams, "g", effective, options);
    }
  } else {
    // Metric -> US
    if (canonicalUnit === "g") {
      if (numericValue >= 450) {
        const lbs = Math.round((numericValue / 453.59237) * 4) / 4;
        return formatConverted(lbs, "lb", effective, options);
      }
      const oz = Math.round((numericValue / 28.349523125) * 2) / 2;
      return formatConverted(oz, "oz", effective, options);
    }
    if (canonicalUnit === "kg") {
      const lbs = Math.round(numericValue * 2.20462262 * 10) / 10;
      return formatConverted(lbs, "lb", effective, options);
    }
    if (canonicalUnit === "ml") {
      if (numericValue >= 240) {
        const cups = Math.round((numericValue / 240) * 4) / 4;
        return formatConverted(cups, "cup", effective, options);
      }
      if (numericValue >= 15) {
        const tbsp = Math.round((numericValue / 15) * 2) / 2;
        return formatConverted(tbsp, "tbsp", effective, options);
      }
      const tsp = Math.round(numericValue / 5);
      return formatConverted(tsp, "tsp", effective, options);
    }
    if (canonicalUnit === "l") {
      const cups = Math.round(numericValue * 4.22675284 * 4) / 4;
      return formatConverted(cups, "cup", effective, options);
    }
  }

  // Unit does not require conversion
  const formatted = formatQuantityValue(quantity, effective.unit, options);
  const text = `${formatted.formattedQuantity} ${formatted.resolvedUnit || ""} ${effective.name || ""}`.trim();
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
