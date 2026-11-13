export type Quantity =
  | { kind: "single"; value: number }
  | { kind: "range"; min: number; max: number };

export interface Ingredient {
  id: string;
  raw: string;
  quantity?: Quantity;
  unit?: string;
  name?: string;
  ingredientId?: string;
  note?: string;
  scalable: boolean;
}

export interface StepTimer {
  label: string;
  seconds: number;
}

export interface Step {
  id: string;
  text: string;
  photoId?: string;
  timers?: StepTimer[];
  note?: string;
}

export interface CookLogEntry {
  id: string;
  date: string;
  note?: string;
  rating?: number;
  photoId?: string;
}

export type RecipeRating = 0 | 1 | 2 | 3 | 4 | 5;

export interface IngredientGroup {
  heading?: string;
  items: Ingredient[];
}

export interface DirectionGroup {
  heading?: string;
  steps: Step[];
}

export interface Recipe {
  id: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceName?: string;
  servings: number;
  servingsLabel?: string;
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;
  ingredientGroups: IngredientGroup[];
  directionGroups: DirectionGroup[];
  notes?: string;
  cookLog: CookLogEntry[];
  nutrition?: Record<string, string>;
  courses: string[];
  categories: string[];
  collectionIds: string[];
  tags: string[];
  rating: RecipeRating;
  favorite: boolean;
  photoIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  schemaVersion: number;
}

export interface PhotoRecord {
  id: string;
  recipeId: string;
  hero: Blob;
  thumb: Blob;
  width: number;
  height: number;
  caption?: string;
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface MealPlanEntry {
  id: string;
  date: string;
  slot: string;
  recipeId?: string;
  freeText?: string;
  multiplier: number;
}

export interface ShoppingItem {
  id: string;
  text: string;
  quantity?: Quantity;
  unit?: string;
  aisle: string;
  checked: boolean;
  recipeId?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  aisleOrder?: string[];
  customAisles?: string[];
}

export interface ComboEntry {
  recipeId: string;
  multiplier: number;
}

export interface Combo {
  id: string;
  name: string;
  entries: ComboEntry[];
  createdAt: string;
}

export type UnitFamily = "volume" | "weight" | "count";

export interface DictionaryIngredient {
  id: string;
  name: string;
  aliases: string[];
  family?: string;
  aisle: string;
  unitFamily: UnitFamily;
  gramsPerMl?: number;
  densitySource?: string;
  user?: boolean;
}

export interface SavedMenuItem {
  dayOffset: number;
  slot: string;
  recipeId?: string;
  freeText?: string;
  multiplier: number;
}

export interface SavedMenu {
  id: string;
  name: string;
  createdAt: string;
  items: SavedMenuItem[];
}
