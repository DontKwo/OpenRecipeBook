export interface DensityRecord {
  name: string;
  gramsPerMl: number;
  source: string;
}

export const DENSITY_TABLE: Record<string, DensityRecord> = {
  "all-purpose-flour": { name: "All-Purpose Flour", gramsPerMl: 0.53, source: "USDA FoodData Central" },
  "bread-flour": { name: "Bread Flour", gramsPerMl: 0.54, source: "USDA FoodData Central" },
  "whole-wheat-flour": { name: "Whole Wheat Flour", gramsPerMl: 0.51, source: "USDA FoodData Central" },
  "granulated-sugar": { name: "Granulated Sugar", gramsPerMl: 0.85, source: "USDA FoodData Central" },
  "brown-sugar": { name: "Brown Sugar", gramsPerMl: 0.83, source: "USDA FoodData Central" },
  "powdered-sugar": { name: "Powdered Sugar", gramsPerMl: 0.56, source: "USDA FoodData Central" },
  butter: { name: "Butter", gramsPerMl: 0.96, source: "USDA FoodData Central" },
  milk: { name: "Whole Milk", gramsPerMl: 1.03, source: "USDA FoodData Central" },
  oil: { name: "Vegetable / Olive Oil", gramsPerMl: 0.92, source: "USDA FoodData Central" },
  honey: { name: "Honey", gramsPerMl: 1.42, source: "USDA FoodData Central" },
  water: { name: "Water / Broth", gramsPerMl: 1.00, source: "Standard" }
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
