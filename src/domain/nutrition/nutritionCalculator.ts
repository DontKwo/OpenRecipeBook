import type { Recipe, DictionaryIngredient, Quantity } from "../recipe/types";
import { matchIngredient } from "../ingredients/matcher";

export interface NutrientProfile {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface EstimatedIngredientNutrients {
  ingredientRaw: string;
  ingredientName: string;
  weightGrams: number;
  nutrients: NutrientProfile;
  matched: boolean;
}

export interface RecipeNutritionEstimate {
  perServing: NutrientProfile;
  totalBatch: NutrientProfile;
  servings: number;
  matchedCount: number;
  totalIngredientsCount: number;
  coveragePercent: number;
  items: EstimatedIngredientNutrients[];
}

// USDA FoodData Central reference values per 100 grams
export const USDA_NUTRIENT_DATABASE: Record<string, NutrientProfile> = {
  "all-purpose flour": { calories: 364, protein: 10.3, fat: 1.0, carbs: 76.3, fiber: 2.7, sugar: 0.3, sodium: 2 },
  "flour": { calories: 364, protein: 10.3, fat: 1.0, carbs: 76.3, fiber: 2.7, sugar: 0.3, sodium: 2 },
  "bread flour": { calories: 366, protein: 12.7, fat: 1.3, carbs: 73.8, fiber: 2.4, sugar: 0.3, sodium: 2 },
  "whole wheat flour": { calories: 339, protein: 13.7, fat: 1.9, carbs: 72.6, fiber: 12.2, sugar: 0.4, sodium: 5 },
  "granulated sugar": { calories: 387, protein: 0, fat: 0, carbs: 99.9, fiber: 0, sugar: 99.8, sodium: 1 },
  "sugar": { calories: 387, protein: 0, fat: 0, carbs: 99.9, fiber: 0, sugar: 99.8, sodium: 1 },
  "brown sugar": { calories: 380, protein: 0.1, fat: 0, carbs: 98.1, fiber: 0, sugar: 97.0, sodium: 28 },
  "powdered sugar": { calories: 389, protein: 0, fat: 0, carbs: 99.5, fiber: 0, sugar: 97.7, sodium: 2 },
  "butter": { calories: 717, protein: 0.9, fat: 81.1, carbs: 0.1, fiber: 0, sugar: 0.1, sodium: 643 },
  "unsalted butter": { calories: 717, protein: 0.9, fat: 81.1, carbs: 0.1, fiber: 0, sugar: 0.1, sodium: 11 },
  "whole milk": { calories: 61, protein: 3.2, fat: 3.3, carbs: 4.8, fiber: 0, sugar: 5.1, sodium: 43 },
  "milk": { calories: 61, protein: 3.2, fat: 3.3, carbs: 4.8, fiber: 0, sugar: 5.1, sodium: 43 },
  "egg": { calories: 143, protein: 12.6, fat: 9.5, carbs: 0.7, fiber: 0, sugar: 0.4, sodium: 142 },
  "eggs": { calories: 143, protein: 12.6, fat: 9.5, carbs: 0.7, fiber: 0, sugar: 0.4, sodium: 142 },
  "olive oil": { calories: 884, protein: 0, fat: 100.0, carbs: 0, fiber: 0, sugar: 0, sodium: 2 },
  "vegetable oil": { calories: 884, protein: 0, fat: 100.0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 },
  "canola oil": { calories: 884, protein: 0, fat: 100.0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 },
  "salt": { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 38758 },
  "kosher salt": { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 38758 },
  "rolled oats": { calories: 379, protein: 13.2, fat: 6.5, carbs: 67.7, fiber: 10.1, sugar: 1.0, sodium: 6 },
  "oats": { calories: 379, protein: 13.2, fat: 6.5, carbs: 67.7, fiber: 10.1, sugar: 1.0, sodium: 6 },
  "honey": { calories: 304, protein: 0.3, fat: 0, carbs: 82.4, fiber: 0.2, sugar: 82.1, sodium: 4 },
  "maple syrup": { calories: 260, protein: 0, fat: 0.1, carbs: 67.0, fiber: 0, sugar: 60.5, sodium: 12 },
  "chicken breast": { calories: 165, protein: 31.0, fat: 3.6, carbs: 0, fiber: 0, sugar: 0, sodium: 74 },
  "chicken thigh": { calories: 209, protein: 26.0, fat: 10.9, carbs: 0, fiber: 0, sugar: 0, sodium: 84 },
  "ground beef": { calories: 254, protein: 17.2, fat: 20.0, carbs: 0, fiber: 0, sugar: 0, sodium: 66 },
  "salmon": { calories: 208, protein: 20.4, fat: 13.4, carbs: 0, fiber: 0, sugar: 0, sodium: 59 },
  "yellow onion": { calories: 40, protein: 1.1, fat: 0.1, carbs: 9.3, fiber: 1.7, sugar: 4.2, sodium: 4 },
  "onion": { calories: 40, protein: 1.1, fat: 0.1, carbs: 9.3, fiber: 1.7, sugar: 4.2, sodium: 4 },
  "garlic": { calories: 149, protein: 6.4, fat: 0.5, carbs: 33.1, fiber: 2.1, sugar: 1.0, sodium: 17 },
  "carrot": { calories: 41, protein: 0.9, fat: 0.2, carbs: 9.6, fiber: 2.8, sugar: 4.7, sodium: 69 },
  "celery": { calories: 16, protein: 0.7, fat: 0.2, carbs: 3.0, fiber: 1.6, sugar: 1.3, sodium: 80 },
  "russet potato": { calories: 77, protein: 2.0, fat: 0.1, carbs: 17.5, fiber: 2.2, sugar: 0.8, sodium: 6 },
  "potato": { calories: 77, protein: 2.0, fat: 0.1, carbs: 17.5, fiber: 2.2, sugar: 0.8, sodium: 6 },
  "roma tomato": { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, sugar: 2.6, sodium: 5 },
  "tomato": { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, sugar: 2.6, sodium: 5 },
  "white rice": { calories: 365, protein: 7.1, fat: 0.7, carbs: 80.0, fiber: 1.3, sugar: 0.1, sodium: 5 },
  "black beans": { calories: 341, protein: 21.6, fat: 1.4, carbs: 62.4, fiber: 15.2, sugar: 2.1, sodium: 5 },
  "cheddar cheese": { calories: 403, protein: 24.9, fat: 33.1, carbs: 1.3, fiber: 0, sugar: 0.5, sodium: 621 },
  "parmesan cheese": { calories: 431, protein: 38.5, fat: 28.6, carbs: 4.1, fiber: 0, sugar: 0.9, sodium: 1529 },
  "heavy cream": { calories: 345, protein: 2.8, fat: 37.0, carbs: 2.8, fiber: 0, sugar: 2.9, sodium: 38 },
  "greek yogurt": { calories: 97, protein: 9.0, fat: 5.0, carbs: 4.0, fiber: 0, sugar: 4.0, sodium: 35 },
  "lemon": { calories: 29, protein: 1.1, fat: 0.3, carbs: 9.3, fiber: 2.8, sugar: 2.5, sodium: 2 },
  "lemon juice": { calories: 22, protein: 0.4, fat: 0.2, carbs: 6.9, fiber: 0.3, sugar: 2.5, sodium: 1 },
  "apple": { calories: 52, protein: 0.3, fat: 0.2, carbs: 13.8, fiber: 2.4, sugar: 10.4, sodium: 1 },
  "banana": { calories: 89, protein: 1.1, fat: 0.3, carbs: 22.8, fiber: 2.6, sugar: 12.2, sodium: 1 },
  "blueberry": { calories: 57, protein: 0.7, fat: 0.3, carbs: 14.5, fiber: 2.4, sugar: 9.9, sodium: 1 },
  "blueberries": { calories: 57, protein: 0.7, fat: 0.3, carbs: 14.5, fiber: 2.4, sugar: 9.9, sodium: 1 },
  "chocolate chips": { calories: 479, protein: 4.2, fat: 28.0, carbs: 63.5, fiber: 5.8, sugar: 54.0, sodium: 8 },
  "cocoa powder": { calories: 228, protein: 19.6, fat: 13.7, carbs: 57.9, fiber: 33.2, sugar: 1.8, sodium: 21 },
  "peanut butter": { calories: 588, protein: 25.1, fat: 50.4, carbs: 20.0, fiber: 6.0, sugar: 9.2, sodium: 458 },
  "almonds": { calories: 579, protein: 21.2, fat: 49.9, carbs: 21.6, fiber: 12.5, sugar: 4.4, sodium: 1 },
  "walnuts": { calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7, fiber: 6.7, sugar: 2.6, sodium: 2 },
  "soy sauce": { calories: 53, protein: 8.1, fat: 0.6, carbs: 4.9, fiber: 0.8, sugar: 0.4, sodium: 5493 },
  "baking powder": { calories: 53, protein: 0, fat: 0, carbs: 27.7, fiber: 0, sugar: 0, sodium: 10600 },
  "baking soda": { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 27360 },
  "vanilla extract": { calories: 288, protein: 0.1, fat: 0.1, carbs: 12.7, fiber: 0, sugar: 12.6, sodium: 9 },
  "cinnamon": { calories: 247, protein: 4.0, fat: 1.2, carbs: 80.6, fiber: 53.1, sugar: 2.2, sodium: 10 },
  "black pepper": { calories: 251, protein: 10.4, fat: 3.3, carbs: 64.0, fiber: 25.3, sugar: 0.6, sodium: 20 },
  "pasta": { calories: 371, protein: 13.0, fat: 1.5, carbs: 74.7, fiber: 3.2, sugar: 2.7, sodium: 6 },
  "bread crumbs": { calories: 395, protein: 13.4, fat: 5.3, carbs: 71.9, fiber: 4.5, sugar: 6.1, sodium: 732 },
  "mayonnaise": { calories: 680, protein: 1.0, fat: 74.9, carbs: 0.6, fiber: 0, sugar: 0.6, sodium: 635 },
  "mustard": { calories: 60, protein: 3.7, fat: 3.3, carbs: 5.8, fiber: 3.3, sugar: 0.9, sodium: 1110 },
  "chicken broth": { calories: 15, protein: 2.5, fat: 0.5, carbs: 0.5, fiber: 0, sugar: 0.4, sodium: 343 },
  "beef broth": { calories: 15, protein: 2.5, fat: 0.5, carbs: 0.5, fiber: 0, sugar: 0.4, sodium: 343 },
  "red wine": { calories: 85, protein: 0.1, fat: 0, carbs: 2.6, fiber: 0, sugar: 0.6, sodium: 4 },
  "white wine": { calories: 82, protein: 0.1, fat: 0, carbs: 2.6, fiber: 0, sugar: 1.0, sodium: 5 },
  "water": { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 }
};

// Common piece weights in grams for count-based ingredients
const PIECE_WEIGHTS_GRAMS: Record<string, number> = {
  egg: 50,
  eggs: 50,
  garlic: 3,
  clove: 3,
  cloves: 3,
  onion: 150,
  yellow_onion: 150,
  potato: 200,
  russet_potato: 200,
  carrot: 60,
  lemon: 60,
  apple: 180,
  banana: 120,
  tomato: 120,
  roma_tomato: 90
};

// Convert volume measurement to milliliters
const volumeUnitToMl = (unit: string, amount: number): number | null => {
  const norm = unit.toLowerCase().trim().replace(/s$/, "");
  switch (norm) {
    case "cup":
      return amount * 236.588;
    case "tbsp":
    case "tablespoon":
      return amount * 14.787;
    case "tsp":
    case "teaspoon":
      return amount * 4.929;
    case "fl oz":
    case "fluid ounce":
      return amount * 29.5735;
    case "ml":
    case "milliliter":
      return amount;
    case "l":
    case "liter":
      return amount * 1000;
    case "pint":
    case "pt":
      return amount * 473.176;
    case "quart":
    case "qt":
      return amount * 946.353;
    case "gallon":
    case "gal":
      return amount * 3785.41;
    default:
      return null;
  }
};

// Convert weight measurement to grams
const weightUnitToGrams = (unit: string, amount: number): number | null => {
  const norm = unit.toLowerCase().trim().replace(/s$/, "");
  switch (norm) {
    case "g":
    case "gram":
      return amount;
    case "kg":
    case "kilogram":
      return amount * 1000;
    case "oz":
    case "ounce":
      return amount * 28.3495;
    case "lb":
    case "pound":
      return amount * 453.592;
    default:
      return null;
  }
};

// Extract numeric value from Quantity object
const getQuantityValue = (quantity?: Quantity): number => {
  if (!quantity) return 1;
  if (quantity.kind === "single") return quantity.value;
  return (quantity.min + quantity.max) / 2;
};

// Convert an ingredient line to estimated weight in grams
export const estimateIngredientWeightGrams = (
  quantityValue: number,
  unit: string | undefined,
  dictItem: DictionaryIngredient | null
): number => {
  if (quantityValue <= 0) return 0;

  if (unit) {
    const weightGrams = weightUnitToGrams(unit, quantityValue);
    if (weightGrams !== null) return weightGrams;

    const volumeMl = volumeUnitToMl(unit, quantityValue);
    if (volumeMl !== null) {
      const density = dictItem?.gramsPerMl || 1.0;
      return volumeMl * density;
    }
  }

  // Count-based items
  if (dictItem) {
    const pieceKey = dictItem.id.toLowerCase().replace(/-/g, "_");
    if (PIECE_WEIGHTS_GRAMS[pieceKey]) {
      return quantityValue * PIECE_WEIGHTS_GRAMS[pieceKey];
    }
  }

  return quantityValue * 50;
};

// Calculate proportional nutrients for a given weight
const scaleNutrientProfile = (profile: NutrientProfile, weightGrams: number): NutrientProfile => {
  const factor = weightGrams / 100.0;
  return {
    calories: Math.round(profile.calories * factor * 10) / 10,
    protein: Math.round(profile.protein * factor * 10) / 10,
    fat: Math.round(profile.fat * factor * 10) / 10,
    carbs: Math.round(profile.carbs * factor * 10) / 10,
    fiber: Math.round(profile.fiber * factor * 10) / 10,
    sugar: Math.round(profile.sugar * factor * 10) / 10,
    sodium: Math.round(profile.sodium * factor * 10) / 10
  };
};

// Sum two nutrient profiles together
const addNutrientProfiles = (a: NutrientProfile, b: NutrientProfile): NutrientProfile => {
  return {
    calories: Math.round((a.calories + b.calories) * 10) / 10,
    protein: Math.round((a.protein + b.protein) * 10) / 10,
    fat: Math.round((a.fat + b.fat) * 10) / 10,
    carbs: Math.round((a.carbs + b.carbs) * 10) / 10,
    fiber: Math.round((a.fiber + b.fiber) * 10) / 10,
    sugar: Math.round((a.sugar + b.sugar) * 10) / 10,
    sodium: Math.round((a.sodium + b.sodium) * 10) / 10
  };
};

// Find nutritional profile for a matched dictionary ingredient or ingredient text
export const lookupNutrients = (
  dictItem: DictionaryIngredient | null,
  rawText: string
): NutrientProfile | null => {
  if (dictItem) {
    const cleanId = dictItem.id.toLowerCase().replace(/-/g, " ");
    if (USDA_NUTRIENT_DATABASE[cleanId]) return USDA_NUTRIENT_DATABASE[cleanId];

    const cleanName = dictItem.name.toLowerCase().trim();
    if (USDA_NUTRIENT_DATABASE[cleanName]) return USDA_NUTRIENT_DATABASE[cleanName];

    for (const alias of dictItem.aliases) {
      const cleanAlias = alias.toLowerCase().trim();
      if (USDA_NUTRIENT_DATABASE[cleanAlias]) return USDA_NUTRIENT_DATABASE[cleanAlias];
    }
  }

  const rawLower = rawText.toLowerCase();
  for (const [key, profile] of Object.entries(USDA_NUTRIENT_DATABASE)) {
    if (rawLower.includes(key)) {
      return profile;
    }
  }

  return null;
};

// Calculate nutritional profile for an entire recipe
export const calculateRecipeNutrition = (
  recipe: Recipe,
  multiplier: number = 1,
  dictionary: DictionaryIngredient[] = []
): RecipeNutritionEstimate => {
  const items: EstimatedIngredientNutrients[] = [];
  let totalBatch: NutrientProfile = { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 };
  let matchedCount = 0;
  let totalIngredientsCount = 0;

  for (const group of recipe.ingredientGroups) {
    for (const ing of group.items) {
      totalIngredientsCount += 1;
      const dictItem = matchIngredient(ing.name || ing.raw, dictionary);
      const nutrientsPer100g = lookupNutrients(dictItem, ing.raw);

      const baseVal = getQuantityValue(ing.quantity);
      const scaledVal = ing.scalable ? baseVal * multiplier : baseVal;
      const weightGrams = estimateIngredientWeightGrams(scaledVal, ing.unit, dictItem);

      if (nutrientsPer100g) {
        matchedCount += 1;
        const itemNutrients = scaleNutrientProfile(nutrientsPer100g, weightGrams);
        totalBatch = addNutrientProfiles(totalBatch, itemNutrients);

        items.push({
          ingredientRaw: ing.raw,
          ingredientName: dictItem?.name || ing.name || ing.raw,
          weightGrams: Math.round(weightGrams * 10) / 10,
          nutrients: itemNutrients,
          matched: true
        });
      } else {
        items.push({
          ingredientRaw: ing.raw,
          ingredientName: dictItem?.name || ing.name || ing.raw,
          weightGrams: Math.round(weightGrams * 10) / 10,
          nutrients: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, sugar: 0, sodium: 0 },
          matched: false
        });
      }
    }
  }

  const servings = Math.max(1, (recipe.servings || 4) * multiplier);
  const perServing: NutrientProfile = {
    calories: Math.round(totalBatch.calories / servings),
    protein: Math.round((totalBatch.protein / servings) * 10) / 10,
    fat: Math.round((totalBatch.fat / servings) * 10) / 10,
    carbs: Math.round((totalBatch.carbs / servings) * 10) / 10,
    fiber: Math.round((totalBatch.fiber / servings) * 10) / 10,
    sugar: Math.round((totalBatch.sugar / servings) * 10) / 10,
    sodium: Math.round(totalBatch.sodium / servings)
  };

  const coveragePercent = totalIngredientsCount > 0
    ? Math.round((matchedCount / totalIngredientsCount) * 100)
    : 100;

  return {
    perServing,
    totalBatch,
    servings,
    matchedCount,
    totalIngredientsCount,
    coveragePercent,
    items
  };
};
