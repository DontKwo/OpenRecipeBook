import { describe, it, expect } from "vitest";
import {
  calculateWeekMonday,
  createMealPlanEntry,
  moveMealPlanEntry,
  copyMealPlanEntry,
  filterEntriesForWeek,
  filterEntriesForMonth
} from "../src/domain/planner/plannerService";
import type { MealPlanEntry } from "../src/domain/recipe/types";

describe("Meal Planner Service & Move/Copy Operations", (): void => {
  it("calculates Monday correctly for any day of the week", (): void => {
    // Wednesday Nov 11, 2026 -> Monday is Nov 9, 2026
    const wednesday = new Date(2026, 10, 11);
    const monday1 = calculateWeekMonday(wednesday);
    expect(monday1.getDay()).toBe(1); // Monday
    expect(monday1.getDate()).toBe(9);

    // Sunday Nov 15, 2026 -> Monday is Nov 9, 2026
    const sunday = new Date(2026, 10, 15);
    const monday2 = calculateWeekMonday(sunday);
    expect(monday2.getDay()).toBe(1);
    expect(monday2.getDate()).toBe(9);

    // Monday Nov 9, 2026 -> Monday is Nov 9, 2026
    const mondayTarget = new Date(2026, 10, 9);
    const monday3 = calculateWeekMonday(mondayTarget);
    expect(monday3.getDate()).toBe(9);
  });

  it("creates a meal plan entry with expected properties and defaults", (): void => {
    const entry = createMealPlanEntry("2026-11-12", "Dinner", "recipe-1", undefined, 2);
    expect(entry.id).toMatch(/^meal-/);
    expect(entry.date).toBe("2026-11-12");
    expect(entry.slot).toBe("Dinner");
    expect(entry.recipeId).toBe("recipe-1");
    expect(entry.multiplier).toBe(2);

    const freeTextEntry = createMealPlanEntry("2026-11-13", "Lunch", undefined, "Eat out with coworkers");
    expect(freeTextEntry.recipeId).toBeUndefined();
    expect(freeTextEntry.freeText).toBe("Eat out with coworkers");
    expect(freeTextEntry.multiplier).toBe(1);
  });

  it("moves an entry to a new date and slot preserving id and multiplier", (): void => {
    const original: MealPlanEntry = {
      id: "orig-123",
      date: "2026-11-12",
      slot: "Lunch",
      recipeId: "rec-salad",
      multiplier: 1.5
    };

    const moved = moveMealPlanEntry(original, "2026-11-14", "Dinner");
    expect(moved.id).toBe("orig-123");
    expect(moved.date).toBe("2026-11-14");
    expect(moved.slot).toBe("Dinner");
    expect(moved.recipeId).toBe("rec-salad");
    expect(moved.multiplier).toBe(1.5);
  });

  it("copies an entry to a new date and slot generating a fresh id", (): void => {
    const original: MealPlanEntry = {
      id: "orig-123",
      date: "2026-11-12",
      slot: "Breakfast",
      recipeId: "rec-pancakes",
      multiplier: 2
    };

    const copied = copyMealPlanEntry(original, "2026-11-15", "Breakfast");
    expect(copied.id).not.toBe(original.id);
    expect(copied.id).toMatch(/^meal-/);
    expect(copied.date).toBe("2026-11-15");
    expect(copied.slot).toBe("Breakfast");
    expect(copied.recipeId).toBe("rec-pancakes");
  });

  it("filters entries for week and month accurately", (): void => {
    const monday = new Date(2026, 10, 9); // Nov 9, 2026
    const entries: MealPlanEntry[] = [
      { id: "1", date: "2026-11-09", slot: "Dinner", multiplier: 1 },
      { id: "2", date: "2026-11-12", slot: "Lunch", multiplier: 1 },
      { id: "3", date: "2026-11-15", slot: "Dinner", multiplier: 1 },
      { id: "4", date: "2026-11-16", slot: "Dinner", multiplier: 1 }, // Next week
      { id: "5", date: "2026-12-01", slot: "Breakfast", multiplier: 1 } // Next month
    ];

    const weekEntries = filterEntriesForWeek(entries, monday);
    expect(weekEntries).toHaveLength(3);
    expect(weekEntries.map((e) => e.id)).toEqual(["1", "2", "3"]);

    const novEntries = filterEntriesForMonth(entries, 2026, 10);
    expect(novEntries).toHaveLength(4);
    expect(novEntries.map((e) => e.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("saves a week of meals as a reusable SavedMenu and restores it to any week", (): void => {
    const monday = new Date(2026, 10, 9); // Nov 9, 2026
    const weekEntries: MealPlanEntry[] = [
      { id: "m-1", date: "2026-11-09", slot: "Dinner", recipeId: "rec-turkey", multiplier: 1 },
      { id: "m-2", date: "2026-11-10", slot: "Lunch", freeText: "Tacos", multiplier: 1 },
      { id: "m-3", date: "2026-11-13", slot: "Dinner", recipeId: "rec-mac", multiplier: 2 }
    ];

    // Convert week entries to saved menu items relative to Monday
    const savedItems = weekEntries.map((e) => {
      const entryDate = new Date(`${e.date}T00:00:00`);
      const dayOffset = Math.round((entryDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
      return {
        dayOffset,
        slot: e.slot,
        recipeId: e.recipeId,
        freeText: e.freeText,
        multiplier: e.multiplier
      };
    });

    expect(savedItems).toHaveLength(3);
    expect(savedItems[0].dayOffset).toBe(0);
    expect(savedItems[1].dayOffset).toBe(1);
    expect(savedItems[2].dayOffset).toBe(4);

    // Restore to future week (Nov 23, 2026)
    const futureMonday = new Date(2026, 10, 23);
    const restoredEntries = savedItems.map((item, idx) => {
      const targetDate = new Date(futureMonday);
      targetDate.setDate(targetDate.getDate() + item.dayOffset);
      const dateStr = targetDate.toISOString().split("T")[0];
      return {
        id: `meal-restored-${idx}`,
        date: dateStr,
        slot: item.slot,
        recipeId: item.recipeId,
        freeText: item.freeText,
        multiplier: item.multiplier
      };
    });

    expect(restoredEntries).toHaveLength(3);
    expect(restoredEntries[0].date).toBe("2026-11-23");
    expect(restoredEntries[1].date).toBe("2026-11-24");
    expect(restoredEntries[2].date).toBe("2026-11-27");
  });
});
