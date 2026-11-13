import type { Ingredient, Quantity } from "../recipe/types";

export interface ParsedIngredientResult {
  ingredient: Ingredient;
  confidence: "high" | "low" | "none";
}

const UNICODE_FRACTION_MAP: Record<string, number> = {
  "\u00BD": 0.5,
  "\u00BC": 0.25,
  "\u00BE": 0.75,
  "\u2153": 1 / 3,
  "\u2154": 2 / 3,
  "\u215B": 0.125,
  "\u215C": 0.375,
  "\u215D": 0.625,
  "\u215E": 0.875
};

const NUMBER_WORD_MAP: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  dozen: 12
};

const NON_SCALABLE_PATTERNS: RegExp[] = [
  /\bto taste\b/i,
  /\bas needed\b/i,
  /\bfor garnish\b/i,
  /\bfor serving\b/i
];

export const UNIT_CANONICAL_MAP: Record<string, string> = {
  tsp: "tsp",
  tsps: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tbsps: "tbsp",
  tbs: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
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
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  liters: "l",
  litre: "l",
  litres: "l",
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  clove: "clove",
  cloves: "clove",
  can: "can",
  cans: "can",
  slice: "slice",
  slices: "slice",
  pinch: "pinch",
  pinches: "pinch",
  dash: "dash",
  dashes: "dash"
};

export function parseNumberToken(token: string): number | null {
  const trimmedToken = token.trim();
  if (trimmedToken in UNICODE_FRACTION_MAP) {
    return UNICODE_FRACTION_MAP[trimmedToken];
  }

  const attachedFractionMatch = /^(\d+)([\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E])$/.exec(trimmedToken);
  if (attachedFractionMatch) {
    const wholeValue = parseInt(attachedFractionMatch[1], 10);
    const fractionValue = UNICODE_FRACTION_MAP[attachedFractionMatch[2]] || 0;
    return wholeValue + fractionValue;
  }

  const slashFractionMatch = /^(\d+)\/(\d+)$/.exec(trimmedToken);
  if (slashFractionMatch) {
    const numerator = parseInt(slashFractionMatch[1], 10);
    const denominator = parseInt(slashFractionMatch[2], 10);
    return denominator !== 0 ? numerator / denominator : null;
  }

  const decimalMatch = /^\d+(\.\d+)?$/.exec(trimmedToken);
  if (decimalMatch) {
    return parseFloat(trimmedToken);
  }

  const lowerWord = trimmedToken.toLowerCase();
  if (lowerWord in NUMBER_WORD_MAP) {
    return NUMBER_WORD_MAP[lowerWord];
  }

  return null;
}

export function parseQuantityPrefix(sourceText: string): { quantity?: Quantity; remainingText: string } {
  let cleaned = sourceText.trim();

  // Range matching: e.g. "2-3", "2 to 3", "1 1/2 - 2", "1/2 to 3/4"
  const rangePattern = /^(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E])?)\s*(?:-|to)\s*(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E])?)\b\s*/i;
  const rangeMatch = rangePattern.exec(cleaned);
  if (rangeMatch) {
    const minimumValue = parseSingleQuantityString(rangeMatch[1]);
    const maximumValue = parseSingleQuantityString(rangeMatch[2]);
    if (minimumValue !== null && maximumValue !== null) {
      return {
        quantity: { kind: "range", min: minimumValue, max: maximumValue },
        remainingText: cleaned.substring(rangeMatch[0].length).trim()
      };
    }
  }

  // Mixed number pattern: e.g. "1 1/2" or "1 3/4"
  const mixedPattern = /^(\d+)\s+(\d+\/\d+|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E])\b\s*/;
  const mixedMatch = mixedPattern.exec(cleaned);
  if (mixedMatch) {
    const wholeNumber = parseInt(mixedMatch[1], 10);
    const fractionPart = parseNumberToken(mixedMatch[2]);
    if (fractionPart !== null) {
      return {
        quantity: { kind: "single", value: wholeNumber + fractionPart },
        remainingText: cleaned.substring(mixedMatch[0].length).trim()
      };
    }
  }

  // Word phrases: "a couple of", "a dozen", "half a"
  if (/^a\s+couple\s+of\b\s*/i.test(cleaned)) {
    return {
      quantity: { kind: "single", value: 2 },
      remainingText: cleaned.replace(/^a\s+couple\s+of\b\s*/i, "").trim()
    };
  }
  if (/^a\s+dozen\b\s*/i.test(cleaned)) {
    return {
      quantity: { kind: "single", value: 12 },
      remainingText: cleaned.replace(/^a\s+dozen\b\s*/i, "").trim()
    };
  }

  // Single quantity token
  const singleTokenPattern = /^(\d+\/\d+|\d+(\.\d+)?|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E]|\d+[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E]|[a-zA-Z]+)\b\s*/;
  const singleMatch = singleTokenPattern.exec(cleaned);
  if (singleMatch) {
    const parsedNumber = parseNumberToken(singleMatch[1]);
    if (parsedNumber !== null) {
      return {
        quantity: { kind: "single", value: parsedNumber },
        remainingText: cleaned.substring(singleMatch[0].length).trim()
      };
    }
  }

  return { remainingText: cleaned };
}

function parseSingleQuantityString(expression: string): number | null {
  const mixedMatch = /^(\d+)\s+(\d+\/\d+|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E])$/.exec(expression.trim());
  if (mixedMatch) {
    const wholeValue = parseInt(mixedMatch[1], 10);
    const fractionValue = parseNumberToken(mixedMatch[2]);
    return fractionValue !== null ? wholeValue + fractionValue : null;
  }
  return parseNumberToken(expression);
}

export function parseIngredient(rawText: string, ingredientIdentifier: string = ""): ParsedIngredientResult {
  const trimmedRaw = rawText.trim();
  if (!trimmedRaw) {
    return {
      ingredient: {
        id: ingredientIdentifier,
        raw: rawText,
        scalable: false
      },
      confidence: "none"
    };
  }

  // Check non-scalable indicators
  const isNonScalable = NON_SCALABLE_PATTERNS.some((pattern: RegExp): boolean => pattern.test(trimmedRaw));
  if (isNonScalable) {
    return {
      ingredient: {
        id: ingredientIdentifier,
        raw: rawText,
        scalable: false,
        name: trimmedRaw
      },
      confidence: "high"
    };
  }

  // Handle parenthetical size directly following number: e.g. "1 (14 oz) can tomatoes"
  const parentheticalSizePattern = /^(\d+(?:\s+\d+\/\d+|\/\d+|\.\d+|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E])?)\s+(\([^)]+\))\s+(.*)$/;
  const parentheticalMatch = parentheticalSizePattern.exec(trimmedRaw);
  if (parentheticalMatch) {
    const prefixQuantity = parseSingleQuantityString(parentheticalMatch[1]);
    if (prefixQuantity !== null) {
      const parentheticalNote = parentheticalMatch[2];
      const restOfLine = parentheticalMatch[3];
      const parsedRemainder = parseUnitAndName(restOfLine);
      return {
        ingredient: {
          id: ingredientIdentifier,
          raw: rawText,
          quantity: { kind: "single", value: prefixQuantity },
          unit: parsedRemainder.unit,
          name: parsedRemainder.name,
          note: parentheticalNote + (parsedRemainder.note ? ` ${parsedRemainder.note}` : ""),
          scalable: true
        },
        confidence: "high"
      };
    }
  }

  // Try parsing quantity from start
  const { quantity, remainingText } = parseQuantityPrefix(trimmedRaw);
  if (quantity) {
    const unitAndName = parseUnitAndName(remainingText);
    return {
      ingredient: {
        id: ingredientIdentifier,
        raw: rawText,
        quantity,
        unit: unitAndName.unit,
        name: unitAndName.name,
        note: unitAndName.note,
        scalable: true
      },
      confidence: "high"
    };
  }

  // Try checking "Name, Quantity Unit" format: e.g. "Salt, 1 tsp"
  const commaSeparated = trimmedRaw.split(",");
  if (commaSeparated.length >= 2) {
    const possibleName = commaSeparated[0].trim();
    const possibleMeasure = commaSeparated.slice(1).join(",").trim();
    const measurementParse = parseQuantityPrefix(possibleMeasure);
    if (measurementParse.quantity) {
      const unitAndNote = parseUnitAndName(measurementParse.remainingText);
      return {
        ingredient: {
          id: ingredientIdentifier,
          raw: rawText,
          quantity: measurementParse.quantity,
          unit: unitAndNote.unit,
          name: possibleName,
          note: unitAndNote.note,
          scalable: true
        },
        confidence: "high"
      };
    }
  }

  // Fallback: unscaled raw text
  return {
    ingredient: {
      id: ingredientIdentifier,
      raw: rawText,
      name: trimmedRaw,
      scalable: false
    },
    confidence: "low"
  };
}

function parseUnitAndName(inputString: string): { unit?: string; name: string; note?: string } {
  let workingString = inputString.trim();
  let foundNote: string | undefined;

  // Extract preparation note in parentheses or following comma
  const commaIndex = workingString.indexOf(",");
  if (commaIndex > -1) {
    foundNote = workingString.substring(commaIndex + 1).trim();
    workingString = workingString.substring(0, commaIndex).trim();
  }

  // Check multi-word unit: "fl oz" or "fluid ounce"
  const multiWordUnitPattern = /^(fl(?:uid)?\.?\s+oz\.?)\b\s*(.*)$/i;
  const multiWordMatch = multiWordUnitPattern.exec(workingString);
  if (multiWordMatch) {
    return {
      unit: "fl oz",
      name: multiWordMatch[2].trim(),
      note: foundNote
    };
  }

  // Check first token for single-word unit
  const words = workingString.split(/\s+/);
  if (words.length > 0) {
    const candidateUnit = words[0].toLowerCase().replace(/\.$/, "");
    if (candidateUnit in UNIT_CANONICAL_MAP) {
      const resolvedUnit = UNIT_CANONICAL_MAP[candidateUnit];
      const remainderWords = words.slice(1).join(" ");
      return {
        unit: resolvedUnit,
        name: remainderWords.trim(),
        note: foundNote
      };
    }
  }

  return {
    name: workingString,
    note: foundNote
  };
}
