import { parseIsoDuration, unescapeHtmlEntities } from "./jsonld";

export interface ParsedTextIngredientGroup {
  heading?: string;
  items: string[];
}

export interface ParsedTextDirectionGroup {
  heading?: string;
  steps: string[];
}

export interface ParsedTextRecipe {
  title: string;
  description?: string;
  servings?: number;
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;
  ingredientGroups: ParsedTextIngredientGroup[];
  directionGroups: ParsedTextDirectionGroup[];
  notes?: string;
  sourceUrl?: string;
}

const INGREDIENT_HEADER_REGEX = /^(?:ingredients?|what you(?:'?ll)? need|grocery list|items?)(?:\s*\([^)]*\))?(?:\s+(?:us\s*customary|metric|1x|2x|3x))*[:\s]*$/i;
const DIRECTION_HEADER_REGEX = /^(?:directions?|instructions?|cooking instructions?|steps?|method(?:\s*\/\s*preparation)?|preparation|how to (?:make|cook)|procedure)[:\s]*$/i;
const NOTES_HEADER_REGEX = /^(?:notes?|cook'?s? notes?|tips?|chef'?s? notes?|serving suggestions?)[:\s]*$/i;
const TIME_REGEX = /(?:(\d+(?:\.\d+)?)\s*(?:hrs?|hours?|h))?\s*(?:,\s*)?(?:(\d+)\s*(?:mins?|minutes?|m))?/i;
const UI_NOISE_REGEX = /^(?:jump to recipe|print recipe|pin recipe|save recipe|share|us customary\s*-?\s*metric|us customary|metric|1x\s+2x\s+3x|1x|2x|3x|advertisement|cook mode|prevent screen from sleeping|read more|\d+(?:\.\d+)?\s*(?:stars?|out of 5)|\d+\s*reviews?)$/i;
const FRAC_AND_DIGIT_PREFIX_REGEX = /^(?:\d+[\d\s\/\.\-]*|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E\u2155\u2156\u2157\u2158\u2159\u215A])/;
const QUANTITY_ONLY_LINE_REGEX = /^(?:[\[\]()\s]*(?:\d+(?:[\s\-/]+\d+|\.\d+)?|[\u00BD\u00BC\u00BE\u2153\u2154\u215B\u215C\u215D\u215E\u2155-\u215A]))(?:\s*(?:cups?|tbsp\.?|tablespoons?|tsp\.?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|l|cloves?|cans?|packages?|pkgs?|sticks?|sprigs?|bunches?|slices?|heads?|stalks?|pinch|dash))?$/i;
const INGREDIENT_UNIT_HINT_REGEX = /\b(?:cups?|tbsp\.?|tablespoons?|tsp\.?|teaspoons?|oz|ounces?|lbs?|pounds?|cloves?|grams?|kg|ml|cans?|packages?|pkgs?|sticks?|sprigs?|bunches?|slices?|heads?|stalks?|pinch|dash)\b/i;

function parseTimeString(timeText: string): number | undefined {
  if (!timeText) return undefined;
  if (/PT/i.test(timeText)) {
    const val = parseIsoDuration(timeText);
    return val > 0 ? val : undefined;
  }
  const match = TIME_REGEX.exec(timeText.trim());
  if (!match) return undefined;
  const hours = match[1] ? Math.round(parseFloat(match[1]) * 60) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const total = hours + minutes;
  return total > 0 ? total : undefined;
}

function cleanBulletPrefix(line: string): string {
  return line
    .replace(/^(?:\[[ xX]?\]\s*)+/, "")
    .replace(/^[\s*\u2022\u002D\u2013\u2014\u2610\u25A2\u25A1\u25AA\u25E6\u00B7\u2713\u2714]+/, "")
    .trim();
}

function looksLikeNumberedDirection(line: string): boolean {
  if (/^(?:step\s*#?\s*\d+|\d+[\.\)]\s+[a-zA-Z])/i.test(line)) {
    return !INGREDIENT_UNIT_HINT_REGEX.test(line);
  }
  return false;
}

function looksLikeStandaloneStepHeader(line: string): boolean {
  return /^step\s*#?\s*\d+$/i.test(line.trim());
}

function stripStepPrefix(line: string): string {
  return line.replace(/^(?:step\s*#?\s*)?\d+[\.\)\:\-]\s*/i, "").trim();
}

function preprocessLines(rawText: string): string[] {
  const decoded = unescapeHtmlEntities(rawText).replace(/\u2044/g, "/");
  const rawLines = decoded
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0 && !UI_NOISE_REGEX.test(line));

  const merged: string[] = [];
  for (let i = 0; i < rawLines.length; i += 1) {
    const curr = cleanBulletPrefix(rawLines[i]);
    if (!curr) {
      merged.push(rawLines[i]);
      continue;
    }
    const labelOnlyMatch = /^(?:servings?|yield|makes|prep(?:\s*time)?|(?:cook|bake|roast)(?:\s*time)?|total(?:\s*time)?)\s*:$/i.test(curr);
    if (labelOnlyMatch && i + 1 < rawLines.length) {
      merged.push(`${curr} ${rawLines[i + 1]}`);
      i += 1;
      continue;
    }
    if (QUANTITY_ONLY_LINE_REGEX.test(curr) && i + 1 < rawLines.length) {
      const nextLine = cleanBulletPrefix(rawLines[i + 1]);
      if (nextLine && !INGREDIENT_HEADER_REGEX.test(nextLine) && !DIRECTION_HEADER_REGEX.test(nextLine)) {
        merged.push(`${curr} ${nextLine}`.trim());
        i += 1;
        continue;
      }
    }
    merged.push(rawLines[i]);
  }
  return merged;
}

export function parsePlainTextRecipe(rawText: string): ParsedTextRecipe {
  const lines = preprocessLines(rawText);

  if (lines.length === 0) {
    return {
      title: "Untitled Recipe",
      ingredientGroups: [{ items: [] }],
      directionGroups: [{ steps: [] }]
    };
  }

  let title = "";
  let description: string | undefined;
  let servings: number | undefined;
  let prepMinutes: number | undefined;
  let cookMinutes: number | undefined;
  let totalMinutes: number | undefined;
  let sourceUrl: string | undefined;

  let currentSection: "header" | "ingredients" | "directions" | "notes" = "header";
  let hasExplicitIngredientHeader = false;
  let currentIngHeading: string | undefined;
  let currentIngItems: string[] = [];
  const ingredientGroups: ParsedTextIngredientGroup[] = [];

  let currentDirHeading: string | undefined;
  let currentDirSteps: string[] = [];
  const directionGroups: ParsedTextDirectionGroup[] = [];

  const noteLines: string[] = [];

  const flushIngredientGroup = (): void => {
    if (currentIngItems.length > 0) {
      ingredientGroups.push({
        heading: currentIngHeading,
        items: [...currentIngItems]
      });
      currentIngItems = [];
    }
  };

  const flushDirectionGroup = (): void => {
    if (currentDirSteps.length > 0) {
      directionGroups.push({
        heading: currentDirHeading,
        steps: [...currentDirSteps]
      });
      currentDirSteps = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (/^https?:\/\/[^\s]+$/i.test(line)) {
      sourceUrl = line;
      continue;
    }

    const servingsMatch = /^(?:servings?|yield|makes)\b[:\s]*(?:about\s*|makes\s*|serves\s*)?(\d+)/i.exec(line);
    if (servingsMatch) {
      servings = parseInt(servingsMatch[1], 10);
      continue;
    }

    const prepMatch = /^prep(?:\s*time)?[:\s]+(.+)$/i.exec(line);
    if (prepMatch) {
      prepMinutes = parseTimeString(prepMatch[1]);
      continue;
    }

    const cookMatch = /^(?:cook|bake|roast)(?:\s*time)?[:\s]+(.+)$/i.exec(line);
    if (cookMatch) {
      cookMinutes = parseTimeString(cookMatch[1]);
      continue;
    }

    const totalMatch = /^total(?:\s*time)?[:\s]+(.+)$/i.exec(line);
    if (totalMatch) {
      totalMinutes = parseTimeString(totalMatch[1]);
      continue;
    }

    const cleanHeaderLine = line.replace(/^[#*_\-\s]+/, "").replace(/[#*_\-\s]+$/, "");
    if (INGREDIENT_HEADER_REGEX.test(cleanHeaderLine)) {
      flushDirectionGroup();
      currentSection = "ingredients";
      hasExplicitIngredientHeader = true;
      currentIngHeading = undefined;
      continue;
    }

    if (DIRECTION_HEADER_REGEX.test(cleanHeaderLine)) {
      flushIngredientGroup();
      currentSection = "directions";
      currentDirHeading = undefined;
      continue;
    }

    if (NOTES_HEADER_REGEX.test(cleanHeaderLine)) {
      flushIngredientGroup();
      flushDirectionGroup();
      currentSection = "notes";
      continue;
    }

    if (currentSection === "header") {
      if (!title) {
        title = line.replace(/^[#*=\-\s]+/, "").replace(/[#*=\-\s]+$/, "");
        continue;
      }
      const cleanedProbe = cleanBulletPrefix(line);
      if (looksLikeNumberedDirection(cleanedProbe)) {
        currentSection = "directions";
        const cleanStep = stripStepPrefix(cleanedProbe);
        if (cleanStep) currentDirSteps.push(cleanStep);
        continue;
      }
      if (FRAC_AND_DIGIT_PREFIX_REGEX.test(cleanedProbe) || INGREDIENT_UNIT_HINT_REGEX.test(cleanedProbe)) {
        currentSection = "ingredients";
      } else if (!description) {
        description = line;
        continue;
      }
    }

    if (currentSection === "ingredients") {
      const cleanedIng = cleanBulletPrefix(line);
      if (line.endsWith(":") && !/^[0-9\/\.]/.test(cleanedIng)) {
        flushIngredientGroup();
        currentIngHeading = line.replace(/:$/, "").trim();
        continue;
      }

      const looksLikeIngredient =
        (!looksLikeNumberedDirection(cleanedIng) && FRAC_AND_DIGIT_PREFIX_REGEX.test(cleanedIng)) ||
        INGREDIENT_UNIT_HINT_REGEX.test(cleanedIng);
      if (!hasExplicitIngredientHeader && currentIngItems.length > 0 && !looksLikeIngredient) {
        flushIngredientGroup();
        currentSection = "directions";
        if (looksLikeStandaloneStepHeader(cleanedIng)) continue;
        const cleanStep = stripStepPrefix(cleanedIng);
        if (cleanStep) {
          currentDirSteps.push(cleanStep);
        }
        continue;
      }

      if (cleanedIng) {
        currentIngItems.push(cleanedIng);
      }
      continue;
    }

    if (currentSection === "directions") {
      if (looksLikeStandaloneStepHeader(line)) {
        continue;
      }
      if (line.endsWith(":") && !/^\d+[\.:]/.test(line) && line.length < 40) {
        flushDirectionGroup();
        currentDirHeading = line.replace(/:$/, "").trim();
        continue;
      }
      const cleanStep = stripStepPrefix(cleanBulletPrefix(line));
      if (cleanStep) {
        currentDirSteps.push(cleanStep);
      }
      continue;
    }

    if (currentSection === "notes") {
      noteLines.push(line);
    }
  }

  flushIngredientGroup();
  flushDirectionGroup();

  if (ingredientGroups.length === 0 && directionGroups.length === 0) {
    const rawIngs: string[] = [];
    const rawSteps: string[] = [];

    for (let i = title ? 1 : 0; i < lines.length; i += 1) {
      const cleaned = cleanBulletPrefix(lines[i]);
      if (!cleaned || looksLikeStandaloneStepHeader(cleaned)) continue;
      if (!looksLikeNumberedDirection(cleaned) && (FRAC_AND_DIGIT_PREFIX_REGEX.test(cleaned) || INGREDIENT_UNIT_HINT_REGEX.test(cleaned))) {
        rawIngs.push(cleaned);
      } else {
        const cleanStep = stripStepPrefix(cleaned);
        if (cleanStep) rawSteps.push(cleanStep);
      }
    }

    if (rawIngs.length > 0) {
      ingredientGroups.push({ items: rawIngs });
    }
    if (rawSteps.length > 0) {
      directionGroups.push({ steps: rawSteps });
    }
  }

  return {
    title: title || "Imported Recipe",
    description,
    servings,
    prepMinutes,
    cookMinutes,
    totalMinutes,
    sourceUrl,
    ingredientGroups: ingredientGroups.length > 0 ? ingredientGroups : [{ items: [] }],
    directionGroups: directionGroups.length > 0 ? directionGroups : [{ steps: [] }],
    notes: noteLines.length > 0 ? noteLines.join("\n") : undefined
  };
}
