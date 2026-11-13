import { describe, it, expect } from "vitest";
import { normalizeRecipe, cleanStepText, cleanTrackingUrl, formatTimeMinutes } from "../src/domain/recipe/normalize";
import type { Recipe } from "../src/domain/recipe/types";

describe("Recipe Normalization", (): void => {
  it("strips tracking parameters from source URLs", (): void => {
    const rawUrl = "https://example.com/recipe?utm_source=newsletter&utm_medium=email&fbclid=xyz123&id=42";
    const cleaned = cleanTrackingUrl(rawUrl);
    expect(cleaned).toBe("https://example.com/recipe?id=42");
  });

  it("cleans step prefixes and standardizes temperature format", (): void => {
    expect(cleanStepText("Step 1: Preheat oven to 350 degrees F.")).toBe("Preheat oven to 350\u00B0F.");
    expect(cleanStepText("2) Mix ingredients well.")).toBe("Mix ingredients well.");
    expect(cleanStepText("* Bake at 400 deg F for 20 minutes.")).toBe("Bake at 400\u00B0F for 20 minutes.");
  });

  it("formats minutes into readable time strings", (): void => {
    expect(formatTimeMinutes(75)).toBe("1 hr 15 min");
    expect(formatTimeMinutes(60)).toBe("1 hr");
    expect(formatTimeMinutes(45)).toBe("45 min");
  });

  it("is idempotent when run multiple times on messy input", (): void => {
    const messyRecipe: Recipe = {
      id: "rec-1",
      title: "  Chocolate Chip Cookies  ",
      description: "  The best cookies ever   ",
      sourceUrl: "https://example.com/cookies?utm_source=share",
      servings: 24,
      servingsLabel: " cookies ",
      prepMinutes: 15,
      cookMinutes: 10,
      ingredientGroups: [
        {
          heading: "  Dry Ingredients  ",
          items: [
            { id: "i1", raw: "  2 1/4 cups flour ", scalable: true },
            { id: "i2", raw: "1 tsp baking soda", scalable: true }
          ]
        }
      ],
      directionGroups: [
        {
          steps: [
            { id: "s1", text: "Step 1: Preheat oven to 375 degrees F." },
            { id: "s2", text: "2. Combine flour and baking soda in small bowl." }
          ]
        }
      ],
      notes: " Store in airtight container. ",
      cookLog: [],
      courses: [" Dessert ", ""],
      categories: [" Cookies "],
      collectionIds: [],
      tags: [" sweet ", " baking "],
      rating: 5,
      favorite: true,
      photoIds: [],
      createdAt: "2026-11-11T00:00:00Z",
      updatedAt: "2026-11-11T00:00:00Z",
      schemaVersion: 1
    };

    const firstRun = normalizeRecipe(messyRecipe);
    const secondRun = normalizeRecipe(firstRun);

    expect(firstRun.title).toBe("Chocolate Chip Cookies");
    expect(firstRun.totalMinutes).toBe(25);
    expect(firstRun.directionGroups[0].steps[0].text).toBe("Preheat oven to 375\u00B0F.");
    expect(firstRun.directionGroups[0].steps[1].text).toBe("Combine flour and baking soda in small bowl.");
    expect(secondRun).toEqual(firstRun);
  });
});
