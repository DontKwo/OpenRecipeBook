import { describe, it, expect } from "vitest";
import type { Recipe, Collection } from "../src/domain/recipe/types";

describe("Collections Domain & Assignment Logic", (): void => {
  const sampleRecipes: Recipe[] = [
    {
      id: "rec-1",
      title: "Pancakes",
      courses: ["Breakfast"],
      categories: [],
      collectionIds: ["col-breakfast", "col-quick"],
      tags: [],
      rating: 5,
      favorite: true,
      servings: 4,
      ingredientGroups: [],
      directionGroups: [],
      notes: "Fluffy breakfast pancakes",
      cookLog: [],
      photoIds: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      schemaVersion: 1
    },
    {
      id: "rec-2",
      title: "Beef Stew",
      courses: ["Dinner"],
      categories: [],
      collectionIds: ["col-comfort"],
      tags: [],
      rating: 4,
      favorite: false,
      servings: 6,
      ingredientGroups: [],
      directionGroups: [],
      notes: "Slow cooker comfort",
      cookLog: [],
      photoIds: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      schemaVersion: 1
    },
    {
      id: "rec-3",
      title: "Caesar Salad",
      courses: ["Lunch", "Dinner"],
      categories: [],
      collectionIds: ["col-quick"],
      tags: [],
      rating: 4,
      favorite: true,
      servings: 2,
      ingredientGroups: [],
      directionGroups: [],
      notes: "Crisp salad lunch",
      cookLog: [],
      photoIds: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      schemaVersion: 1
    }
  ];

  it("filters recipes by collection id correctly", (): void => {
    const quickRecipes = sampleRecipes.filter((r) => r.collectionIds?.includes("col-quick"));
    expect(quickRecipes).toHaveLength(2);
    expect(quickRecipes.map((r) => r.title)).toEqual(expect.arrayContaining(["Pancakes", "Caesar Salad"]));

    const comfortRecipes = sampleRecipes.filter((r) => r.collectionIds?.includes("col-comfort"));
    expect(comfortRecipes).toHaveLength(1);
    expect(comfortRecipes[0].title).toBe("Beef Stew");

    const unusedRecipes = sampleRecipes.filter((r) => r.collectionIds?.includes("col-nonexistent"));
    expect(unusedRecipes).toHaveLength(0);
  });

  it("batch assigns recipes to a collection without duplicates", (): void => {
    const targetCollectionId = "col-favorites-selection";
    const selectedIds = ["rec-1", "rec-2"];

    const updatedRecipes = sampleRecipes.map((r) => {
      if (selectedIds.includes(r.id)) {
        const existing = r.collectionIds || [];
        const next = existing.includes(targetCollectionId) ? existing : [...existing, targetCollectionId];
        return { ...r, collectionIds: next };
      }
      return r;
    });

    const assigned = updatedRecipes.filter((r) => r.collectionIds?.includes(targetCollectionId));
    expect(assigned).toHaveLength(2);
    expect(assigned.map((r) => r.id)).toEqual(["rec-1", "rec-2"]);

    // Assigning again should not add duplicate IDs
    const reUpdated = updatedRecipes.map((r) => {
      if (selectedIds.includes(r.id)) {
        const existing = r.collectionIds || [];
        const next = existing.includes(targetCollectionId) ? existing : [...existing, targetCollectionId];
        return { ...r, collectionIds: next };
      }
      return r;
    });
    const pancake = reUpdated.find((r) => r.id === "rec-1");
    expect(pancake?.collectionIds.filter((id) => id === targetCollectionId)).toHaveLength(1);
  });

  it("cascades collection deletion by stripping deleted collectionId from recipes", (): void => {
    const deletedCollectionId = "col-quick";

    const cleanedRecipes = sampleRecipes.map((r) => ({
      ...r,
      collectionIds: r.collectionIds?.filter((id) => id !== deletedCollectionId) || []
    }));

    const matching = cleanedRecipes.filter((r) => r.collectionIds.includes(deletedCollectionId));
    expect(matching).toHaveLength(0);

    const pancake = cleanedRecipes.find((r) => r.id === "rec-1");
    expect(pancake?.collectionIds).toEqual(["col-breakfast"]);

    const caesar = cleanedRecipes.find((r) => r.id === "rec-3");
    expect(caesar?.collectionIds).toEqual([]);
  });

  it("creates and mutates collection records with description", (): void => {
    const col: Collection = {
      id: "col-summer",
      name: "Summer Cookouts",
      description: "Burgers, salads, and refreshing drinks",
      createdAt: new Date().toISOString()
    };

    expect(col.name).toBe("Summer Cookouts");
    expect(col.description).toBe("Burgers, salads, and refreshing drinks");

    const updated: Collection = {
      ...col,
      name: "Summer BBQ & Grill"
    };

    expect(updated.name).toBe("Summer BBQ & Grill");
    expect(updated.id).toBe(col.id);
  });
});
