export interface CalendarGridDay {
  dateStr: string;
  dayNumber: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

// Generate calendar days for a 35 or 42 day month view grid starting on Monday
export function generateMonthGrid(
  year: number,
  month: number,
  referenceToday: Date = new Date()
): CalendarGridDay[] {
  const todayStr = referenceToday.toISOString().split("T")[0];

  // First day of current month
  const firstDay = new Date(year, month, 1);
  // 0 = Sun, 1 = Mon ... 6 = Sat. Monday as start of week: 0 -> Mon, 6 -> Sun
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7;

  // Number of days in current month
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();

  // Number of days in previous month
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarGridDay[] = [];

  // Leading days from previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  for (let i = firstDayOfWeek - 1; i >= 0; i -= 1) {
    const dayNum = daysInPrevMonth - i;
    const date = new Date(prevYear, prevMonth, dayNum);
    const dateStr = date.toISOString().split("T")[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    days.push({
      dateStr,
      dayNumber: dayNum,
      month: prevMonth,
      year: prevYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend
    });
  }

  // Days in current month
  for (let d = 1; d <= daysInCurrentMonth; d += 1) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split("T")[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    days.push({
      dateStr,
      dayNumber: d,
      month,
      year,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      isWeekend
    });
  }

  // Trailing days from next month to complete 5 or 6 weeks (multiples of 7)
  const remainder = days.length % 7;
  const trailingDaysNeeded = remainder === 0 ? 0 : 7 - remainder;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;

  for (let t = 1; t <= trailingDaysNeeded; t += 1) {
    const date = new Date(nextYear, nextMonth, t);
    const dateStr = date.toISOString().split("T")[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    days.push({
      dateStr,
      dayNumber: t,
      month: nextMonth,
      year: nextYear,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      isWeekend
    });
  }

  // Ensure minimum 35 cells for full month height stability
  if (days.length < 35) {
    const startT = trailingDaysNeeded + 1;
    for (let extra = 0; extra < 7; extra += 1) {
      const dayNum = startT + extra;
      const date = new Date(nextYear, nextMonth, dayNum);
      const dateStr = date.toISOString().split("T")[0];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      days.push({
        dateStr,
        dayNumber: dayNum,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isWeekend
      });
    }
  }

  return days;
}

// Format year and month for display header
export function formatMonthYearHeader(year: number, month: number): string {
  const d = new Date(year, month, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// Determine slot styling tokens using CSS variables
export function getSlotBadgeStyle(slot: string): { bg: string; color: string; border: string } {
  const lower = slot.toLowerCase();
  if (lower === "breakfast") {
    return {
      bg: "var(--surface-alt)",
      color: "var(--warning)",
      border: "1px solid var(--border)"
    };
  }
  if (lower === "lunch") {
    return {
      bg: "var(--surface-alt)",
      color: "var(--success)",
      border: "1px solid var(--border)"
    };
  }
  if (lower === "dinner") {
    return {
      bg: "var(--surface-alt)",
      color: "var(--accent)",
      border: "1px solid var(--border)"
    };
  }
  return {
    bg: "var(--surface-alt)",
    color: "var(--muted)",
    border: "1px solid var(--border)"
  };
}
