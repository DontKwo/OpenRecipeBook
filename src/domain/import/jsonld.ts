import type { Recipe, IngredientGroup, DirectionGroup, Step } from "../recipe/types";
import { normalizeRecipe } from "../recipe/normalize";

export function parseIsoDuration(duration: string): number {
  if (!duration) return 0;
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i.exec(duration.trim());
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

export function parseSchemaRecipeJsonLd(jsonData: unknown): Recipe[] {
  const recipes: Recipe[] = [];

  const extractFromObject = (obj: Record<string, unknown>) => {
    if (!obj || typeof obj !== "object") return;

    const type = obj["@type"];
    const isRecipe = type === "Recipe" || (Array.isArray(type) && type.includes("Recipe"));

    if (isRecipe) {
      const title = String(obj.name || "Untitled Recipe");
      const description = obj.description ? String(obj.description) : undefined;
      const prepMinutes = obj.prepTime ? parseIsoDuration(String(obj.prepTime)) : undefined;
      const cookMinutes = obj.cookTime ? parseIsoDuration(String(obj.cookTime)) : undefined;
      const totalMinutes = obj.totalTime ? parseIsoDuration(String(obj.totalTime)) : undefined;

      // Parse servings
      let servings = 4;
      if (typeof obj.recipeYield === "number") {
        servings = obj.recipeYield;
      } else if (typeof obj.recipeYield === "string") {
        const yieldMatch = /\d+/.exec(obj.recipeYield);
        if (yieldMatch) {
          servings = parseInt(yieldMatch[0], 10);
        }
      }

      // Ingredients
      const rawIngredients = Array.isArray(obj.recipeIngredient)
        ? obj.recipeIngredient.map(String)
        : [];
      const ingredientGroups: IngredientGroup[] = [
        {
          items: rawIngredients.map((raw, idx) => ({
            id: `ing-${idx + 1}`,
            raw: raw.trim(),
            scalable: true
          }))
        }
      ];

      // Directions
      const steps: Step[] = [];
      const instructions = obj.recipeInstructions;
      if (Array.isArray(instructions)) {
        for (let i = 0; i < instructions.length; i += 1) {
          const item = instructions[i];
          if (typeof item === "string") {
            steps.push({ id: `step-${i + 1}`, text: item.trim() });
          } else if (item && typeof item === "object") {
            const stepObj = item as Record<string, unknown>;
            if (stepObj["@type"] === "HowToStep" && stepObj.text) {
              steps.push({ id: `step-${i + 1}`, text: String(stepObj.text).trim() });
            } else if (stepObj["@type"] === "HowToSection" && Array.isArray(stepObj.itemListElement)) {
              for (const subItem of stepObj.itemListElement as Record<string, unknown>[]) {
                if (subItem && subItem.text) {
                  steps.push({ id: `step-${steps.length + 1}`, text: String(subItem.text).trim() });
                }
              }
            }
          }
        }
      } else if (typeof instructions === "string") {
        const lines = instructions.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        for (let i = 0; i < lines.length; i += 1) {
          steps.push({ id: `step-${i + 1}`, text: lines[i] });
        }
      }

      const directionGroups: DirectionGroup[] = [{ steps }];

      // Courses & categories
      const courses: string[] = [];
      if (obj.recipeCategory) {
        if (Array.isArray(obj.recipeCategory)) {
          courses.push(...obj.recipeCategory.map(String));
        } else {
          courses.push(String(obj.recipeCategory));
        }
      }

      const newRecipe: Recipe = {
        id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        title,
        description,
        sourceUrl: obj.url ? String(obj.url) : undefined,
        servings: Math.max(1, servings),
        prepMinutes,
        cookMinutes,
        totalMinutes,
        ingredientGroups,
        directionGroups,
        cookLog: [],
        courses,
        categories: [],
        collectionIds: [],
        tags: [],
        rating: 0,
        favorite: false,
        photoIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        schemaVersion: 1
      };

      recipes.push(normalizeRecipe(newRecipe));
    }

    // Check @graph or array elements
    if (Array.isArray(obj["@graph"])) {
      for (const node of obj["@graph"] as Record<string, unknown>[]) {
        extractFromObject(node);
      }
    }
  };

  if (Array.isArray(jsonData)) {
    for (const item of jsonData) {
      if (item && typeof item === "object") {
        extractFromObject(item as Record<string, unknown>);
      }
    }
  } else if (jsonData && typeof jsonData === "object") {
    extractFromObject(jsonData as Record<string, unknown>);
  }

  return recipes;
}

export function extractRecipesFromHtml(html: string): Recipe[] {
  const recipes: Recipe[] = [];
  const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = scriptRegex.exec(html);

  while (match !== null) {
    try {
      const content = match[1].trim();
      if (content) {
        const parsed = JSON.parse(content) as unknown;
        const extracted = parseSchemaRecipeJsonLd(parsed);
        recipes.push(...extracted);
      }
    } catch {
      // Ignore invalid JSON-LD blocks
    }
    match = scriptRegex.exec(html);
  }

  return recipes;
}
