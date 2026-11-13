import type { DictionaryIngredient } from "../recipe/types";
import { formatFractionalNumber } from "./formatQuantity";
import { findIngredientDensity } from "./density";

export type VolumeUnit = "tsp" | "tbsp" | "fl oz" | "cup" | "pint" | "quart" | "gallon" | "ml" | "l";
export type WeightUnit = "g" | "kg" | "oz" | "lb";
export type SupportedUnit = VolumeUnit | WeightUnit;

export const VOLUME_UNITS: VolumeUnit[] = ["tsp", "tbsp", "fl oz", "cup", "pint", "quart", "gallon", "ml", "l"];
export const WEIGHT_UNITS: WeightUnit[] = ["g", "kg", "oz", "lb"];
export const ALL_UNITS: SupportedUnit[] = [...VOLUME_UNITS, ...WEIGHT_UNITS];

// Base volume definitions in milliliters (ml)
const VOLUME_TO_ML: Record<VolumeUnit, number> = {
  tsp: 4.92892,
  tbsp: 14.78676,
  "fl oz": 29.57353,
  cup: 236.58824,
  pint: 473.17647,
  quart: 946.35295,
  gallon: 3785.41178,
  ml: 1.0,
  l: 1000.0
};

// Base weight definitions in grams (g)
const WEIGHT_TO_GRAMS: Record<WeightUnit, number> = {
  g: 1.0,
  kg: 1000.0,
  oz: 28.34952,
  lb: 453.59237
};

const UNIT_ALIASES: Record<string, SupportedUnit> = {
  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  t: "tsp",
  tbsp: "tbsp",
  tbsps: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tbs: "tbsp",
  T: "tbsp",
  "fl oz": "fl oz",
  floz: "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  cup: "cup",
  cups: "cup",
  c: "cup",
  pint: "pint",
  pints: "pint",
  pt: "pint",
  quart: "quart",
  quarts: "quart",
  qt: "quart",
  gallon: "gallon",
  gallons: "gallon",
  gal: "gallon",
  ml: "ml",
  mls: "ml",
  milliliter: "ml",
  milliliters: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb"
};

export const normalizeUnitKey = (rawUnit: string): SupportedUnit | null => {
  const trimmed = rawUnit.trim();
  if (trimmed === "T") return "tbsp";
  if (trimmed === "t") return "tsp";
  const clean = trimmed.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  return UNIT_ALIASES[clean] || UNIT_ALIASES[trimmed] || null;
};

export const isVolumeUnit = (unit: SupportedUnit): unit is VolumeUnit => {
  return unit in VOLUME_TO_ML;
};

export const isWeightUnit = (unit: SupportedUnit): unit is WeightUnit => {
  return unit in WEIGHT_TO_GRAMS;
};

export interface ConversionResult {
  success: boolean;
  value: number;
  targetUnit: string;
  formattedAmount: string;
  formattedText: string;
  crossFamily: boolean;
  densityUsed?: number;
  densitySource?: string;
  matchedIngredientName?: string;
  error?: string;
}

export function formatConvertedValue(value: number, unit: SupportedUnit): string {
  // Use mixed fractions for customary volume units
  if (unit === "cup" || unit === "tbsp" || unit === "tsp" || unit === "fl oz" || unit === "lb") {
    const whole = Math.round(value);
    if (Math.abs(value - whole) < 0.06) {
      return whole.toString();
    }
    return formatFractionalNumber(value, true);
  }

  // Integer precision for grams and milliliters
  if (unit === "g" || unit === "ml") {
    return Math.round(value).toString();
  }

  // Rounded decimal for kilograms, liters, ounces
  if (value >= 10) {
    return (Math.round(value * 10) / 10).toString();
  }
  return (Math.round(value * 100) / 100).toString();
}

export function convertIngredientUnit(
  value: number,
  fromUnitRaw: string,
  toUnitRaw: string,
  ingredientName?: string,
  customDensity?: number,
  dictionary?: DictionaryIngredient[]
): ConversionResult {
  const fromUnit = normalizeUnitKey(fromUnitRaw);
  const toUnit = normalizeUnitKey(toUnitRaw);

  if (!fromUnit || !toUnit) {
    return {
      success: false,
      value,
      targetUnit: toUnitRaw,
      formattedAmount: value.toString(),
      formattedText: `${value} ${toUnitRaw}`,
      crossFamily: false,
      error: `Unsupported unit conversion: ${fromUnitRaw} to ${toUnitRaw}`
    };
  }

  // Same unit fast path
  if (fromUnit === toUnit) {
    const formatted = formatConvertedValue(value, toUnit);
    return {
      success: true,
      value,
      targetUnit: toUnit,
      formattedAmount: formatted,
      formattedText: `${formatted} ${toUnit}`,
      crossFamily: false
    };
  }

  const fromIsVolume = isVolumeUnit(fromUnit);
  const toIsVolume = isVolumeUnit(toUnit);
  const fromIsWeight = isWeightUnit(fromUnit);
  const toIsWeight = isWeightUnit(toUnit);

  // 1. Volume to Volume
  if (fromIsVolume && toIsVolume) {
    const ml = value * VOLUME_TO_ML[fromUnit];
    const converted = ml / VOLUME_TO_ML[toUnit];
    const formatted = formatConvertedValue(converted, toUnit);
    return {
      success: true,
      value: converted,
      targetUnit: toUnit,
      formattedAmount: formatted,
      formattedText: `${formatted} ${toUnit}`,
      crossFamily: false
    };
  }

  // 2. Weight to Weight
  if (fromIsWeight && toIsWeight) {
    const grams = value * WEIGHT_TO_GRAMS[fromUnit];
    const converted = grams / WEIGHT_TO_GRAMS[toUnit];
    const formatted = formatConvertedValue(converted, toUnit);
    return {
      success: true,
      value: converted,
      targetUnit: toUnit,
      formattedAmount: formatted,
      formattedText: `${formatted} ${toUnit}`,
      crossFamily: false
    };
  }

  // 3. Cross-family conversion (Volume <-> Weight) using density
  let density = customDensity;
  let source = customDensity ? "Custom Density" : undefined;
  let matchedName: string | undefined;

  if (!density) {
    const found = findIngredientDensity(ingredientName, dictionary);
    if (found) {
      density = found.gramsPerMl;
      source = found.source;
      matchedName = found.matchedName;
    } else {
      // Default liquid density fallback: 1.0 g/ml
      density = 1.0;
      source = "Standard Liquid Density (1.0 g/ml)";
    }
  }

  // Volume -> Weight
  if (fromIsVolume && toIsWeight) {
    const ml = value * VOLUME_TO_ML[fromUnit];
    const grams = ml * density;
    const converted = grams / WEIGHT_TO_GRAMS[toUnit];
    const formatted = formatConvertedValue(converted, toUnit);
    return {
      success: true,
      value: converted,
      targetUnit: toUnit,
      formattedAmount: formatted,
      formattedText: `${formatted} ${toUnit}`,
      crossFamily: true,
      densityUsed: density,
      densitySource: source,
      matchedIngredientName: matchedName
    };
  }

  // Weight -> Volume
  if (fromIsWeight && toIsVolume) {
    const grams = value * WEIGHT_TO_GRAMS[fromUnit];
    const ml = grams / density;
    const converted = ml / VOLUME_TO_ML[toUnit];
    const formatted = formatConvertedValue(converted, toUnit);
    return {
      success: true,
      value: converted,
      targetUnit: toUnit,
      formattedAmount: formatted,
      formattedText: `${formatted} ${toUnit}`,
      crossFamily: true,
      densityUsed: density,
      densitySource: source,
      matchedIngredientName: matchedName
    };
  }

  return {
    success: false,
    value,
    targetUnit: toUnit,
    formattedAmount: value.toString(),
    formattedText: `${value} ${toUnit}`,
    crossFamily: false,
    error: `Could not convert between ${fromUnit} and ${toUnit}`
  };
}

export interface UnitConversionItem {
  unit: SupportedUnit;
  family: "volume" | "weight";
  value: number;
  formattedAmount: string;
  isOriginal: boolean;
}

export interface AllConversionsResult {
  originalValue: number;
  originalUnit: SupportedUnit;
  ingredientName?: string;
  densityUsed?: number;
  densitySource?: string;
  matchedIngredientName?: string;
  volumeConversions: UnitConversionItem[];
  weightConversions: UnitConversionItem[];
}

export function getAllUnitConversions(
  value: number,
  fromUnitRaw: string,
  ingredientName?: string,
  customDensity?: number,
  dictionary?: DictionaryIngredient[]
): AllConversionsResult | null {
  const fromUnit = normalizeUnitKey(fromUnitRaw);
  if (!fromUnit) return null;

  let density = customDensity;
  let source = customDensity ? "Custom" : undefined;
  let matchedName: string | undefined;

  const found = findIngredientDensity(ingredientName, dictionary);
  if (found) {
    density = found.gramsPerMl;
    source = found.source;
    matchedName = found.matchedName;
  } else if (!density) {
    density = 1.0;
    source = "Standard (1.0 g/ml)";
  }

  const volumeConversions: UnitConversionItem[] = VOLUME_UNITS.map((u: VolumeUnit): UnitConversionItem => {
    const res = convertIngredientUnit(value, fromUnit, u, ingredientName, density, dictionary);
    return {
      unit: u,
      family: "volume",
      value: res.value,
      formattedAmount: res.formattedAmount,
      isOriginal: u === fromUnit
    };
  });

  const weightConversions: UnitConversionItem[] = WEIGHT_UNITS.map((u: WeightUnit): UnitConversionItem => {
    const res = convertIngredientUnit(value, fromUnit, u, ingredientName, density, dictionary);
    return {
      unit: u,
      family: "weight",
      value: res.value,
      formattedAmount: res.formattedAmount,
      isOriginal: u === fromUnit
    };
  });

  return {
    originalValue: value,
    originalUnit: fromUnit,
    ingredientName,
    densityUsed: density,
    densitySource: source,
    matchedIngredientName: matchedName,
    volumeConversions,
    weightConversions
  };
}
