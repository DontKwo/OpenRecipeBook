import type { DictionaryIngredient } from "../recipe/types";

export interface DensityRecord {
  name: string;
  gramsPerMl: number;
  source: string;
  aliases?: string[];
}

export const DENSITY_TABLE: Record<string, DensityRecord> = {
  // Flours and starches
  "all-purpose-flour": {
    name: "All-Purpose Flour",
    gramsPerMl: 0.53,
    source: "USDA FoodData Central",
    aliases: ["flour", "plain flour", "white flour", "wheat flour", "ap flour"]
  },
  "bread-flour": {
    name: "Bread Flour",
    gramsPerMl: 0.54,
    source: "USDA FoodData Central",
    aliases: ["strong flour", "hard flour"]
  },
  "whole-wheat-flour": {
    name: "Whole Wheat Flour",
    gramsPerMl: 0.51,
    source: "USDA FoodData Central",
    aliases: ["wholemeal flour"]
  },
  "cake-flour": {
    name: "Cake Flour",
    gramsPerMl: 0.47,
    source: "USDA FoodData Central",
    aliases: ["pastry flour"]
  },
  "almond-flour": {
    name: "Almond Flour",
    gramsPerMl: 0.40,
    source: "USDA FoodData Central",
    aliases: ["almond meal", "ground almonds"]
  },
  cornstarch: {
    name: "Cornstarch",
    gramsPerMl: 0.54,
    source: "USDA FoodData Central",
    aliases: ["corn starch", "maizena"]
  },
  "cocoa-powder": {
    name: "Cocoa Powder",
    gramsPerMl: 0.42,
    source: "USDA FoodData Central",
    aliases: ["unsweetened cocoa", "cacao powder"]
  },

  // Sugars and sweeteners
  "granulated-sugar": {
    name: "Granulated Sugar",
    gramsPerMl: 0.85,
    source: "USDA FoodData Central",
    aliases: ["sugar", "white sugar", "cane sugar"]
  },
  "brown-sugar": {
    name: "Brown Sugar",
    gramsPerMl: 0.83,
    source: "USDA FoodData Central",
    aliases: ["light brown sugar", "dark brown sugar"]
  },
  "powdered-sugar": {
    name: "Powdered Sugar",
    gramsPerMl: 0.56,
    source: "USDA FoodData Central",
    aliases: ["confectioners sugar", "icing sugar"]
  },
  honey: {
    name: "Honey",
    gramsPerMl: 1.42,
    source: "USDA FoodData Central",
    aliases: ["raw honey", "clover honey"]
  },
  "maple-syrup": {
    name: "Maple Syrup",
    gramsPerMl: 1.37,
    source: "USDA FoodData Central",
    aliases: ["pancake syrup"]
  },
  molasses: {
    name: "Molasses",
    gramsPerMl: 1.42,
    source: "USDA FoodData Central",
    aliases: ["blackstrap molasses", "treacle"]
  },

  // Fats and oils
  butter: {
    name: "Butter",
    gramsPerMl: 0.96,
    source: "USDA FoodData Central",
    aliases: ["unsalted butter", "salted butter", "margarine"]
  },
  oil: {
    name: "Vegetable / Olive Oil",
    gramsPerMl: 0.92,
    source: "USDA FoodData Central",
    aliases: ["vegetable oil", "canola oil", "olive oil", "sunflower oil", "neutral oil"]
  },
  "coconut-oil": {
    name: "Coconut Oil",
    gramsPerMl: 0.92,
    source: "USDA FoodData Central",
    aliases: ["virgin coconut oil"]
  },

  // Dairy and liquids
  milk: {
    name: "Whole Milk",
    gramsPerMl: 1.03,
    source: "USDA FoodData Central",
    aliases: ["milk", "dairy milk", "cow milk", "2% milk", "skim milk"]
  },
  "heavy-cream": {
    name: "Heavy Cream",
    gramsPerMl: 1.00,
    source: "USDA FoodData Central",
    aliases: ["heavy whipping cream", "double cream", "whipping cream"]
  },
  "sour-cream": {
    name: "Sour Cream",
    gramsPerMl: 1.02,
    source: "USDA FoodData Central",
    aliases: ["creme fraiche"]
  },
  yogurt: {
    name: "Yogurt",
    gramsPerMl: 1.06,
    source: "USDA FoodData Central",
    aliases: ["greek yogurt", "plain yogurt"]
  },
  water: {
    name: "Water / Broth",
    gramsPerMl: 1.00,
    source: "Standard",
    aliases: ["broth", "chicken broth", "vegetable broth", "stock", "coffee", "tea"]
  },

  // Condiments and spreads
  "peanut-butter": {
    name: "Peanut Butter",
    gramsPerMl: 1.15,
    source: "USDA FoodData Central",
    aliases: ["creamy peanut butter", "crunchy peanut butter", "nut butter"]
  },

  // Grains
  "rolled-oats": {
    name: "Rolled Oats",
    gramsPerMl: 0.38,
    source: "USDA FoodData Central",
    aliases: ["oats", "old fashioned oats", "quick oats", "oatmeal"]
  },
  rice: {
    name: "Rice (Uncooked)",
    gramsPerMl: 0.85,
    source: "USDA FoodData Central",
    aliases: ["white rice", "jasmine rice", "basmati rice", "brown rice"]
  },

  // Seasonings
  salt: {
    name: "Table Salt",
    gramsPerMl: 1.20,
    source: "USDA FoodData Central",
    aliases: ["fine salt", "sea salt"]
  },
  "kosher-salt": {
    name: "Kosher Salt",
    gramsPerMl: 0.80,
    source: "USDA FoodData Central",
    aliases: ["coarse salt"]
  },
  "baking-powder": {
    name: "Baking Powder",
    gramsPerMl: 0.90,
    source: "USDA FoodData Central",
    aliases: []
  },
  "baking-soda": {
    name: "Baking Soda",
    gramsPerMl: 0.90,
    source: "USDA FoodData Central",
    aliases: ["bicarbonate of soda"]
  }
};

export function convertVolumeToGrams(volumeMl: number, gramsPerMl: number): number {
  return Math.round(volumeMl * gramsPerMl);
}

export function convertGramsToVolumeMl(grams: number, gramsPerMl: number): number {
  if (gramsPerMl <= 0) return 0;
  return Math.round(grams / gramsPerMl);
}

export function convertFahrenheitToCelsius(fahrenheit: number): number {
  return Math.round(((fahrenheit - 32) * 5) / 9);
}

export function convertCelsiusToFahrenheit(celsius: number): number {
  return Math.round((celsius * 9) / 5 + 32);
}

export function findIngredientDensity(
  ingredientName?: string,
  extraDictionary?: DictionaryIngredient[]
): { gramsPerMl: number; source: string; matchedName: string } | null {
  if (!ingredientName || !ingredientName.trim()) {
    return null;
  }

  // Clean preparation notes and punctuation
  const clean = ingredientName
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\b(chopped|diced|minced|melted|softened|cold|warm|fresh|dried|crushed|sifted|packed|to taste)\b/g, "")
    .trim();

  if (!clean) return null;

  // Check custom or built-in dictionary first
  if (extraDictionary && extraDictionary.length > 0) {
    const dictMatch = extraDictionary.find((item: DictionaryIngredient): boolean => {
      if (!item.gramsPerMl) return false;
      const itemName = item.name.toLowerCase();
      if (clean === itemName || clean.includes(itemName) || itemName.includes(clean)) return true;
      return item.aliases.some((alias: string): boolean => {
        const a = alias.toLowerCase();
        return clean === a || clean.includes(a);
      });
    });

    if (dictMatch && dictMatch.gramsPerMl) {
      return {
        gramsPerMl: dictMatch.gramsPerMl,
        source: dictMatch.densitySource || "Ingredient Dictionary",
        matchedName: dictMatch.name
      };
    }
  }

  // Check built-in density table
  for (const [key, record] of Object.entries(DENSITY_TABLE)) {
    const recName = record.name.toLowerCase();
    const keyName = key.replace(/-/g, " ");

    if (clean === recName || clean === keyName || clean.includes(keyName) || recName.includes(clean)) {
      return { gramsPerMl: record.gramsPerMl, source: record.source, matchedName: record.name };
    }

    if (record.aliases) {
      for (const alias of record.aliases) {
        if (clean === alias || clean.includes(alias) || alias.includes(clean)) {
          return { gramsPerMl: record.gramsPerMl, source: record.source, matchedName: record.name };
        }
      }
    }
  }

  return null;
}
