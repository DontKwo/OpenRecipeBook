import { describe, it, expect } from "vitest";
import {
  updateRecipeNotes,
  appendRecipeNote
} from "../src/domain/recipe/recipeModifier";
import type { Recipe } from "../src/domain/recipe/types";

const createBaseRecipe = (): Recipe => ({
  id: "rec-modifier-test",
  title: "Buttermilk Biscuits",
  description: "Fluffy southern biscuits",
  servings: 8,
  servingsLabel: "biscuits",
  prepMinutes: 15,
  cookMinutes: 20,
  totalMinutes: 35,
  notes: "Keep butter ice cold",
  ingredientGroups: [
    {
      heading: "Dough",
      items: [
        { id: "i1", raw: "2 cups flour", scalable: true },
        { id: "i2", raw: "1 tbsp baking powder", scalable: true }
      ]
    }
  ],
  directionGroups: [
    {
      heading: "Baking",
      steps: [
        { id: "s1", text: "Mix dry ingredients" },
        { id: "s2", text: "Cut in butter until pea-sized" }
      ]
    }
  ],
  cookLog: [],
  courses: ["Breakfast"],
  categories: ["Baking"],
  collectionIds: [],
  tags: ["southern"],
  rating: 5,
  favorite: true,
  photoIds: [],
  createdAt: "2026-11-12T10:00:00Z",
  updatedAt: "2026-11-12T10:00:00Z",
  schemaVersion: 1
});

describe("Recipe Notes Modifiers", () => {
  it("updates recipe notes and refreshes timestamp", () => {
    const base = createBaseRecipe();
    const updated = updateRecipeNotes(base, "Use pastry blender");
    expect(updated.notes).toBe("Use pastry blender");
    expect(updated.updatedAt).not.toBe(base.updatedAt);
  });

  it("appends new note line to existing notes", () => {
    const base = createBaseRecipe();
    const appended = appendRecipeNote(base, "Do not twist biscuit cutter");
    expect(appended.notes).toBe("Keep butter ice cold\n- Do not twist biscuit cutter");
  });

  it("creates note list if notes were previously empty", () => {
    const base = { ...createBaseRecipe(), notes: undefined };
    const appended = appendRecipeNote(base, "First note");
    expect(appended.notes).toBe("- First note");
  });
});
