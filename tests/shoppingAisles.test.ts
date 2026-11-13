import { describe, it, expect } from "vitest";
import type { ShoppingList, ShoppingItem } from "../src/domain/recipe/types";
import {
  DEFAULT_AISLE_ORDER,
  getOrderedAisles,
  sortAisleGroups,
  reorderAisles,
  formatShoppingListAsText
} from "../src/domain/shopping/shoppingService";

describe("Shopping List Custom Aisle Ordering", (): void => {
  it("uses default aisle order when list has no custom order", (): void => {
    const list: ShoppingList = {
      id: "l1",
      name: "Supermarket",
      items: [
        { id: "i1", text: "Milk", aisle: "Dairy", checked: false },
        { id: "i2", text: "Apples", aisle: "Produce", checked: false }
      ]
    };

    const order = getOrderedAisles(list);
    expect(order[0]).toBe(DEFAULT_AISLE_ORDER[0]);
    expect(order).toContain("Dairy");
  });

  it("applies custom aisle order and includes custom aisles", (): void => {
    const list: ShoppingList = {
      id: "l2",
      name: "Farmer Market",
      items: [
        { id: "i1", text: "Organic Honey", aisle: "Local Honey", checked: false }
      ],
      aisleOrder: ["Bakery", "Produce", "Dairy"],
      customAisles: ["Local Honey"]
    };

    const order = getOrderedAisles(list);
    expect(order[0]).toBe("Bakery");
    expect(order[1]).toBe("Produce");
    expect(order).toContain("Local Honey");
  });

  it("reorders aisles correctly by moving element fromIndex to toIndex", (): void => {
    const order = ["Produce", "Bakery", "Meat", "Dairy"];
    // Move Dairy (index 3) to index 0
    const reordered = reorderAisles(order, 3, 0);
    expect(reordered).toEqual(["Dairy", "Produce", "Bakery", "Meat"]);

    // Out-of-bounds index should return untouched array
    const invalid = reorderAisles(order, -1, 2);
    expect(invalid).toEqual(order);
  });

  it("sorts aisle groups according to custom aisle order", (): void => {
    const groups: Record<string, ShoppingItem[]> = {
      Pantry: [{ id: "1", text: "Flour", aisle: "Pantry", checked: false }],
      Produce: [{ id: "2", text: "Bananas", aisle: "Produce", checked: false }],
      Dairy: [{ id: "3", text: "Cheese", aisle: "Dairy", checked: false }]
    };

    const customOrder = ["Dairy", "Produce", "Pantry"];
    const sorted = sortAisleGroups(groups, customOrder);

    expect(sorted.map((s) => s.aisle)).toEqual(["Dairy", "Produce", "Pantry"]);
  });

  it("formats text in accordance with aisle order", (): void => {
    const list: ShoppingList = {
      id: "l3",
      name: "Costco Run",
      items: [
        { id: "i1", text: "Salmon", aisle: "Meat & Seafood", checked: false },
        { id: "i2", text: "Spinach", aisle: "Produce", checked: true }
      ],
      aisleOrder: ["Produce", "Meat & Seafood"]
    };

    const text = formatShoppingListAsText(list);
    const produceIdx = text.indexOf("[Produce]");
    const meatIdx = text.indexOf("[Meat & Seafood]");
    expect(produceIdx).toBeLessThan(meatIdx);
    expect(text).toContain("[x] Spinach");
    expect(text).toContain("[ ] Salmon");
  });
});
