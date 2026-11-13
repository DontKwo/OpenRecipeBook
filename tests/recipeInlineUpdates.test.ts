import { describe, it, expect } from "vitest";
import {
  updateRecipeTitle,
  updateRecipeDescription,
  updateRecipeServings,
  updateRecipeTimes,
  updateRecipeNotes,
  updateIngredientLine,
  addIngredientLine,
  deleteIngredientLine,
  restoreIngredientLine,
  updateStepText,
  updateStepNote,
  addStepLine,
  deleteStepLine,
  restoreStepLine,
  moveIngredientLine,
  moveStepLine
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

describe("Recipe In-Place Modifier", () => {
  it("updates recipe title and updates timestamp", () => {
    const base = createBaseRecipe();
    const updated = updateRecipeTitle(base, "Grandma's Buttermilk Biscuits");
    expect(updated.title).toBe("Grandma's Buttermilk Biscuits");
    expect(updated.updatedAt).not.toBe(base.updatedAt);
  });

  it("updates recipe description", () => {
    const base = createBaseRecipe();
    const updated = updateRecipeDescription(base, "Extra flaky layered biscuits");
    expect(updated.description).toBe("Extra flaky layered biscuits");
  });

  it("updates recipe servings and label", () => {
    const base = createBaseRecipe();
    const updated = updateRecipeServings(base, 12, "big biscuits");
    expect(updated.servings).toBe(12);
    expect(updated.servingsLabel).toBe("big biscuits");
  });

  it("updates prep and cook times with derived total minutes", () => {
    const base = createBaseRecipe();
    const updated = updateRecipeTimes(base, 25, 20);
    expect(updated.prepMinutes).toBe(25);
    expect(updated.cookMinutes).toBe(20);
    expect(updated.totalMinutes).toBe(45);
  });

  it("updates recipe notes", () => {
    const base = createBaseRecipe();
    const updated = updateRecipeNotes(base, "Grate frozen butter on cheese grater");
    expect(updated.notes).toBe("Grate frozen butter on cheese grater");
  });

  it("updates and re-parses ingredient line in place", () => {
    const base = createBaseRecipe();
    const updated = updateIngredientLine(base, 0, 0, "3 cups all-purpose flour");
    const item = updated.ingredientGroups[0].items[0];
    expect(item.raw).toBe("3 cups all-purpose flour");
    expect(item.quantity).toEqual({ kind: "single", value: 3 });
    expect(item.unit).toBe("cup");
  });

  it("adds a new ingredient line after specified index", () => {
    const base = createBaseRecipe();
    const { recipe: updated, newId } = addIngredientLine(base, 0, "1/2 cup cold buttermilk", 0);
    expect(updated.ingredientGroups[0].items).toHaveLength(3);
    expect(updated.ingredientGroups[0].items[1].id).toBe(newId);
    expect(updated.ingredientGroups[0].items[1].raw).toBe("1/2 cup cold buttermilk");
  });

  it("deletes ingredient line and restores it cleanly", () => {
    const base = createBaseRecipe();
    const { recipe: deletedRecipe, deletedItem, groupIndex, itemIndex } = deleteIngredientLine(base, 0, 0);
    expect(deletedRecipe.ingredientGroups[0].items).toHaveLength(1);
    expect(deletedItem.raw).toBe("2 cups flour");

    const restoredRecipe = restoreIngredientLine(deletedRecipe, groupIndex, itemIndex, deletedItem);
    expect(restoredRecipe.ingredientGroups[0].items).toHaveLength(2);
    expect(restoredRecipe.ingredientGroups[0].items[0].raw).toBe("2 cups flour");
  });

  it("updates step text and attaches a step note", () => {
    const base = createBaseRecipe();
    const updatedText = updateStepText(base, 0, 1, "Grate frozen butter into dry mix");
    expect(updatedText.directionGroups[0].steps[1].text).toBe("Grate frozen butter into dry mix");

    const updatedNote = updateStepNote(updatedText, 0, 1, "Do not use warm butter or it won't flake");
    expect(updatedNote.directionGroups[0].steps[1].note).toBe("Do not use warm butter or it won't flake");
  });

  it("adds, deletes, and restores a step line", () => {
    const base = createBaseRecipe();
    const { recipe: withNewStep, newId } = addStepLine(base, 0, "Fold dough 5 times for layers", 1);
    expect(withNewStep.directionGroups[0].steps).toHaveLength(3);
    expect(withNewStep.directionGroups[0].steps[2].id).toBe(newId);

    const { recipe: afterDelete, deletedStep, groupIndex, stepIndex } = deleteStepLine(withNewStep, 0, 2);
    expect(afterDelete.directionGroups[0].steps).toHaveLength(2);
    expect(deletedStep.id).toBe(newId);

    const restored = restoreStepLine(afterDelete, groupIndex, stepIndex, deletedStep);
    expect(restored.directionGroups[0].steps).toHaveLength(3);
    expect(restored.directionGroups[0].steps[2].id).toBe(newId);
  });

  it("moves ingredient line within groups", () => {
    const base = createBaseRecipe();
    const moved = moveIngredientLine(base, 0, 1, 0, 0);
    expect(moved.ingredientGroups[0].items[0].id).toBe("i2");
    expect(moved.ingredientGroups[0].items[1].id).toBe("i1");
  });

  it("moves step line within groups", () => {
    const base = createBaseRecipe();
    const moved = moveStepLine(base, 0, 1, 0, 0);
    expect(moved.directionGroups[0].steps[0].id).toBe("s2");
    expect(moved.directionGroups[0].steps[1].id).toBe("s1");
  });
});
