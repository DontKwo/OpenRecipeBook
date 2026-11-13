import { describe, it, expect } from "vitest";
import {
  createDefaultShoppingList,
  buildShoppingItemFromIngredient,
  mergeShoppingItems,
  formatShoppingListAsText
} from "../src/domain/shopping/shoppingService";
import type { ShoppingList, ShoppingItem } from "../src/domain/recipe/types";

describe("Shopping Service", (): void => {
  it("creates default shopping list with given name", (): void => {
    const list = createDefaultShoppingList("Costco Trip");
    expect(list.name).toBe("Costco Trip");
    expect(list.items).toEqual([]);
    expect(list.id).toBeDefined();
  });

  it("builds shopping item with scaling and aisle resolution", (): void => {
    const item = buildShoppingItemFromIngredient("2 cups milk", "Pancake Recipe", 2);
    expect(item.quantity?.kind).toBe("single");
    if (item.quantity?.kind === "single") {
      expect(item.quantity.value).toBe(4);
    }
    expect(item.text).toBe("4 cups milk");
    expect(item.recipeId).toBe("Pancake Recipe");
    expect(item.aisle).toBe("Dairy");
    expect(item.checked).toBe(false);
  });

  it("merges identical items with compatible units", (): void => {
    const item1 = buildShoppingItemFromIngredient("1 cup milk");
    const item2 = buildShoppingItemFromIngredient("2 cups milk");

    const merged = mergeShoppingItems([item1], [item2]);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toContain("3 cups");
  });

  it("does not merge items if one is already checked", (): void => {
    const item1 = buildShoppingItemFromIngredient("1 cup milk");
    item1.checked = true;
    const item2 = buildShoppingItemFromIngredient("2 cups milk");

    const merged = mergeShoppingItems([item1], [item2]);
    expect(merged).toHaveLength(2);
  });

  it("keeps incompatible units on separate lines", (): void => {
    const item1 = buildShoppingItemFromIngredient("1 cup flour");
    const item2 = buildShoppingItemFromIngredient("500 g flour");

    const merged = mergeShoppingItems([item1], [item2]);
    expect(merged).toHaveLength(2);
  });

  it("formats shopping list grouped by aisle into text", (): void => {
    const item1: ShoppingItem = {
      id: "i1",
      text: "3 apples",
      aisle: "Produce",
      checked: false
    };
    const item2: ShoppingItem = {
      id: "i2",
      text: "1 loaf bread",
      aisle: "Bakery",
      checked: true,
      recipeId: "French Toast"
    };

    const list: ShoppingList = {
      id: "test-list",
      name: "Weekend Market",
      items: [item1, item2]
    };

    const formatted = formatShoppingListAsText(list);
    expect(formatted).toContain("Weekend Market:");
    expect(formatted).toContain("[Produce]");
    expect(formatted).toContain("[ ] 3 apples");
    expect(formatted).toContain("[Bakery]");
    expect(formatted).toContain("[x] 1 loaf bread (French Toast)");
  });
});
