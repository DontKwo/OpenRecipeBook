export interface OcrParsedRecipe {
  title: string;
  ingredients: string[];
  directions: string[];
}

export function splitOcrRecipeText(rawOcrText: string): OcrParsedRecipe {
  const lines = rawOcrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { title: "Scanned Recipe", ingredients: [], directions: [] };
  }

  // The first prominent non-trivial line is typically the title
  let title = lines[0];
  let currentSection: "unknown" | "ingredients" | "directions" = "unknown";
  const ingredients: string[] = [];
  const directions: string[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    const lower = line.toLowerCase();

    // Section header detection
    if (/^(?:ingredients|what you need|items)\b/i.test(lower)) {
      currentSection = "ingredients";
      continue;
    }
    if (/^(?:directions|instructions|steps|method|preparation|how to make)\b/i.test(lower)) {
      currentSection = "directions";
      continue;
    }

    if (currentSection === "ingredients") {
      ingredients.push(line);
    } else if (currentSection === "directions") {
      directions.push(line);
    } else {
      // Heuristic: lines starting with numbers/fractions or bullet points belong to ingredients
      if (/^[0-9\/\.\u00BD\u00BC\u00BE\u2153\u2154]|\b(?:cups?|tbsp|tsp|oz|lb|cloves?|grams?|pinch)\b/i.test(line)) {
        ingredients.push(line);
      } else if (ingredients.length > 0) {
        // Once ingredients have started, subsequent prose lines are directions
        directions.push(line);
        currentSection = "directions";
      } else {
        // Still near title
        title = `${title} ${line}`.trim();
      }
    }
  }

  return {
    title,
    ingredients,
    directions
  };
}
