import type { ShoppingList, ShoppingItem, DictionaryIngredient } from "../recipe/types";
import { parseIngredient } from "../scaling/parseIngredient";
import { scaleQuantity } from "../scaling/scaleIngredient";
import { matchIngredient } from "../ingredients/matcher";
import { BUILT_IN_INGREDIENTS } from "../../data/defaultIngredients";
import { formatFractionalNumber, promoteUnit, pluralizeUnit } from "../scaling/formatQuantity";

export function createDefaultShoppingList(name: string = "Groceries"): ShoppingList {
  return {
    id: `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name,
    items: []
  };
}

export function buildShoppingItemFromIngredient(
  rawText: string,
  recipeTitle?: string,
  multiplier: number = 1,
  dictionary: DictionaryIngredient[] = BUILT_IN_INGREDIENTS
): ShoppingItem {
  const parsed = parseIngredient(rawText);
  const ingredient = parsed.ingredient;

  let scaledQuantity = ingredient.quantity;
  if (scaledQuantity && multiplier !== 1) {
    scaledQuantity = scaleQuantity(scaledQuantity, multiplier);
  }

  const matched = matchIngredient(ingredient.name || rawText, dictionary);
  const aisle = matched?.aisle || "Pantry";

  let displayText = rawText;
  if (scaledQuantity && scaledQuantity.kind === "single") {
    const promoted = promoteUnit(scaledQuantity.value, ingredient.unit);
    const formattedAmount = formatFractionalNumber(promoted.amount);
    const unitPart = promoted.unit ? pluralizeUnit(promoted.unit, promoted.amount) : "";
    const namePart = ingredient.name || rawText;
    displayText = `${formattedAmount} ${unitPart} ${namePart}`.replace(/\s+/g, " ").trim();
  }

  return {
    id: `shop-item-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    text: displayText,
    quantity: scaledQuantity,
    unit: ingredient.unit,
    aisle,
    checked: false,
    recipeId: recipeTitle
  };
}

export function mergeShoppingItems(existingItems: ShoppingItem[], newItems: ShoppingItem[]): ShoppingItem[] {
  const merged: ShoppingItem[] = [...existingItems];

  for (const newItem of newItems) {
    // Only merge if both have matching single quantities and units
    let mergedIntoExisting = false;
    if (newItem.quantity && newItem.quantity.kind === "single" && newItem.unit) {
      for (const existing of merged) {
        if (
          !existing.checked &&
          existing.unit === newItem.unit &&
          existing.quantity &&
          existing.quantity.kind === "single" &&
          existing.text.toLowerCase().includes(newItem.unit.toLowerCase())
        ) {
          const combinedValue = existing.quantity.value + newItem.quantity.value;
          existing.quantity = { kind: "single", value: combinedValue };
          const promoted = promoteUnit(combinedValue, existing.unit);
          const formattedAmount = formatFractionalNumber(promoted.amount);
          const unitPart = promoted.unit ? pluralizeUnit(promoted.unit, promoted.amount) : "";
          const baseName = existing.text.replace(/^[0-9\/\.\s\u00BD\u00BC\u00BE\u2153\u2154]+/, "").replace(new RegExp(`^${existing.unit}\\s*`, "i"), "").trim();
          existing.text = `${formattedAmount} ${unitPart} ${baseName}`.trim();
          mergedIntoExisting = true;
          break;
        }
      }
    }

    if (!mergedIntoExisting) {
      merged.push(newItem);
    }
  }

  return merged;
}

export const DEFAULT_AISLE_ORDER: string[] = [
  "Produce",
  "Bakery",
  "Meat & Seafood",
  "Dairy",
  "Deli",
  "Pantry",
  "Baking",
  "Spices & Seasonings",
  "Frozen",
  "Beverages",
  "Household & Other",
  "Other"
];

export function getOrderedAisles(list?: ShoppingList): string[] {
  const baseOrder = list?.aisleOrder && list.aisleOrder.length > 0
    ? [...list.aisleOrder]
    : [...DEFAULT_AISLE_ORDER];

  // Include any custom aisles
  if (list?.customAisles) {
    for (const custom of list.customAisles) {
      if (!baseOrder.includes(custom)) {
        baseOrder.push(custom);
      }
    }
  }

  // Include any aisles currently present on items
  if (list?.items) {
    for (const item of list.items) {
      const aisle = item.aisle || "Other";
      if (!baseOrder.includes(aisle)) {
        baseOrder.push(aisle);
      }
    }
  }

  return baseOrder;
}

export function sortAisleGroups(
  groups: Record<string, ShoppingItem[]>,
  aisleOrder: string[]
): Array<{ aisle: string; items: ShoppingItem[] }> {
  const sorted: Array<{ aisle: string; items: ShoppingItem[] }> = [];

  for (const aisle of aisleOrder) {
    if (groups[aisle] && groups[aisle].length > 0) {
      sorted.push({ aisle, items: groups[aisle] });
    }
  }

  // Append any aisles in groups not in order list
  for (const [aisle, items] of Object.entries(groups)) {
    if (!sorted.some((entry) => entry.aisle === aisle) && items.length > 0) {
      sorted.push({ aisle, items });
    }
  }

  return sorted;
}

export function reorderAisles(order: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex < 0 || fromIndex >= order.length || toIndex < 0 || toIndex >= order.length) {
    return order;
  }
  const result = [...order];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

export function formatShoppingListAsText(list: ShoppingList): string {
  const groupedByAisle: Record<string, ShoppingItem[]> = {};
  for (const item of list.items) {
    const aisle = item.aisle || "Other";
    if (!groupedByAisle[aisle]) {
      groupedByAisle[aisle] = [];
    }
    groupedByAisle[aisle].push(item);
  }

  const order = getOrderedAisles(list);
  const sortedEntries = sortAisleGroups(groupedByAisle, order);

  const lines: string[] = [`${list.name}:`, ""];
  for (const { aisle, items } of sortedEntries) {
    lines.push(`[${aisle}]`);
    for (const item of items) {
      const checkMark = item.checked ? "[x]" : "[ ]";
      const source = item.recipeId ? ` (${item.recipeId})` : "";
      lines.push(`${checkMark} ${item.text}${source}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
