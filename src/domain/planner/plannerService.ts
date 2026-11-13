import type { MealPlanEntry } from "../recipe/types";

// Calculate Monday date of the week containing targetDate
export function calculateWeekMonday(targetDate: Date): Date {
  const d = new Date(targetDate);
  const day = d.getDay();
  // Sunday is 0; Monday is 1. If Sunday, go back 6 days; otherwise go back (day - 1) days.
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Create a new meal plan entry with unique ID and default multiplier
export function createMealPlanEntry(
  date: string,
  slot: string,
  recipeId?: string,
  freeText?: string,
  multiplier: number = 1
): MealPlanEntry {
  return {
    id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date,
    slot,
    recipeId: recipeId || undefined,
    freeText: freeText ? freeText.trim() : undefined,
    multiplier: multiplier > 0 ? multiplier : 1
  };
}

// Move an existing meal plan entry to a new date and slot
export function moveMealPlanEntry(
  entry: MealPlanEntry,
  newDate: string,
  newSlot: string
): MealPlanEntry {
  return {
    ...entry,
    date: newDate,
    slot: newSlot
  };
}

// Clone an entry to a new date and slot with a fresh ID
export function copyMealPlanEntry(
  entry: MealPlanEntry,
  newDate: string,
  newSlot: string
): MealPlanEntry {
  return {
    ...entry,
    id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    date: newDate,
    slot: newSlot
  };
}

// Filter entries for the 7-day week starting on weekMonday
export function filterEntriesForWeek(
  entries: MealPlanEntry[],
  weekMonday: Date
): MealPlanEntry[] {
  const weekDates = new Set<string>();
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(weekMonday);
    day.setDate(day.getDate() + i);
    weekDates.add(day.toISOString().split("T")[0]);
  }
  return entries.filter((e): boolean => weekDates.has(e.date));
}

// Filter entries belonging to a specific calendar month
export function filterEntriesForMonth(
  entries: MealPlanEntry[],
  year: number,
  month: number
): MealPlanEntry[] {
  const pad = (n: number): string => n.toString().padStart(2, "0");
  const prefix = `${year}-${pad(month + 1)}`;
  return entries.filter((e): boolean => e.date.startsWith(prefix));
}
