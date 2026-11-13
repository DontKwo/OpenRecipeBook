import { describe, it, expect } from "vitest";
import { zipSync, gzipSync, strToU8 } from "fflate";
import { parsePaprikaRecipesZip, parsePaprikaDurationMinutes, convertPaprikaJsonToRecipe } from "../src/domain/import/paprika";

describe("Paprika Importer", (): void => {
  it("parses duration strings cleanly", (): void => {
    expect(parsePaprikaDurationMinutes("45 mins")).toBe(45);
    expect(parsePaprikaDurationMinutes("1 hour 15 minutes")).toBe(75);
    expect(parsePaprikaDurationMinutes("2 hr")).toBe(120);
    expect(parsePaprikaDurationMinutes("")).toBeUndefined();
  });

  it("converts Paprika JSON structure to standardized Recipe format", (): void => {
    const rawPaprika = {
      name: "Classic French Toast",
      description: "Golden brown French toast infused with cinnamon and vanilla.",
      servings: "4 servings",
      prep_time: "10 mins",
      cook_time: "15 mins",
      ingredients: "4 slices thick bread\n2 large eggs\n1/2 cup milk\n1 tsp cinnamon\n1 tsp vanilla",
      directions: "Whisk eggs, milk, cinnamon, and vanilla in shallow dish.\nDip bread slices on both sides.\nCook on buttered skillet until golden brown on both sides.",
      notes: "Serve warm with pure maple syrup.",
      categories: ["Breakfast"],
      rating: 5
    };

    const recipe = convertPaprikaJsonToRecipe(rawPaprika);
    expect(recipe.title).toBe("Classic French Toast");
    expect(recipe.servings).toBe(4);
    expect(recipe.prepMinutes).toBe(10);
    expect(recipe.cookMinutes).toBe(15);
    expect(recipe.ingredientGroups[0].items).toHaveLength(5);
    expect(recipe.directionGroups[0].steps).toHaveLength(3);
    expect(recipe.rating).toBe(5);
    expect(recipe.notes).toBe("Serve warm with pure maple syrup.");
  });

  it("extracts and gunzips .paprikarecipes archive", (): void => {
    const rawPaprika = {
      name: "Apple Tart",
      ingredients: "2 apples, sliced\n1 sheet puff pastry\n2 tbsp sugar",
      directions: "Arrange apple slices on pastry.\nSprinkle with sugar.\nBake at 400F for 20 minutes."
    };
    const jsonBytes = strToU8(JSON.stringify(rawPaprika));
    const gzipped = gzipSync(jsonBytes);

    const zipArchive = zipSync({
      "Apple Tart.paprikarecipe": gzipped
    });

    const results = parsePaprikaRecipesZip(zipArchive);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Apple Tart");
    expect(results[0].ingredientGroups[0].items).toHaveLength(3);
    expect(results[0].directionGroups[0].steps).toHaveLength(3);
  });
});
