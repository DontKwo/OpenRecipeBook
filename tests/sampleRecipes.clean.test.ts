import { describe, it, expect } from "vitest";
import { SAMPLE_RECIPES } from "../src/data/sampleRecipes";
import { normalizeRecipe, cleanStepText } from "../src/domain/recipe/normalize";
import { sanitizeText, sanitizeHeading } from "../src/domain/recipe/sanitizeText";
import type { Recipe } from "../src/domain/recipe/types";

describe("Sample Recipes Hygiene & Sanitization", () => {
  it("verifies all 20 sample recipes have no backticks, leading #, deg, unformatted temp, or stray symbols", () => {
    expect(SAMPLE_RECIPES.length).toBe(20);

    for (const recipe of SAMPLE_RECIPES) {
      // Check title, description, notes
      expect(recipe.title).not.toMatch(/`/);
      expect(recipe.title).not.toMatch(/^#/);
      expect(recipe.title).not.toMatch(/\bdeg\b/i);
      expect(recipe.title).not.toMatch(/\d{2,3}F\b/);

      if (recipe.description) {
        expect(recipe.description).not.toMatch(/`/);
        expect(recipe.description).not.toMatch(/^#/);
        expect(recipe.description).not.toMatch(/\bdeg\b/i);
        expect(recipe.description).not.toMatch(/\d{2,3}F\b/);
      }

      if (recipe.notes) {
        expect(recipe.notes).not.toMatch(/`/);
        expect(recipe.notes).not.toMatch(/^#/);
        expect(recipe.notes).not.toMatch(/\bdeg\b/i);
        expect(recipe.notes).not.toMatch(/\d{2,3}F\b/);
        expect(recipe.notes).not.toMatch(/^(?:Cook's\s+)?(?:Notes?|Options?):/i);
        expect(recipe.notes).not.toMatch(/\|\s*---\s*\|/); // No unparsed markdown tables
      }

      // Check ingredient groups
      for (const group of recipe.ingredientGroups) {
        if (group.heading) {
          expect(group.heading).not.toMatch(/:\s*$/);
        }
        for (const ing of group.items) {
          expect(ing.raw).not.toMatch(/^~/);
          expect(ing.raw).not.toMatch(
            /\b(?:cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|g|grams?|ml)\+/i
          );
          expect(ing.raw).not.toMatch(/\bdeg\b/i);
          expect(ing.raw).not.toMatch(/`/);
        }
      }

      // Check direction groups
      for (const group of recipe.directionGroups) {
        if (group.heading) {
          expect(group.heading).not.toMatch(/:\s*$/);
        }
        for (const step of group.steps) {
          // No unbalanced single * at start followed by **
          expect(step.text).not.toMatch(/^\*[^\*\n]+\*\*/);
          // No stray * at end
          expect(step.text).not.toMatch(/\*\s*$/);
          expect(step.text).not.toMatch(/`/);
          expect(step.text).not.toMatch(/\bdeg\b/i);
          expect(step.text).not.toMatch(/\d{2,3}F\b/);
        }
      }
    }
  });

  it("verifies idempotency of normalizeRecipe for all sample recipes", () => {
    for (const recipe of SAMPLE_RECIPES) {
      const normalizedOnce = normalizeRecipe(recipe);
      const normalizedTwice = normalizeRecipe(normalizedOnce);

      expect(normalizedTwice).toEqual(normalizedOnce);
    }
  });

  it("sanitizes exact defective string patterns", () => {
    // 1. Unbalanced asterisk lead-in
    expect(sanitizeText("*Thaw and de-chill.** If frozen...")).toBe(
      "**Thaw and de-chill.** If frozen..."
    );

    // 2. Stray * at end
    expect(sanitizeText("Note - lemon flavor, but add to taste.*")).toBe(
      "Note - lemon flavor, but add to taste."
    );

    // 3. 350F -> 350°F
    expect(sanitizeText("Preheat oven to 350F.")).toBe("Preheat oven to 350°F.");

    // 4. reads 350 deg . -> reads 350°F.
    expect(sanitizeText("pot reads 350 deg . Working in batches")).toBe(
      "pot reads 350°F. Working in batches"
    );

    // 5. 165 deg F (74 deg C) -> 165°F (74°C)
    expect(sanitizeText("breast reaches 165 deg F (74 deg C) on a thermometer")).toBe(
      "breast reaches 165°F (74°C) on a thermometer"
    );

    // 6. Stray leading ~
    expect(sanitizeText("~3/4 cup of milk")).toBe("3/4 cup of milk");

    // 7. Unit-trailing +
    expect(sanitizeText("3 cups+ mini marshmallows")).toBe("3 cups mini marshmallows");
    expect(sanitizeText("1 tsp+ hot sauce")).toBe("1 tsp hot sauce");

    // 8. Notes label prefix
    expect(sanitizeText("Notes:\n- When I make this recipe")).toBe(
      "- When I make this recipe"
    );
    expect(sanitizeText("Options:\nTo make this gravy")).toBe("To make this gravy");

    // 9. Heading trailing colon
    expect(sanitizeHeading("Make the loaf:")).toBe("Make the loaf");
    expect(sanitizeHeading("Make the lemon glaze:")).toBe("Make the lemon glaze");
  });

  it("verifies cleanStepText strips bullets and numbering without breaking markdown bold", () => {
    expect(cleanStepText("1. **Thaw and de-chill.** If frozen...")).toBe(
      "**Thaw and de-chill.** If frozen..."
    );
    expect(cleanStepText("- **Prep the turkey.** Remove it...")).toBe(
      "**Prep the turkey.** Remove it..."
    );
    expect(cleanStepText("*Thaw and de-chill.** If frozen...")).toBe(
      "**Thaw and de-chill.** If frozen..."
    );
  });

  it("cleans and normalizes old sample data fixture through migration logic", () => {
    const dirtyRecipeFixture: Recipe = {
      id: "fixture-old-recipe",
      title: "Dirty Recipe",
      servings: 4,
      ingredientGroups: [
        {
          heading: "Main Ingredients:",
          items: [
            { id: "i1", raw: "~3/4 cup milk", scalable: true },
            { id: "i2", raw: "3 cups+ mini marshmallows", scalable: true }
          ]
        }
      ],
      directionGroups: [
        {
          heading: "Baking:",
          steps: [
            {
              id: "s1",
              text: "*Preheat oven to 350F.** Oil pot until thermometer reads 350 deg ."
            }
          ]
        }
      ],
      notes: "Notes:\n- Bake at 165 deg F (74 deg C)",
      cookLog: [],
      courses: ["Dinner"],
      categories: ["Poultry"],
      collectionIds: [],
      tags: ["turkey"],
      rating: 0,
      favorite: false,
      photoIds: [],
      createdAt: "2026-11-12T12:00:00Z",
      updatedAt: "2026-11-12T12:00:00Z",
      schemaVersion: 1
    };

    const cleaned = normalizeRecipe(dirtyRecipeFixture);

    expect(cleaned.ingredientGroups[0].heading).toBe("Main Ingredients");
    expect(cleaned.ingredientGroups[0].items[0].raw).toBe("3/4 cup milk");
    expect(cleaned.ingredientGroups[0].items[1].raw).toBe("3 cups mini marshmallows");

    expect(cleaned.directionGroups[0].heading).toBe("Baking");
    expect(cleaned.directionGroups[0].steps[0].text).toBe(
      "**Preheat oven to 350°F.** Oil pot until thermometer reads 350°F."
    );

    expect(cleaned.notes).toBe("- Bake at 165°F (74°C)");
  });
});
