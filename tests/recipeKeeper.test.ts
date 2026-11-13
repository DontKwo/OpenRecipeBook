import { describe, it, expect } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { generateSyntheticRecipeKeeperZip } from "./fixtures/syntheticRecipeKeeper";
import { parseRecipeKeeperZip } from "../src/domain/import/recipeKeeper";

describe("Recipe Keeper Tolerant Zip Importer", (): void => {
  it("imports recipes and photos from synthetic Recipe Keeper export zip", (): void => {
    const syntheticZip = generateSyntheticRecipeKeeperZip();
    expect(syntheticZip.byteLength).toBeGreaterThan(0);

    const result = parseRecipeKeeperZip(syntheticZip);
    expect(result.recipes).toHaveLength(2);

    const recipe1 = result.recipes[0];
    expect(recipe1.title).toBe("Rustic Herb Bread");
    expect(recipe1.description).toContain("Crusty artisan loaf");
    expect(recipe1.prepMinutes).toBe(20);
    expect(recipe1.cookMinutes).toBe(35);
    expect(recipe1.ingredientGroups[0].items).toHaveLength(4);
    expect(recipe1.directionGroups[0].steps).toHaveLength(4);
    expect(recipe1.courses).toContain("Baking");
    expect(recipe1.notes).toContain("Use parchment paper");

    const recipe2 = result.recipes[1];
    expect(recipe2.title).toBe("Lemon Blueberry Scones");
    expect(recipe2.description).toContain("Tender cream scones");
    expect(recipe2.servings).toBe(8);
    expect(recipe2.prepMinutes).toBe(15);
    expect(recipe2.cookMinutes).toBe(20);
    expect(recipe2.courses).toContain("Breakfast");
    expect(recipe2.ingredientGroups[0].items).toHaveLength(5);
    expect(recipe2.directionGroups[0].steps).toHaveLength(4);

    // Photo unpack check
    expect(result.photos).toHaveLength(2);
    expect(result.photos.map((p) => p.filename)).toEqual(expect.arrayContaining(["loaf.jpg", "scones.jpg"]));
  });

  it("handles multi-HTML file archives and links photos directly to recipe records", (): void => {
    const pizzaHtml = `<!DOCTYPE html>
<html><body>
  <div itemscope itemtype="http://schema.org/Recipe">
    <h1 itemprop="name">Margherita Pizza</h1>
    <img itemprop="image" src="photos/margherita.jpg" />
    <span itemprop="recipeYield">2 pizzas</span>
    <ul class="ingredients">
      <li itemprop="recipeIngredient">Dough:</li>
      <li itemprop="recipeIngredient">500g bread flour</li>
      <li itemprop="recipeIngredient">300ml warm water</li>
      <li itemprop="recipeIngredient">Topping:</li>
      <li itemprop="recipeIngredient">200g crushed tomatoes</li>
      <li itemprop="recipeIngredient">250g fresh mozzarella</li>
    </ul>
    <ol class="instructions">
      <li itemprop="recipeInstructions">Mix and knead dough for 10 minutes.</li>
      <li itemprop="recipeInstructions">Bake at 500 degrees F for 8 minutes.</li>
    </ol>
  </div>
</body></html>`;

    const saladHtml = `<!DOCTYPE html>
<html><body>
  <div itemscope itemtype="http://schema.org/Recipe">
    <h1 itemprop="name">Caesar Salad</h1>
    <ul class="ingredients">
      <li itemprop="recipeIngredient">1 head romaine lettuce</li>
      <li itemprop="recipeIngredient">1/2 cup parmesan cheese</li>
    </ul>
    <ol class="instructions">
      <li itemprop="recipeInstructions">Chop lettuce and toss with dressing.</li>
    </ol>
  </div>
</body></html>`;

    const multiFileZip = zipSync({
      "recipes/pizza.html": strToU8(pizzaHtml),
      "recipes/salad.html": strToU8(saladHtml),
      "photos/margherita.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x01]),
      "photos/extra_unused.jpg": new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x02])
    });

    const result = parseRecipeKeeperZip(multiFileZip);
    expect(result.recipes).toHaveLength(2);

    const pizza = result.recipes.find((r) => r.title === "Margherita Pizza");
    expect(pizza).toBeDefined();
    // Verify ingredient groups parsed from "Dough:" and "Topping:"
    expect(pizza?.ingredientGroups).toHaveLength(2);
    expect(pizza?.ingredientGroups[0].heading).toBe("Dough");
    expect(pizza?.ingredientGroups[0].items).toHaveLength(2);
    expect(pizza?.ingredientGroups[1].heading).toBe("Topping");
    expect(pizza?.ingredientGroups[1].items).toHaveLength(2);

    // Verify photo was matched and linked to pizza recipe
    expect(pizza?.photoIds).toHaveLength(1);
    const linkedPhoto = result.photos.find((p) => p.recipeId === pizza?.id);
    expect(linkedPhoto).toBeDefined();
    expect(linkedPhoto?.filename).toBe("margherita.jpg");

    // Verify salad parsed cleanly
    const salad = result.recipes.find((r) => r.title === "Caesar Salad");
    expect(salad).toBeDefined();
    expect(salad?.ingredientGroups[0].items).toHaveLength(2);

    // Verify total photos includes orphaned image
    expect(result.photos).toHaveLength(2);
  });
});
