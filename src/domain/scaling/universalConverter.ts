import type { DictionaryIngredient } from "../recipe/types";
import { formatFractionalNumber } from "./formatQuantity";
import { findIngredientDensity } from "./density";
import { getConversionConfig, type CustomUnitDefinition } from "./customConversions";

export type VolumeUnit = "tsp" | "tbsp" | "fl oz" | "cup" | "pint" | "quart" | "gallon" | "ml" | "l";
export type WeightUnit = "g" | "kg" | "oz" | "lb";
export type SupportedUnit = VolumeUnit | WeightUnit | string;

export const VOLUME_UNITS: VolumeUnit[] = ["tsp", "tbsp", "fl oz", "cup", "pint", "quart", "gallon", "ml", "l"];
export const WEIGHT_UNITS: WeightUnit[] = ["g", "kg", "oz", "lb"];
export const ALL_UNITS: SupportedUnit[] = [...VOLUME_UNITS, ...WEIGHT_UNITS];

// NIST Handbook 44 exact US customary volume definitions in milliliters (ml)
export const DEFAULT_VOLUME_TO_ML: Record<VolumeUnit, number> = {
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  "fl oz": 29.5735295625,
  cup: 236.5882365,
  pint: 473.176473,
  quart: 946.352946,
  gallon: 3785.411784,
  ml: 1.0,
  l: 1000.0
};

// NIST / International Yard and Pound Agreement exact mass definitions in grams (g)
export const DEFAULT_WEIGHT_TO_GRAMS: Record<WeightUnit, number> = {
  g: 1.0,
  kg: 1000.0,
  oz: 28.349523125,
  lb: 453.59237
};

export const BUILT_IN_UNIT_DEFINITIONS: CustomUnitDefinition[] = [
  { key: "tsp", label: "Teaspoon (US)", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.tsp, aliases: ["tsps", "teaspoon", "teaspoons", "t"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "tbsp", label: "Tablespoon (US)", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.tbsp, aliases: ["tbsps", "tablespoon", "tablespoons", "tbs", "T"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "fl oz", label: "Fluid Ounce (US)", family: "volume", toBase: DEFAULT_VOLUME_TO_ML["fl oz"], aliases: ["floz", "fluid ounce", "fluid ounces"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "cup", label: "Cup (US Customary)", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.cup, aliases: ["cups", "c"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "pint", label: "Pint (US Liquid)", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.pint, aliases: ["pints", "pt"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "quart", label: "Quart (US Liquid)", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.quart, aliases: ["quarts", "qt"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "gallon", label: "Gallon (US Liquid)", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.gallon, aliases: ["gallons", "gal"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "ml", label: "Milliliter", family: "volume", toBase: 1.0, aliases: ["mls", "milliliter", "milliliters", "millilitre", "millilitres"], isBuiltIn: true, source: "SI Metric" },
  { key: "l", label: "Liter", family: "volume", toBase: 1000.0, aliases: ["liter", "liters", "litre", "litres"], isBuiltIn: true, source: "SI Metric" },
  { key: "pinch", label: "Pinch", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.tsp / 16, aliases: ["pinches"], isBuiltIn: true, source: "Culinary Standard (1/16 tsp)" },
  { key: "dash", label: "Dash", family: "volume", toBase: DEFAULT_VOLUME_TO_ML.tsp / 8, aliases: ["dashes"], isBuiltIn: true, source: "Culinary Standard (1/8 tsp)" },
  { key: "g", label: "Gram", family: "weight", toBase: 1.0, aliases: ["gram", "grams"], isBuiltIn: true, source: "SI Metric" },
  { key: "kg", label: "Kilogram", family: "weight", toBase: 1000.0, aliases: ["kilogram", "kilograms"], isBuiltIn: true, source: "SI Metric" },
  { key: "oz", label: "Ounce (Avoirdupois)", family: "weight", toBase: DEFAULT_WEIGHT_TO_GRAMS.oz, aliases: ["ounce", "ounces"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "lb", label: "Pound (Avoirdupois)", family: "weight", toBase: DEFAULT_WEIGHT_TO_GRAMS.lb, aliases: ["lbs", "pound", "pounds"], isBuiltIn: true, source: "NIST Handbook 44" },
  { key: "packet", label: "Packet (Yeast / 7g)", family: "weight", toBase: 7.0, aliases: ["packets", "pack", "packs", "pkg", "pkgs", "envelope", "envelopes", "package", "packages"], isBuiltIn: true, source: "Standard Baking Yeast Packet (1/4 oz / 7g / 2 1/4 tsp)" }
];

export const getEffectiveUnitDefinitions = (): CustomUnitDefinition[] => {
  const config = getConversionConfig();
  const disabledSet = new Set(config.disabledUnits.map((k: string): string => k.toLowerCase()));
  const byKey = new Map<string, CustomUnitDefinition>();

  for (const def of BUILT_IN_UNIT_DEFINITIONS) {
    if (!disabledSet.has(def.key.toLowerCase())) {
      byKey.set(def.key.toLowerCase(), def);
    }
  }

  for (const [key, custom] of Object.entries(config.units)) {
    const cleanKey = key.toLowerCase();
    if (custom.disabled || disabledSet.has(cleanKey)) {
      byKey.delete(cleanKey);
      continue;
    }
    const baseDef = byKey.get(cleanKey);
    byKey.set(cleanKey, {
      ...custom,
      key: cleanKey,
      isBuiltIn: baseDef ? true : custom.isBuiltIn
    });
  }

  return Array.from(byKey.values());
};

export const getEffectiveVolumeUnits = (): string[] => {
  return getEffectiveUnitDefinitions()
    .filter((u: CustomUnitDefinition): boolean => u.family === "volume")
    .map((u: CustomUnitDefinition): string => u.key);
};

export const getEffectiveWeightUnits = (): string[] => {
  return getEffectiveUnitDefinitions()
    .filter((u: CustomUnitDefinition): boolean => u.family === "weight")
    .map((u: CustomUnitDefinition): string => u.key);
};

const getUnitMapEntry = (unitKey: string): CustomUnitDefinition | undefined => {
  const defs = getEffectiveUnitDefinitions();
  return defs.find((u: CustomUnitDefinition): boolean => u.key.toLowerCase() === unitKey.toLowerCase());
};

export const normalizeUnitKey = (rawUnit: string): SupportedUnit | null => {
  const trimmed = rawUnit.trim();
  const defs = getEffectiveUnitDefinitions();
  if (trimmed === "T") {
    return defs.some((u) => u.key === "tbsp") ? "tbsp" : null;
  }
  if (trimmed === "t") {
    return defs.some((u) => u.key === "tsp") ? "tsp" : null;
  }

  const clean = trimmed.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
  for (const def of defs) {
    if (def.key.toLowerCase() === clean || def.key.toLowerCase() === trimmed.toLowerCase()) {
      return def.key;
    }
    for (const alias of def.aliases) {
      const cleanAlias = alias.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
      if (cleanAlias === clean || alias === trimmed) {
        return def.key;
      }
    }
  }

  return null;
};

export const isVolumeUnit = (unit: SupportedUnit): boolean => {
  return getUnitMapEntry(unit)?.family === "volume";
};

export const isWeightUnit = (unit: SupportedUnit): boolean => {
  return getUnitMapEntry(unit)?.family === "weight";
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
  // Use mixed fractions for customary volume and pound measurements
  if (unit === "cup" || unit === "tbsp" || unit === "tsp" || unit === "fl oz" || unit === "lb") {
    const whole = Math.round(value);
    if (Math.abs(value - whole) <= 0.05) {
      return whole.toString();
    }
    return formatFractionalNumber(value, true);
  }

  // Integer precision for grams and milliliters
  if (unit === "g" || unit === "ml") {
    return Math.round(value).toString();
  }

  // Rounded decimal for kilograms, liters, ounces, or custom units
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

  const fromDef = fromUnit ? getUnitMapEntry(fromUnit) : undefined;
  const toDef = toUnit ? getUnitMapEntry(toUnit) : undefined;

  if (!fromUnit || !toUnit || !fromDef || !toDef) {
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

  // 1. Volume to Volume
  if (fromDef.family === "volume" && toDef.family === "volume") {
    const ml = value * fromDef.toBase;
    const converted = ml / toDef.toBase;
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
  if (fromDef.family === "weight" && toDef.family === "weight") {
    const grams = value * fromDef.toBase;
    const converted = grams / toDef.toBase;
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
      density = 1.0;
      source = "Standard Liquid Density (1.0 g/ml)";
    }
  }

  // Volume -> Weight
  if (fromDef.family === "volume" && toDef.family === "weight") {
    const ml = value * fromDef.toBase;
    const grams = ml * density;
    const converted = grams / toDef.toBase;
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
  if (fromDef.family === "weight" && toDef.family === "volume") {
    const grams = value * fromDef.toBase;
    const ml = grams / density;
    const converted = ml / toDef.toBase;
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

  const volumeUnits = getEffectiveVolumeUnits();
  const weightUnits = getEffectiveWeightUnits();

  const volumeConversions: UnitConversionItem[] = volumeUnits.map((u: string): UnitConversionItem => {
    const res = convertIngredientUnit(value, fromUnit, u, ingredientName, density, dictionary);
    return {
      unit: u,
      family: "volume",
      value: res.value,
      formattedAmount: res.formattedAmount,
      isOriginal: u === fromUnit
    };
  });

  const weightConversions: UnitConversionItem[] = weightUnits.map((u: string): UnitConversionItem => {
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
