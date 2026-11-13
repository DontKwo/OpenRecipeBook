import { parseIsoDuration } from "./jsonld";

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

const INGREDIENT_HEADER_REGEX = /^(?:ingredients?|what you('?ll)? need|grocery list|items?)\b:?$/i;
const DIRECTION_HEADER_REGEX = /^(?:directions?|instructions?|steps?|method|preparation|how to (make|cook)|procedure)\b:?$/i;
const NOTES_HEADER_REGEX = /^(?:notes?|cook'?s? notes?|tips?|chef'?s? notes?|serving suggestions?)\b:?$/i;
const TIME_REGEX = /(?:(\d+)\s*(?:hrs?|hours?))?\s*(?:(\d+)\s*(?:mins?|minutes?))?/i;

function parseTimeString(timeText: string): number | undefined {
  if (!timeText) return undefined;
  if (/PT/i.test(timeText)) {
    return parseIsoDuration(timeText);
  }
  const match = TIME_REGEX.exec(timeText.trim());
  if (!match) return undefined;
  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

export function parsePlainTextRecipe(rawText: string): ParsedTextRecipe {
  const lines = rawText
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0);

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

    // Detect URL
    if (/^https?:\/\/[^\s]+$/i.test(line)) {
      sourceUrl = line;
      continue;
    }

    // Detect Servings/Yield
    const servingsMatch = /^(?:servings?|yield|makes)\b[:\s]*(?:about\s*)?(\d+)/i.exec(line);
    if (servingsMatch) {
      servings = parseInt(servingsMatch[1], 10);
      continue;
    }

    // Detect Times
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

    // Check primary section headers
    if (INGREDIENT_HEADER_REGEX.test(line)) {
      flushDirectionGroup();
      currentSection = "ingredients";
      hasExplicitIngredientHeader = true;
      currentIngHeading = undefined;
      continue;
    }

    if (DIRECTION_HEADER_REGEX.test(line)) {
      flushIngredientGroup();
      currentSection = "directions";
      currentDirHeading = undefined;
      continue;
    }

    if (NOTES_HEADER_REGEX.test(line)) {
      flushIngredientGroup();
      flushDirectionGroup();
      currentSection = "notes";
      continue;
    }

    // Handle Header Area (Title and Description)
    if (currentSection === "header") {
      if (!title) {
        title = line.replace(/^[#*=\-\s]+/, "").replace(/[#*=\-\s]+$/, "");
        continue;
      }
      // Heuristic: line starting with quantity or fraction switches to ingredients
      if (/^[0-9\/\.\u00BD\u00BC\u00BE\u2153\u2154]|\b(?:cups?|tbsp|tsp|oz|lb|cloves?|grams?)\b/i.test(line)) {
        currentSection = "ingredients";
      } else if (!description) {
        description = line;
        continue;
      }
    }

    // Sub-headings inside Ingredients (e.g. "For the sauce:")
    if (currentSection === "ingredients") {
      if (line.endsWith(":") && !/^[0-9\/\.]/.test(line)) {
        flushIngredientGroup();
        currentIngHeading = line.replace(/:$/, "").trim();
        continue;
      }

      // Check transition to directions when no explicit header was provided
      const looksLikeIngredient = /^[0-9\/\.\u00BD\u00BC\u00BE\u2153\u2154*\u2022\u002D\u2013\u2014]|\b(?:cups?|tbsp|tsp|oz|lb|cloves?|grams?|pinch|dash)\b/i.test(line);
      if (!hasExplicitIngredientHeader && currentIngItems.length > 0 && !looksLikeIngredient) {
        flushIngredientGroup();
        currentSection = "directions";
        const cleanStep = line.replace(/^(?:step\s*)?\d+[\.\)\:\-]\s*/i, "").trim();
        if (cleanStep) {
          currentDirSteps.push(cleanStep);
        }
        continue;
      }

      // Clean bullet points
      const cleanLine = line.replace(/^[\s*\u2022\u002D\u2013\u2014]+\s*/, "").trim();
      if (cleanLine) {
        currentIngItems.push(cleanLine);
      }
      continue;
    }

    // Sub-headings inside Directions (e.g. "Assembly:")
    if (currentSection === "directions") {
      if (line.endsWith(":") && !/^\d+[\.:]/.test(line) && line.length < 40) {
        flushDirectionGroup();
        currentDirHeading = line.replace(/:$/, "").trim();
        continue;
      }
      // Clean leading step numbers
      const cleanStep = line.replace(/^(?:step\s*)?\d+[\.\)\:\-]\s*/i, "").trim();
      if (cleanStep) {
        currentDirSteps.push(cleanStep);
      }
      continue;
    }

    // Notes
    if (currentSection === "notes") {
      noteLines.push(line);
    }
  }

  flushIngredientGroup();
  flushDirectionGroup();

  // If no sections were explicitly identified, partition heuristically
  if (ingredientGroups.length === 0 && directionGroups.length === 0) {
    const rawIngs: string[] = [];
    const rawSteps: string[] = [];

    for (let i = (title ? 1 : 0); i < lines.length; i += 1) {
      const line = lines[i];
      if (/^[0-9\/\.\u00BD\u00BC\u00BE\u2153\u2154]|\b(?:cups?|tbsp|tsp|oz|lb|cloves?|grams?|pinch)\b/i.test(line)) {
        rawIngs.push(line.replace(/^[\s*\u2022\u002D\u2013\u2014]+\s*/, "").trim());
      } else {
        const cleanStep = line.replace(/^(?:step\s*)?\d+[\.\)\:\-]\s*/i, "").trim();
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
