import type { Recipe } from "../recipe/types";
import { scaleIngredient } from "./scaleIngredient";
import { convertIngredientUnitSystem, type UnitSystem } from "./unitConverter";
import { parseIngredient } from "./parseIngredient";

export function scaleRecipeServings(recipe: Recipe, multiplier: number): Recipe {
  if (multiplier === 1) return recipe;
  return {
    ...recipe,
    servings: Math.max(1, Math.round(recipe.servings * multiplier)),
    ingredientGroups: recipe.ingredientGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const scaled = scaleIngredient(item, multiplier);
        return {
          ...item,
          raw: scaled.formattedText,
          quantity: scaled.scaledQuantity ?? item.quantity
        };
      })
    }))
  };
}

export function convertIngredientSystem(raw: string, targetSystem: "US" | "Metric"): string {
  const parsed = parseIngredient(raw);
  const sys: UnitSystem = targetSystem.toLowerCase() === "metric" ? "metric" : "us";
  const result = convertIngredientUnitSystem(parsed.ingredient, sys);
  return result.formattedText;
}
