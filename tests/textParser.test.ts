import { describe, it, expect } from "vitest";
import { parsePlainTextRecipe } from "../src/domain/import/textRecipeParser";

describe("Plain Text Recipe Parser", (): void => {
  it("parses structured recipe text with ingredients and directions headers", (): void => {
    const raw = `
      Classic Banana Bread
      A moist and delicious quick bread recipe.
      Yield: 8 servings
      Prep time: 15 mins
      Cook time: 55 minutes
      https://example.com/banana-bread

      Ingredients
      * 3 ripe bananas
      * 1/3 cup melted butter
      * 3/4 cup sugar
      * 1 large egg
      * 1 tsp vanilla extract
      * 1 tsp baking soda
      * Pinch of salt
      * 1 1/2 cups flour

      Directions
      1. Preheat oven to 350 degrees F and grease loaf pan.
      2. Mash bananas in large bowl with fork until smooth.
      3. Stir in melted butter, sugar, egg, and vanilla.
      4. Add baking soda, salt, and flour, stirring until just combined.
      5. Pour batter into pan and bake for 55 minutes.

      Notes
      Wrap tightly in foil once cooled to preserve moisture.
    `;

    const parsed = parsePlainTextRecipe(raw);
    expect(parsed.title).toBe("Classic Banana Bread");
    expect(parsed.description).toBe("A moist and delicious quick bread recipe.");
    expect(parsed.servings).toBe(8);
    expect(parsed.prepMinutes).toBe(15);
    expect(parsed.cookMinutes).toBe(55);
    expect(parsed.sourceUrl).toBe("https://example.com/banana-bread");
    expect(parsed.ingredientGroups).toHaveLength(1);
    expect(parsed.ingredientGroups[0].items).toHaveLength(8);
    expect(parsed.ingredientGroups[0].items[0]).toBe("3 ripe bananas");
    expect(parsed.directionGroups).toHaveLength(1);
    expect(parsed.directionGroups[0].steps).toHaveLength(5);
    expect(parsed.directionGroups[0].steps[0]).toBe("Preheat oven to 350 degrees F and grease loaf pan.");
    expect(parsed.notes).toContain("Wrap tightly in foil");
  });

  it("handles multi-group ingredients such as crust and filling", (): void => {
    const raw = `
      Key Lime Pie
      Ingredients
      For the crust:
      1 1/2 cups graham cracker crumbs
      1/3 cup sugar
      6 tbsp melted butter

      For the filling:
      4 egg yolks
      1 can sweetened condensed milk
      1/2 cup key lime juice

      Instructions
      1. Press crust mixture into 9-inch pie dish.
      2. Whisk filling ingredients together.
      3. Pour into crust and bake at 350F for 15 minutes.
    `;

    const parsed = parsePlainTextRecipe(raw);
    expect(parsed.title).toBe("Key Lime Pie");
    expect(parsed.ingredientGroups).toHaveLength(2);
    expect(parsed.ingredientGroups[0].heading).toBe("For the crust");
    expect(parsed.ingredientGroups[0].items).toHaveLength(3);
    expect(parsed.ingredientGroups[1].heading).toBe("For the filling");
    expect(parsed.ingredientGroups[1].items).toHaveLength(3);
    expect(parsed.directionGroups[0].steps).toHaveLength(3);
  });

  it("heuristically separates text with no explicit section headers", (): void => {
    const raw = `
      Simple Pancakes
      2 cups flour
      2 tsp baking powder
      1/2 tsp salt
      2 eggs
      1 1/2 cups milk
      2 tbsp melted butter
      Whisk all ingredients together until mostly smooth.
      Pour 1/4 cup batter onto hot griddle.
      Flip when bubbles appear and cook until golden brown.
    `;

    const parsed = parsePlainTextRecipe(raw);
    expect(parsed.title).toBe("Simple Pancakes");
    expect(parsed.ingredientGroups[0].items).toHaveLength(6);
    expect(parsed.directionGroups[0].steps).toHaveLength(3);
  });

  it("returns untitled recipe structure on empty text input", (): void => {
    const parsed = parsePlainTextRecipe("");
    expect(parsed.title).toBe("Untitled Recipe");
    expect(parsed.ingredientGroups[0].items).toHaveLength(0);
    expect(parsed.directionGroups[0].steps).toHaveLength(0);
  });
});
