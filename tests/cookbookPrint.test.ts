import { describe, it, expect } from "vitest";
import { getRecipePrintHtml } from "../src/domain/export/printRecipe";
import {
  generateCookbookHtml,
  generateCookbookMarkdown,
  generateCookbookText,
  type CookbookOptions
} from "../src/domain/export/cookbookGenerator";
import type { Recipe } from "../src/domain/recipe/types";

function createMockRecipe(id: string, title: string, course = "Dinner"): Recipe {
  return {
    id,
    title,
    description: `A delicious recipe for ${title}.`,
    servings: 4,
    prepMinutes: 15,
    cookMinutes: 30,
    courses: [course],
    tags: ["family", "easy"],
    rating: 5,
    sourceName: "Family Recipe Book",
    ingredientGroups: [
      {
        heading: "Main",
        items: [
          {
            id: `${id}-ing-1`,
            raw: "2 cups all-purpose flour",
            name: "all-purpose flour",
            quantity: { kind: "single", value: 2 },
            unit: "cup",
            scalable: true
          },
          {
            id: `${id}-ing-2`,
            raw: "1 tsp kosher salt",
            name: "kosher salt",
            quantity: { kind: "single", value: 1 },
            unit: "tsp",
            scalable: true
          }
        ]
      }
    ],
    directionGroups: [
      {
        heading: "Preparation",
        steps: [
          { id: `${id}-step-1`, text: "Whisk flour and salt together in a bowl." },
          { id: `${id}-step-2`, text: "Bake at 350F for 30 minutes until golden.", note: "Check with toothpick" }
        ]
      }
    ],
    notes: "Best served warm with salted butter.",
    categories: ["Baking"],
    collectionIds: [],
    cookLog: [],
    favorite: false,
    photoIds: [],
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

describe("Single Recipe Print Document", () => {
  it("generates valid standalone HTML with meta, ingredients, and print toolbar", () => {
    const recipe = createMockRecipe("test-1", "Fluffy Dinner Rolls", "Breads");
    const html = getRecipePrintHtml(recipe);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Fluffy Dinner Rolls");
    expect(html).toContain("Yield: 4 servings");
    expect(html).toContain("Prep: 15 min");
    expect(html).toContain("2 cups all-purpose flour");
    expect(html).toContain("Whisk flour and salt together");
    expect(html).toContain("Best served warm with salted butter.");
    expect(html).toContain("print-toolbar");
    expect(html).toContain("Save as PDF");
    expect(html).toContain("window.print()");
  });
});

describe("Cookbook Builder Generator", () => {
  const sampleOptions: CookbookOptions = {
    title: "Thanksgiving Feast Cookbook",
    subtitle: "Holiday Traditions and Classics",
    author: "Chef Grandma",
    includeCover: true,
    includeToc: true,
    includeNotes: true,
    includeNutrition: false,
    includePhotos: false,
    twoColumnLayout: true,
    pageBreakAfterRecipe: true,
    fontSize: "standard"
  };

  const recipes = [
    createMockRecipe("rec-1", "Slow Cooker Turkey", "Dinner"),
    createMockRecipe("rec-2", "Gordon Ramsay Potatoes", "Sides"),
    createMockRecipe("rec-3", "Turkey Gravy", "Sauces")
  ];

  it("generates complete HTML with cover, toc, recipe sections, and print toolbar", () => {
    const html = generateCookbookHtml(recipes, sampleOptions);

    expect(html).toContain("Thanksgiving Feast Cookbook");
    expect(html).toContain("Holiday Traditions and Classics");
    expect(html).toContain("Chef Grandma");
    expect(html).toContain("Table of Contents");
    expect(html).toContain("Slow Cooker Turkey");
    expect(html).toContain("Gordon Ramsay Potatoes");
    expect(html).toContain("Turkey Gravy");
    expect(html).toContain("page-break");
    expect(html).toContain("print-toolbar");
    expect(html).toContain("Save as PDF");
    expect(html).toContain("window.print()");
  });

  it("generates clean Markdown cookbook", () => {
    const md = generateCookbookMarkdown(recipes, sampleOptions);

    expect(md).toContain("# Thanksgiving Feast Cookbook");
    expect(md).toContain("*Holiday Traditions and Classics*");
    expect(md).toContain("## Table of Contents");
    expect(md).toContain("## Slow Cooker Turkey");
    expect(md).toContain("- 2 cups all-purpose flour");
    expect(md).toContain("1. Whisk flour and salt together in a bowl.");
  });

  it("generates plain text cookbook format", () => {
    const txt = generateCookbookText(recipes, sampleOptions);

    expect(txt).toContain("THANKSGIVING FEAST COOKBOOK");
    expect(txt).toContain("TABLE OF CONTENTS");
    expect(txt).toContain("RECIPE 1: SLOW COOKER TURKEY");
    expect(txt).toContain("RECIPE 2: GORDON RAMSAY POTATOES");
    expect(txt).toContain("- 2 cups all-purpose flour");
  });

  it("honors options to omit cover and table of contents", () => {
    const bareOptions: CookbookOptions = {
      ...sampleOptions,
      includeCover: false,
      includeToc: false
    };
    const html = generateCookbookHtml(recipes, bareOptions);

    expect(html).not.toContain('<h1 class="cover-title">');
    expect(html).not.toContain('<h2 class="toc-title">Table of Contents</h2>');
    expect(html).toContain("Slow Cooker Turkey");
  });
});
