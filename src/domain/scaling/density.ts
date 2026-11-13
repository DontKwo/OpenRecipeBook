import type { DictionaryIngredient } from "../recipe/types";

export interface DensityRecord {
  name: string;
  category: string;
  gramsPerMl: number;
  source: string;
  aliases?: string[];
}

export const DENSITY_TABLE: Record<string, DensityRecord> = {
  // Flours & Starches
  "all-purpose-flour": {
    name: "All-Purpose Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.53,
    source: "USDA FoodData Central",
    aliases: ["flour", "plain flour", "white flour", "wheat flour", "ap flour"]
  },
  "bread-flour": {
    name: "Bread Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.54,
    source: "USDA FoodData Central",
    aliases: ["strong flour", "hard flour"]
  },
  "whole-wheat-flour": {
    name: "Whole Wheat Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.51,
    source: "USDA FoodData Central",
    aliases: ["wholemeal flour", "graham flour"]
  },
  "cake-flour": {
    name: "Cake Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.47,
    source: "USDA FoodData Central",
    aliases: ["pastry flour", "soft flour"]
  },
  "pastry-flour": {
    name: "Pastry Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.49,
    source: "USDA FoodData Central",
    aliases: ["white pastry flour"]
  },
  "almond-flour": {
    name: "Almond Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.40,
    source: "USDA FoodData Central",
    aliases: ["almond meal", "ground almonds"]
  },
  "coconut-flour": {
    name: "Coconut Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.54,
    source: "USDA FoodData Central",
    aliases: []
  },
  "rye-flour": {
    name: "Rye Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.43,
    source: "USDA FoodData Central",
    aliases: ["dark rye flour", "medium rye flour"]
  },
  "oat-flour": {
    name: "Oat Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.39,
    source: "USDA FoodData Central",
    aliases: []
  },
  "tapioca-flour": {
    name: "Tapioca Starch / Flour",
    category: "Flours & Starches",
    gramsPerMl: 0.48,
    source: "USDA FoodData Central",
    aliases: ["tapioca flour", "tapioca starch", "cassava flour"]
  },
  cornstarch: {
    name: "Cornstarch",
    category: "Flours & Starches",
    gramsPerMl: 0.54,
    source: "USDA FoodData Central",
    aliases: ["corn starch", "maizena"]
  },
  "potato-starch": {
    name: "Potato Starch",
    category: "Flours & Starches",
    gramsPerMl: 0.64,
    source: "USDA FoodData Central",
    aliases: ["potato flour"]
  },
  arrowroot: {
    name: "Arrowroot Powder",
    category: "Flours & Starches",
    gramsPerMl: 0.54,
    source: "USDA FoodData Central",
    aliases: ["arrowroot starch", "arrowroot"]
  },
  "cocoa-powder": {
    name: "Cocoa Powder (Natural)",
    category: "Flours & Starches",
    gramsPerMl: 0.42,
    source: "USDA FoodData Central",
    aliases: ["unsweetened cocoa", "cacao powder", "cocoa"]
  },
  "dutch-cocoa": {
    name: "Dutch-Process Cocoa",
    category: "Flours & Starches",
    gramsPerMl: 0.44,
    source: "USDA FoodData Central",
    aliases: ["dutch cocoa", "alkalized cocoa"]
  },

  // Sugars & Sweeteners
  "granulated-sugar": {
    name: "Granulated Sugar",
    category: "Sugars & Sweeteners",
    gramsPerMl: 0.85,
    source: "USDA FoodData Central",
    aliases: ["sugar", "white sugar", "cane sugar", "table sugar"]
  },
  "brown-sugar": {
    name: "Brown Sugar (Packed)",
    category: "Sugars & Sweeteners",
    gramsPerMl: 0.88,
    source: "USDA FoodData Central",
    aliases: ["brown sugar", "light brown sugar", "dark brown sugar", "packed brown sugar"]
  },
  "powdered-sugar": {
    name: "Powdered Sugar",
    category: "Sugars & Sweeteners",
    gramsPerMl: 0.50,
    source: "USDA FoodData Central",
    aliases: ["confectioners sugar", "icing sugar", "10x sugar"]
  },
  honey: {
    name: "Honey",
    category: "Sugars & Sweeteners",
    gramsPerMl: 1.42,
    source: "USDA FoodData Central",
    aliases: ["raw honey", "clover honey"]
  },
  "maple-syrup": {
    name: "Maple Syrup",
    category: "Sugars & Sweeteners",
    gramsPerMl: 1.37,
    source: "USDA FoodData Central",
    aliases: ["pure maple syrup", "pancake syrup"]
  },
  molasses: {
    name: "Molasses",
    category: "Sugars & Sweeteners",
    gramsPerMl: 1.42,
    source: "USDA FoodData Central",
    aliases: ["blackstrap molasses", "dark molasses", "treacle"]
  },
  "corn-syrup": {
    name: "Corn Syrup",
    category: "Sugars & Sweeteners",
    gramsPerMl: 1.40,
    source: "USDA FoodData Central",
    aliases: ["light corn syrup", "karo syrup"]
  },
  "agave-nectar": {
    name: "Agave Nectar",
    category: "Sugars & Sweeteners",
    gramsPerMl: 1.40,
    source: "USDA FoodData Central",
    aliases: ["agave syrup", "agave"]
  },
  "golden-syrup": {
    name: "Golden Syrup",
    category: "Sugars & Sweeteners",
    gramsPerMl: 1.43,
    source: "USDA FoodData Central",
    aliases: ["lyle's golden syrup"]
  },

  // Fats & Oils
  butter: {
    name: "Butter",
    category: "Fats & Oils",
    gramsPerMl: 0.96,
    source: "USDA FoodData Central",
    aliases: ["unsalted butter", "salted butter", "margarine", "sweet cream butter"]
  },
  "olive-oil": {
    name: "Olive Oil",
    category: "Fats & Oils",
    gramsPerMl: 0.91,
    source: "USDA FoodData Central",
    aliases: ["extra virgin olive oil", "evoo"]
  },
  oil: {
    name: "Vegetable / Canola Oil",
    category: "Fats & Oils",
    gramsPerMl: 0.92,
    source: "USDA FoodData Central",
    aliases: ["vegetable oil", "canola oil", "sunflower oil", "neutral oil", "corn oil", "salad oil"]
  },
  "coconut-oil": {
    name: "Coconut Oil",
    category: "Fats & Oils",
    gramsPerMl: 0.92,
    source: "USDA FoodData Central",
    aliases: ["virgin coconut oil", "melted coconut oil"]
  },
  shortening: {
    name: "Vegetable Shortening",
    category: "Fats & Oils",
    gramsPerMl: 0.87,
    source: "USDA FoodData Central",
    aliases: ["crisco", "shortening"]
  },
  lard: {
    name: "Lard",
    category: "Fats & Oils",
    gramsPerMl: 0.90,
    source: "USDA FoodData Central",
    aliases: ["pork lard", "rendered lard"]
  },
  "sesame-oil": {
    name: "Sesame Oil",
    category: "Fats & Oils",
    gramsPerMl: 0.92,
    source: "USDA FoodData Central",
    aliases: ["toasted sesame oil"]
  },

  // Dairy & Liquids
  water: {
    name: "Water / Broth",
    category: "Dairy & Liquids",
    gramsPerMl: 1.00,
    source: "Standard",
    aliases: ["broth", "chicken broth", "beef broth", "vegetable broth", "stock", "coffee", "tea"]
  },
  milk: {
    name: "Whole Milk",
    category: "Dairy & Liquids",
    gramsPerMl: 1.03,
    source: "USDA FoodData Central",
    aliases: ["milk", "dairy milk", "cow milk", "whole cow milk"]
  },
  "skim-milk": {
    name: "2% / Skim Milk",
    category: "Dairy & Liquids",
    gramsPerMl: 1.03,
    source: "USDA FoodData Central",
    aliases: ["low fat milk", "skim milk", "fat free milk", "2% milk", "1% milk"]
  },
  "heavy-cream": {
    name: "Heavy Cream",
    category: "Dairy & Liquids",
    gramsPerMl: 1.00,
    source: "USDA FoodData Central",
    aliases: ["heavy whipping cream", "double cream", "whipping cream"]
  },
  "half-and-half": {
    name: "Half and Half",
    category: "Dairy & Liquids",
    gramsPerMl: 1.02,
    source: "USDA FoodData Central",
    aliases: ["half & half"]
  },
  buttermilk: {
    name: "Buttermilk",
    category: "Dairy & Liquids",
    gramsPerMl: 1.03,
    source: "USDA FoodData Central",
    aliases: ["cultured buttermilk"]
  },
  "sour-cream": {
    name: "Sour Cream",
    category: "Dairy & Liquids",
    gramsPerMl: 1.02,
    source: "USDA FoodData Central",
    aliases: ["creme fraiche"]
  },
  yogurt: {
    name: "Plain Yogurt",
    category: "Dairy & Liquids",
    gramsPerMl: 1.06,
    source: "USDA FoodData Central",
    aliases: ["whole milk yogurt", "low fat yogurt", "curd"]
  },
  "greek-yogurt": {
    name: "Greek Yogurt",
    category: "Dairy & Liquids",
    gramsPerMl: 1.15,
    source: "USDA FoodData Central",
    aliases: ["strained yogurt", "fage"]
  },
  "condensed-milk": {
    name: "Sweetened Condensed Milk",
    category: "Dairy & Liquids",
    gramsPerMl: 1.30,
    source: "USDA FoodData Central",
    aliases: ["condensed milk"]
  },
  "evaporated-milk": {
    name: "Evaporated Milk",
    category: "Dairy & Liquids",
    gramsPerMl: 1.06,
    source: "USDA FoodData Central",
    aliases: []
  },

  // Leaveners, Salts & Spices
  salt: {
    name: "Table Salt",
    category: "Leaveners & Salts",
    gramsPerMl: 1.20,
    source: "USDA FoodData Central",
    aliases: ["fine salt", "sea salt", "iodized salt"]
  },
  "kosher-salt": {
    name: "Kosher Salt (Morton)",
    category: "Leaveners & Salts",
    gramsPerMl: 1.01,
    source: "USDA FoodData Central",
    aliases: ["coarse salt", "morton kosher salt"]
  },
  "kosher-salt-diamond": {
    name: "Kosher Salt (Diamond Crystal)",
    category: "Leaveners & Salts",
    gramsPerMl: 0.58,
    source: "USDA FoodData Central",
    aliases: ["diamond crystal kosher salt", "diamond crystal"]
  },
  "baking-powder": {
    name: "Baking Powder",
    category: "Leaveners & Salts",
    gramsPerMl: 0.90,
    source: "USDA FoodData Central",
    aliases: []
  },
  "baking-soda": {
    name: "Baking Soda",
    category: "Leaveners & Salts",
    gramsPerMl: 0.90,
    source: "USDA FoodData Central",
    aliases: ["bicarbonate of soda", "bicarb"]
  },
  yeast: {
    name: "Active Dry Yeast",
    category: "Leaveners & Salts",
    gramsPerMl: 0.64,
    source: "USDA FoodData Central",
    aliases: ["dry yeast", "instant yeast", "rapid rise yeast"]
  },
  cinnamon: {
    name: "Ground Cinnamon",
    category: "Leaveners & Salts",
    gramsPerMl: 0.56,
    source: "USDA FoodData Central",
    aliases: ["cinnamon"]
  },
  "black-pepper": {
    name: "Black Pepper (Ground)",
    category: "Leaveners & Salts",
    gramsPerMl: 0.58,
    source: "USDA FoodData Central",
    aliases: ["pepper", "ground black pepper"]
  },

  // Grains & Legumes
  "rolled-oats": {
    name: "Rolled Oats (Old Fashioned)",
    category: "Grains & Legumes",
    gramsPerMl: 0.38,
    source: "USDA FoodData Central",
    aliases: ["oats", "old fashioned oats", "oatmeal"]
  },
  "quick-oats": {
    name: "Quick Oats",
    category: "Grains & Legumes",
    gramsPerMl: 0.37,
    source: "USDA FoodData Central",
    aliases: ["instant oats", "quick-cooking oats"]
  },
  "steel-cut-oats": {
    name: "Steel-Cut Oats",
    category: "Grains & Legumes",
    gramsPerMl: 0.75,
    source: "USDA FoodData Central",
    aliases: ["irish oats", "pinhead oats"]
  },
  rice: {
    name: "White Rice (Dry)",
    category: "Grains & Legumes",
    gramsPerMl: 0.85,
    source: "USDA FoodData Central",
    aliases: ["white rice", "jasmine rice", "basmati rice", "uncooked rice"]
  },
  "brown-rice": {
    name: "Brown Rice (Dry)",
    category: "Grains & Legumes",
    gramsPerMl: 0.83,
    source: "USDA FoodData Central",
    aliases: ["whole grain rice"]
  },
  quinoa: {
    name: "Quinoa (Dry)",
    category: "Grains & Legumes",
    gramsPerMl: 0.72,
    source: "USDA FoodData Central",
    aliases: ["uncooked quinoa"]
  },
  couscous: {
    name: "Couscous (Dry)",
    category: "Grains & Legumes",
    gramsPerMl: 0.73,
    source: "USDA FoodData Central",
    aliases: []
  },
  lentils: {
    name: "Dried Lentils",
    category: "Grains & Legumes",
    gramsPerMl: 0.82,
    source: "USDA FoodData Central",
    aliases: ["brown lentils", "red lentils", "green lentils"]
  },
  "black-beans": {
    name: "Dried Black Beans",
    category: "Grains & Legumes",
    gramsPerMl: 0.83,
    source: "USDA FoodData Central",
    aliases: ["black beans", "kidney beans", "pinto beans"]
  },

  // Nuts, Seeds & Baking Add-ins
  walnuts: {
    name: "Walnuts (Chopped)",
    category: "Nuts & Seeds",
    gramsPerMl: 0.49,
    source: "USDA FoodData Central",
    aliases: ["chopped walnuts", "walnut pieces"]
  },
  pecans: {
    name: "Pecans (Chopped)",
    category: "Nuts & Seeds",
    gramsPerMl: 0.46,
    source: "USDA FoodData Central",
    aliases: ["chopped pecans", "pecan pieces"]
  },
  almonds: {
    name: "Almonds (Sliced / Whole)",
    category: "Nuts & Seeds",
    gramsPerMl: 0.60,
    source: "USDA FoodData Central",
    aliases: ["sliced almonds", "whole almonds", "slivered almonds"]
  },
  peanuts: {
    name: "Peanuts (Roasted)",
    category: "Nuts & Seeds",
    gramsPerMl: 0.61,
    source: "USDA FoodData Central",
    aliases: ["roasted peanuts", "salted peanuts"]
  },
  "chia-seeds": {
    name: "Chia Seeds",
    category: "Nuts & Seeds",
    gramsPerMl: 0.70,
    source: "USDA FoodData Central",
    aliases: []
  },
  "flax-seeds": {
    name: "Flax Seeds",
    category: "Nuts & Seeds",
    gramsPerMl: 0.70,
    source: "USDA FoodData Central",
    aliases: ["linseed", "ground flaxseed"]
  },
  "chocolate-chips": {
    name: "Chocolate Chips",
    category: "Nuts & Seeds",
    gramsPerMl: 0.71,
    source: "USDA FoodData Central",
    aliases: ["semisweet chocolate chips", "mini chocolate chips", "dark chocolate chips"]
  },
  "shredded-coconut": {
    name: "Shredded Coconut",
    category: "Nuts & Seeds",
    gramsPerMl: 0.35,
    source: "USDA FoodData Central",
    aliases: ["desiccated coconut", "flaked coconut"]
  },
  "peanut-butter": {
    name: "Peanut Butter",
    category: "Nuts & Seeds",
    gramsPerMl: 1.15,
    source: "USDA FoodData Central",
    aliases: ["creamy peanut butter", "crunchy peanut butter", "nut butter"]
  },
  nutella: {
    name: "Hazelnut Spread (Nutella)",
    category: "Nuts & Seeds",
    gramsPerMl: 1.25,
    source: "USDA FoodData Central",
    aliases: ["nutella", "chocolate hazelnut spread"]
  },

  // Condiments, Vinegars & Extracts
  "soy-sauce": {
    name: "Soy Sauce",
    category: "Condiments & Flavorings",
    gramsPerMl: 1.15,
    source: "USDA FoodData Central",
    aliases: ["tamari", "shoyu", "dark soy sauce"]
  },
  "tomato-paste": {
    name: "Tomato Paste",
    category: "Condiments & Flavorings",
    gramsPerMl: 1.15,
    source: "USDA FoodData Central",
    aliases: []
  },
  "tomato-sauce": {
    name: "Tomato Sauce / Puree",
    category: "Condiments & Flavorings",
    gramsPerMl: 1.04,
    source: "USDA FoodData Central",
    aliases: ["crushed tomatoes", "passata", "tomato puree"]
  },
  "apple-cider-vinegar": {
    name: "Apple Cider Vinegar",
    category: "Condiments & Flavorings",
    gramsPerMl: 1.01,
    source: "USDA FoodData Central",
    aliases: ["cider vinegar", "acv"]
  },
  "white-vinegar": {
    name: "White Vinegar",
    category: "Condiments & Flavorings",
    gramsPerMl: 1.01,
    source: "USDA FoodData Central",
    aliases: ["distilled vinegar"]
  },
  "lemon-juice": {
    name: "Lemon Juice",
    category: "Condiments & Flavorings",
    gramsPerMl: 1.03,
    source: "USDA FoodData Central",
    aliases: ["fresh lemon juice", "lime juice"]
  },
  "vanilla-extract": {
    name: "Vanilla Extract",
    category: "Condiments & Flavorings",
    gramsPerMl: 0.88,
    source: "USDA FoodData Central",
    aliases: ["pure vanilla extract", "vanilla"]
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
