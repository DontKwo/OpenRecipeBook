import { describe, it, expect } from "vitest";
import {
  generateMonthGrid,
  formatMonthYearHeader,
  getSlotBadgeStyle
} from "../src/domain/planner/calendarGrid";

describe("Calendar Grid Service", (): void => {
  it("formats month and year header string", (): void => {
    // Month 10 is November (0-indexed)
    const header = formatMonthYearHeader(2026, 10);
    expect(header).toBe("November 2026");
  });

  it("generates month grid with multiples of 7 days starting on Monday", (): void => {
    // November 2026 starts on Sunday (day 0), which is index 6 when week starts on Monday
    const grid = generateMonthGrid(2026, 10, new Date(2026, 10, 15));

    expect(grid.length % 7).toBe(0);
    expect(grid.length).toBeGreaterThanOrEqual(35);

    // Days in November is 30
    const novemberDays = grid.filter((d) => d.isCurrentMonth);
    expect(novemberDays.length).toBe(30);

    // Reference today date is marked
    const todayCell = grid.find((d) => d.isToday);
    expect(todayCell).toBeDefined();
    expect(todayCell?.dayNumber).toBe(15);
  });

  it("handles February in leap year and standard years", (): void => {
    // 2024 is a leap year (29 days)
    const leapGrid = generateMonthGrid(2024, 1);
    const leapDays = leapGrid.filter((d) => d.isCurrentMonth);
    expect(leapDays.length).toBe(29);

    // 2025 is not a leap year (28 days)
    const nonLeapGrid = generateMonthGrid(2025, 1);
    const nonLeapDays = nonLeapGrid.filter((d) => d.isCurrentMonth);
    expect(nonLeapDays.length).toBe(28);
  });

  it("provides slot badge tokens using design system CSS variables", (): void => {
    const breakfast = getSlotBadgeStyle("Breakfast");
    expect(breakfast.color).toBe("var(--warning)");

    const lunch = getSlotBadgeStyle("Lunch");
    expect(lunch.color).toBe("var(--success)");

    const dinner = getSlotBadgeStyle("Dinner");
    expect(dinner.color).toBe("var(--accent)");

    const custom = getSlotBadgeStyle("Late Night Snack");
    expect(custom.color).toBe("var(--muted)");
  });
});
