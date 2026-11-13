import type { Quantity } from "../recipe/types";

export interface FormatOptions {
  unitPromotion?: boolean;
  useVulgarFractions?: boolean;
}

interface CookingFraction {
  decimalValue: number;
  vulgarChar: string;
  asciiFraction: string;
}

const COMMON_FRACTIONS: CookingFraction[] = [
  { decimalValue: 1 / 8, vulgarChar: "\u215B", asciiFraction: "1/8" },
  { decimalValue: 1 / 4, vulgarChar: "\u00BC", asciiFraction: "1/4" },
  { decimalValue: 1 / 3, vulgarChar: "\u2153", asciiFraction: "1/3" },
  { decimalValue: 3 / 8, vulgarChar: "\u215C", asciiFraction: "3/8" },
  { decimalValue: 1 / 2, vulgarChar: "\u00BD", asciiFraction: "1/2" },
  { decimalValue: 5 / 8, vulgarChar: "\u215D", asciiFraction: "5/8" },
  { decimalValue: 2 / 3, vulgarChar: "\u2154", asciiFraction: "2/3" },
  { decimalValue: 3 / 4, vulgarChar: "\u00BE", asciiFraction: "3/4" },
  { decimalValue: 7 / 8, vulgarChar: "\u215E", asciiFraction: "7/8" }
];

export function formatFractionalNumber(value: number, useVulgarFractions: boolean = true): string {
  if (value <= 0) {
    return "0";
  }

  const wholePart = Math.floor(value);
  const fractionalPart = value - wholePart;

  // Exact or near-exact integer
  if (fractionalPart < 0.02) {
    return wholePart.toString();
  }
  if (fractionalPart > 0.98) {
    return (wholePart + 1).toString();
  }

  // Find matching cooking fraction within tolerance
  let closestFraction: CookingFraction | null = null;
  let smallestDelta = 0.035;

  for (const fractionItem of COMMON_FRACTIONS) {
    const delta = Math.abs(fractionalPart - fractionItem.decimalValue);
    if (delta < smallestDelta) {
      smallestDelta = delta;
      closestFraction = fractionItem;
    }
  }

  if (closestFraction) {
    const fractionString = useVulgarFractions ? closestFraction.vulgarChar : closestFraction.asciiFraction;
    if (wholePart === 0) {
      return fractionString;
    }
    return `${wholePart} ${fractionString}`;
  }

  // Fallback to sensible decimal rounding
  const roundedDecimal = Math.round(value * 100) / 100;
  return roundedDecimal.toString();
}

export function formatMetricNumber(value: number, unit: string): string {
  if (unit === "g") {
    if (value >= 100) {
      return (Math.round(value / 5) * 5).toString();
    }
    return Math.round(value).toString();
  }
  if (unit === "ml") {
    if (value >= 50) {
      return (Math.round(value / 5) * 5).toString();
    }
    return Math.round(value).toString();
  }
  if (unit === "kg" || unit === "l") {
    return (Math.round(value * 100) / 100).toString();
  }
  return formatFractionalNumber(value);
}

export function promoteUnit(
  amount: number,
  unit?: string
): { amount: number; unit?: string } {
  if (!unit) {
    return { amount, unit };
  }

  const lowerUnit = unit.toLowerCase();

  // Volume promotions: 3 tsp -> 1 tbsp, 4 tbsp -> 1/4 cup, 16 tbsp -> 1 cup, 8 fl oz -> 1 cup
  if (lowerUnit === "tsp" && amount >= 3) {
    const tablespoons = amount / 3;
    if (tablespoons >= 4) {
      return { amount: tablespoons / 16, unit: "cup" };
    }
    return { amount: tablespoons, unit: "tbsp" };
  }

  if (lowerUnit === "tbsp" && amount >= 4) {
    return { amount: amount / 16, unit: "cup" };
  }

  if (lowerUnit === "fl oz" && amount >= 8) {
    return { amount: amount / 8, unit: "cup" };
  }

  // Weight promotion: 16 oz -> 1 lb
  if (lowerUnit === "oz" && amount >= 16) {
    return { amount: amount / 16, unit: "lb" };
  }

  return { amount, unit };
}

export function pluralizeUnit(unitName: string, amount: number): string {
  if (amount === 1) {
    return unitName;
  }

  // Abbreviations remain unchanged
  const invariantUnits = new Set(["tsp", "tbsp", "fl oz", "oz", "lb", "ml", "l", "g", "kg", "pt", "qt", "gal"]);
  if (invariantUnits.has(unitName)) {
    return unitName;
  }

  // Irregular plurals
  if (unitName === "clove") {
    return "cloves";
  }
  if (unitName === "can") {
    return "cans";
  }
  if (unitName === "slice") {
    return "slices";
  }
  if (unitName === "pinch") {
    return "pinches";
  }
  if (unitName === "dash") {
    return "dashes";
  }
  if (unitName === "cup") {
    return "cups";
  }
  if (unitName === "pint") {
    return "pints";
  }
  if (unitName === "quart") {
    return "quarts";
  }
  if (unitName === "gallon") {
    return "gallons";
  }
  if (unitName === "package") {
    return "packages";
  }

  return `${unitName}s`;
}

export function formatQuantityValue(
  quantity: Quantity,
  unit?: string,
  options: FormatOptions = {}
): { formattedQuantity: string; resolvedUnit?: string } {
  const shouldPromote = options.unitPromotion ?? true;
  const useVulgar = options.useVulgarFractions ?? true;

  if (quantity.kind === "range") {
    const formattedMin = formatFractionalNumber(quantity.min, useVulgar);
    const formattedMax = formatFractionalNumber(quantity.max, useVulgar);
    const resolvedUnit = unit ? pluralizeUnit(unit, quantity.max) : undefined;
    return {
      formattedQuantity: `${formattedMin} to ${formattedMax}`,
      resolvedUnit
    };
  }

  let finalAmount = quantity.value;
  let finalUnit = unit;

  if (shouldPromote && unit) {
    const promoted = promoteUnit(finalAmount, unit);
    finalAmount = promoted.amount;
    finalUnit = promoted.unit;
  }

  const isMetric = finalUnit === "g" || finalUnit === "kg" || finalUnit === "ml" || finalUnit === "l";
  const formattedQuantity = isMetric
    ? formatMetricNumber(finalAmount, finalUnit || "")
    : formatFractionalNumber(finalAmount, useVulgar);

  const resolvedUnit = finalUnit ? pluralizeUnit(finalUnit, finalAmount) : undefined;

  return {
    formattedQuantity,
    resolvedUnit
  };
}
