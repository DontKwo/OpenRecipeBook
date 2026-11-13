import { useState, useMemo, type FC, type ReactElement, type FormEvent, type DragEvent } from "react";
import type { MealPlanEntry, Recipe, SavedMenu, SavedMenuItem } from "../../domain/recipe/types";
import {
  generateMonthGrid,
  formatMonthYearHeader,
  getSlotBadgeStyle,
  type CalendarGridDay
} from "../../domain/planner/calendarGrid";
import {
  calculateWeekMonday,
  createMealPlanEntry,
  moveMealPlanEntry,
  filterEntriesForWeek
} from "../../domain/planner/plannerService";
import { TrashIcon, ShoppingCartIcon, CloseIcon, BookOpenIcon, SearchIcon } from "../../ui/icons";

export interface MealPlannerViewProps {
  entries: MealPlanEntry[];
  recipes: Recipe[];
  savedMenus?: SavedMenu[];
  onSaveEntry: (entry: MealPlanEntry) => void;
  onSaveMultipleEntries?: (entries: MealPlanEntry[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onAddMealsToShoppingList: (entries: MealPlanEntry[]) => void;
  onSaveMenu?: (menu: SavedMenu) => void;
  onDeleteMenu?: (menuId: string) => void;
}

const DEFAULT_SLOTS: string[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export const MealPlannerView: FC<MealPlannerViewProps> = ({
  entries,
  recipes,
  savedMenus = [],
  onSaveEntry,
  onSaveMultipleEntries,
  onDeleteEntry,
  onAddMealsToShoppingList,
  onSaveMenu,
  onDeleteMenu
}): ReactElement => {
  // View mode switcher: week vs month
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  // Custom slots state
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [showSlotsModal, setShowSlotsModal] = useState<boolean>(false);
  const [newSlotInput, setNewSlotInput] = useState<string>("");

  // Recipe tray & drag-and-drop state
  const [showRecipeTray, setShowRecipeTray] = useState<boolean>(true);
  const [traySearchQuery, setTraySearchQuery] = useState<string>("");
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Current week start (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>((): Date => {
    return calculateWeekMonday(new Date());
  });

  // Current month view year and month (0-indexed)
  const [currentMonthYear, setCurrentMonthYear] = useState<{ year: number; month: number }>(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  // Modal state for adding a meal
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalSlot, setModalSlot] = useState<string>("Dinner");
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [freeTextMeal, setFreeTextMeal] = useState<string>("");
  const [multiplier, setMultiplier] = useState<number>(1);

  // Reusable Menus state
  const [showSaveMenuModal, setShowSaveMenuModal] = useState<boolean>(false);
  const [showMenusModal, setShowMenusModal] = useState<boolean>(false);
  const [menuNameInput, setMenuNameInput] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Month grid calculation
  const monthGridDays = useMemo((): CalendarGridDay[] => {
    return generateMonthGrid(currentMonthYear.year, currentMonthYear.month);
  }, [currentMonthYear]);

  // Generate 7 days of current week
  const weekDays = useMemo(() => {
    const days: { dateStr: string; label: string; dayName: string }[] = [];
    for (let index = 0; index < 7; index += 1) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + index);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ dateStr, label, dayName });
    }
    return days;
  }, [currentWeekStart]);

  const changeWeek = (offsetWeeks: number): void => {
    const next = new Date(currentWeekStart);
    next.setDate(next.getDate() + offsetWeeks * 7);
    setCurrentWeekStart(next);
  };

  const changeMonth = (offsetMonths: number): void => {
    setCurrentMonthYear((prev) => {
      let nextM = prev.month + offsetMonths;
      let nextY = prev.year;
      if (nextM < 0) {
        nextM = 11;
        nextY -= 1;
      } else if (nextM > 11) {
        nextM = 0;
        nextY += 1;
      }
      return { year: nextY, month: nextM };
    });
  };

  const jumpToToday = (): void => {
    const today = new Date();
    setCurrentWeekStart(calculateWeekMonday(today));
    setCurrentMonthYear({ year: today.getFullYear(), month: today.getMonth() });
  };

  const jumpToSpecificDate = (isoDateStr: string): void => {
    const target = new Date(`${isoDateStr}T00:00:00`);
    if (isNaN(target.getTime())) return;
    setCurrentWeekStart(calculateWeekMonday(target));
    setCurrentMonthYear({ year: target.getFullYear(), month: target.getMonth() });
  };

  const handleDragStartRecipe = (e: DragEvent, recipeId: string): void => {
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "new-recipe", recipeId }));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDragStartEntry = (e: DragEvent, entryId: string): void => {
    e.stopPropagation();
    e.dataTransfer.setData("application/json", JSON.stringify({ type: "move-entry", entryId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleSlotDragOver = (e: DragEvent, targetId: string): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId);
    }
  };

  const handleSlotDragLeave = (targetId: string): void => {
    if (dragOverTarget === targetId) {
      setDragOverTarget(null);
    }
  };

  const handleSlotDrop = (e: DragEvent, dateStr: string, slot: string): void => {
    e.preventDefault();
    setDragOverTarget(null);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.type === "new-recipe" && data.recipeId) {
        const newEntry = createMealPlanEntry(dateStr, slot, data.recipeId, undefined, 1);
        onSaveEntry(newEntry);
        const r = recipeMap.get(data.recipeId);
        if (r) {
          setToastMessage(`Scheduled "${r.title}" for ${slot}`);
          setTimeout((): void => setToastMessage(null), 3000);
        }
      } else if (data.type === "move-entry" && data.entryId) {
        const existing = entries.find((en): boolean => en.id === data.entryId);
        if (existing) {
          const updated = moveMealPlanEntry(existing, dateStr, slot);
          onSaveEntry(updated);
          setToastMessage(`Moved meal to ${slot}`);
          setTimeout((): void => setToastMessage(null), 2500);
        }
      }
    } catch {
      // Ignore parse error
    }
  };

  const handleAddSlot = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = newSlotInput.trim();
    if (!trimmed || slots.includes(trimmed)) return;
    setSlots((prev) => [...prev, trimmed]);
    setNewSlotInput("");
    setShowSlotsModal(false);
  };

  const handleDeleteSlot = (slotToRemove: string): void => {
    if (slots.length <= 1) return;
    if (!window.confirm(`Remove meal slot "${slotToRemove}"?`)) return;
    setSlots((prev) => prev.filter((s) => s !== slotToRemove));
  };

  const handleResetSlots = (): void => {
    setSlots(DEFAULT_SLOTS);
  };

  const handleOpenAddModal = (dateStr: string, slot: string) => {
    setModalDate(dateStr);
    setModalSlot(slot);
    setSelectedRecipeId(recipes[0]?.id || "");
    setFreeTextMeal("");
    setMultiplier(1);
  };

  const handleSaveModalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDate) return;

    const newEntry = createMealPlanEntry(
      modalDate,
      modalSlot,
      selectedRecipeId || undefined,
      freeTextMeal.trim() || undefined,
      multiplier
    );

    onSaveEntry(newEntry);
    setModalDate(null);
  };

  // Filter entries for the current week using plannerService
  const currentWeekEntries = useMemo(() => {
    return filterEntriesForWeek(entries, currentWeekStart);
  }, [entries, currentWeekStart]);

  const recipeMap = useMemo(() => {
    return new Map<string, Recipe>(recipes.map((r) => [r.id, r]));
  }, [recipes]);

  const filteredTrayRecipes = useMemo((): Recipe[] => {
    const q = traySearchQuery.trim().toLowerCase();
    if (!q) return recipes;
    return recipes.filter((r: Recipe): boolean => {
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchCourse = r.courses.some((c: string): boolean => c.toLowerCase().includes(q));
      return matchTitle || matchCourse;
    });
  }, [recipes, traySearchQuery]);

  const handleSuggestPlan = (): void => {
    if (recipes.length === 0) return;

    const existingKeys = new Set(currentWeekEntries.map((e) => `${e.date}__${e.slot}`));
    const usedRecipeIds = new Set(currentWeekEntries.map((e) => e.recipeId).filter(Boolean));
    const newEntries: MealPlanEntry[] = [];

    for (const day of weekDays) {
      for (const slot of ["Dinner", "Lunch", "Breakfast"]) {
        const key = `${day.dateStr}__${slot}`;
        if (existingKeys.has(key)) continue;

        // Find candidates matching slot course
        let candidates = recipes.filter((r) => r.courses.includes(slot) && !usedRecipeIds.has(r.id));
        if (candidates.length === 0) {
          candidates = recipes.filter((r) => !usedRecipeIds.has(r.id));
        }
        if (candidates.length === 0) {
          candidates = [...recipes];
        }

        // Prioritize favorites and high ratings
        candidates.sort((a, b) => {
          if (a.favorite && !b.favorite) return -1;
          if (!a.favorite && b.favorite) return 1;
          return (b.rating || 0) - (a.rating || 0);
        });

        const picked = candidates[0];
        if (picked) {
          usedRecipeIds.add(picked.id);
          const entry: MealPlanEntry = {
            id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            date: day.dateStr,
            slot,
            recipeId: picked.id,
            multiplier: 1
          };
          newEntries.push(entry);
          existingKeys.add(key);
        }
      }
    }

    if (newEntries.length > 0) {
      if (onSaveMultipleEntries) {
        onSaveMultipleEntries(newEntries);
      } else {
        for (const entry of newEntries) {
          onSaveEntry(entry);
        }
      }
      setToastMessage(`Added ${newEntries.length} meals to your weekly plan`);
      setTimeout(() => setToastMessage(null), 3500);
    }
  };

  const handleSaveCurrentAsMenu = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!menuNameInput.trim()) return;

    const items: SavedMenuItem[] = [];
    for (const entry of currentWeekEntries) {
      const entryDate = new Date(entry.date + "T00:00:00");
      const diffDays = Math.round((entryDate.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        items.push({
          dayOffset: diffDays,
          slot: entry.slot,
          recipeId: entry.recipeId,
          freeText: entry.freeText,
          multiplier: entry.multiplier
        });
      }
    }

    const menu: SavedMenu = {
      id: `menu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: menuNameInput.trim(),
      createdAt: new Date().toISOString(),
      items
    };

    onSaveMenu?.(menu);
    setShowSaveMenuModal(false);
    setMenuNameInput("");
    setToastMessage(`Saved menu "${menu.name}"`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleApplyMenu = (menu: SavedMenu): void => {
    const newEntries: MealPlanEntry[] = [];
    for (const item of menu.items) {
      const targetDate = new Date(currentWeekStart);
      targetDate.setDate(targetDate.getDate() + item.dayOffset);
      const dateStr = targetDate.toISOString().split("T")[0];

      newEntries.push({
        id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: dateStr,
        slot: item.slot,
        recipeId: item.recipeId,
        freeText: item.freeText,
        multiplier: item.multiplier
      });
    }

    if (onSaveMultipleEntries) {
      onSaveMultipleEntries(newEntries);
    } else {
      for (const entry of newEntries) {
        onSaveEntry(entry);
      }
    }

    setShowMenusModal(false);
    setToastMessage(`Applied menu "${menu.name}" to this week`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--space-6)" }}>
      {/* Toast Feedback */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            background: "var(--text)",
            color: "var(--bg)",
            padding: "10px 18px",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-lg)",
            fontSize: "0.9rem",
            fontWeight: 500,
            zIndex: 1500
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header and View Mode Switcher */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-6)", gap: "var(--space-3)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginBottom: "6px" }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "2.25rem", margin: 0 }}>
              Meal Planner
            </h1>
            {/* View Mode Toggle */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface-alt)",
                borderRadius: "var(--radius-full)",
                padding: "2px",
                border: "1px solid var(--border)"
              }}
            >
              <button
                type="button"
                onClick={(): void => setViewMode("week")}
                style={{
                  background: viewMode === "week" ? "var(--surface)" : "transparent",
                  color: viewMode === "week" ? "var(--text)" : "var(--muted)",
                  border: "none",
                  borderRadius: "var(--radius-full)",
                  padding: "4px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: viewMode === "week" ? "var(--shadow-sm)" : "none"
                }}
              >
                Week
              </button>
              <button
                type="button"
                onClick={(): void => setViewMode("month")}
                style={{
                  background: viewMode === "month" ? "var(--surface)" : "transparent",
                  color: viewMode === "month" ? "var(--text)" : "var(--muted)",
                  border: "none",
                  borderRadius: "var(--radius-full)",
                  padding: "4px 14px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: viewMode === "month" ? "var(--shadow-sm)" : "none"
                }}
              >
                Month
              </button>
            </div>
          </div>

          {/* Time Navigation Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            {viewMode === "week" ? (
              <>
                <button
                  type="button"
                  onClick={(): void => changeWeek(-1)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "0.85rem"
                  }}
                >
                  &larr; Prev Week
                </button>
                <span style={{ fontWeight: 600, fontSize: "1rem", margin: "0 4px" }}>
                  {weekDays[0].label} to {weekDays[6].label}
                </span>
                <button
                  type="button"
                  onClick={(): void => changeWeek(1)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "0.85rem"
                  }}
                >
                  Next Week &rarr;
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(): void => changeMonth(-1)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "0.85rem"
                  }}
                >
                  &larr; Prev Month
                </button>
                <span style={{ fontWeight: 600, fontSize: "1rem", margin: "0 4px" }}>
                  {formatMonthYearHeader(currentMonthYear.year, currentMonthYear.month)}
                </span>
                <button
                  type="button"
                  onClick={(): void => changeMonth(1)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-full)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: "0.85rem"
                  }}
                >
                  Next Month &rarr;
                </button>
              </>
            )}

            <button
              type="button"
              onClick={jumpToToday}
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                padding: "6px 12px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Today
            </button>

            <input
              type="date"
              value={currentWeekStart.toISOString().split("T")[0]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                if (e.target.value) {
                  jumpToSpecificDate(e.target.value);
                }
              }}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
                color: "var(--text)",
                cursor: "pointer"
              }}
              title="Jump to date"
              aria-label="Jump to specific date"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", alignItems: "center" }}>
          <button
            type="button"
            onClick={(): void => setShowRecipeTray(!showRecipeTray)}
            style={{
              background: showRecipeTray ? "var(--surface-alt)" : "var(--surface)",
              color: showRecipeTray ? "var(--accent)" : "var(--text)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.88rem",
              fontWeight: 500,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            title="Toggle Recipe Tray for drag and drop"
          >
            <BookOpenIcon width={16} height={16} /> Recipe Tray
          </button>

          <button
            type="button"
            onClick={(): void => setShowSlotsModal(true)}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.88rem",
              cursor: "pointer"
            }}
            title="Configure breakfast, lunch, dinner, snack, and custom slots"
          >
            Slots ({slots.length})
          </button>

          {recipes.length > 0 && (
            <button
              type="button"
              onClick={handleSuggestPlan}
              style={{
                background: "var(--surface)",
                color: "var(--accent)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
              title="Auto-fill empty slots using favorite and top-rated recipes"
            >
              Suggest a Plan
            </button>
          )}

          {currentWeekEntries.length > 0 && (
            <button
              type="button"
              onClick={(): void => setShowSaveMenuModal(true)}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
              title="Save this week as a reusable Menu"
            >
              Save as Menu
            </button>
          )}

          {savedMenus.length > 0 && (
            <button
              type="button"
              onClick={(): void => setShowMenusModal(true)}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
            >
              Menus ({savedMenus.length})
            </button>
          )}

          <button
            type="button"
            onClick={(): void => onAddMealsToShoppingList(currentWeekEntries)}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "10px 18px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            <ShoppingCartIcon width={16} height={16} /> Add Week to Shopping List
          </button>
        </div>
      </div>

      {/* Main Grid & Recipe Tray Container */}
      <div className="planner-main-container">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Week Grid Mode */}
          {viewMode === "week" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, minmax(130px, 1fr))",
                gap: "var(--space-3)",
                overflowX: "auto",
                paddingBottom: "var(--space-4)"
              }}
            >
              {weekDays.map((day) => {
                const dayEntries = currentWeekEntries.filter((e) => e.date === day.dateStr);

                return (
                  <div
                    key={day.dateStr}
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: "450px",
                      overflow: "hidden"
                    }}
                  >
                    {/* Day Header */}
                    <div
                      style={{
                        background: "var(--surface-alt)",
                        padding: "var(--space-3)",
                        textAlign: "center",
                        borderBottom: "1px solid var(--border)"
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{day.dayName}</div>
                      <div style={{ fontSize: "0.82rem", color: "var(--muted)" }}>{day.label}</div>
                    </div>

                    {/* Slots */}
                    <div style={{ padding: "var(--space-2)", display: "flex", flexDirection: "column", gap: "var(--space-3)", flex: 1 }}>
                      {slots.map((slotName) => {
                        const slotEntries = dayEntries.filter((e) => e.slot === slotName);
                        const targetKey = `${day.dateStr}:${slotName}`;
                        const isDragOver = dragOverTarget === targetKey;

                        return (
                          <div
                            key={slotName}
                            onDragOver={(e: DragEvent): void => handleSlotDragOver(e, targetKey)}
                            onDragLeave={(): void => handleSlotDragLeave(targetKey)}
                            onDrop={(e: DragEvent): void => handleSlotDrop(e, day.dateStr, slotName)}
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              padding: "4px",
                              borderRadius: "var(--radius-sm)",
                              background: isDragOver ? "var(--surface-alt)" : "transparent",
                              border: isDragOver ? "1px dashed var(--accent)" : "1px solid transparent",
                              transition: "background 0.15s ease, border 0.15s ease"
                            }}
                          >
                            <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600 }}>
                              {slotName}
                            </div>

                            {slotEntries.map((entry) => {
                              const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : undefined;
                              const title = recipe ? recipe.title : entry.freeText || "Custom Meal";

                              return (
                                <div
                                  key={entry.id}
                                  draggable={true}
                                  onDragStart={(e: DragEvent): void => handleDragStartEntry(e, entry.id)}
                                  style={{
                                    background: "var(--surface-alt)",
                                    padding: "6px 8px",
                                    borderRadius: "var(--radius-sm)",
                                    fontSize: "0.85rem",
                                    position: "relative",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    cursor: "grab"
                                  }}
                                  title="Drag to move meal"
                                >
                                  <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {title} {entry.multiplier !== 1 && `(${entry.multiplier}×)`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(): void => {
                                      if (window.confirm("Remove this meal from the plan?")) onDeleteEntry(entry.id);
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--danger)",
                                      cursor: "pointer",
                                      padding: "2px"
                                    }}
                                    title="Delete meal"
                                    aria-label="Delete meal"
                                  >
                                    <TrashIcon width={14} height={14} />
                                  </button>
                                </div>
                              );
                            })}

                            <button
                              type="button"
                              onClick={(): void => handleOpenAddModal(day.dateStr, slotName)}
                              style={{
                                background: "none",
                                border: "1px dashed var(--border)",
                                borderRadius: "var(--radius-sm)",
                                padding: "4px",
                                fontSize: "0.75rem",
                                color: "var(--muted)",
                                cursor: "pointer",
                                textAlign: "center"
                              }}
                            >
                              + Add {slotName}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

      {/* Month Grid Mode */}
      {viewMode === "month" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {/* Day of Week Headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "var(--space-2)",
              textAlign: "center",
              fontWeight: 700,
              fontSize: "0.85rem",
              color: "var(--muted)",
              paddingBottom: "var(--space-1)"
            }}
          >
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div>Sun</div>
          </div>

          {/* Month Days Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "var(--space-2)"
            }}
          >
            {monthGridDays.map((calDay) => {
              const dayEntries = entries.filter((e) => e.date === calDay.dateStr);

              return (
                <div
                  key={calDay.dateStr}
                  onDragOver={(e: DragEvent): void => handleSlotDragOver(e, calDay.dateStr)}
                  onDragLeave={(): void => handleSlotDragLeave(calDay.dateStr)}
                  onDrop={(e: DragEvent): void => handleSlotDrop(e, calDay.dateStr, slots[0] || "Dinner")}
                  style={{
                    background: dragOverTarget === calDay.dateStr ? "var(--surface-alt)" : calDay.isCurrentMonth ? "var(--surface)" : "var(--surface-alt)",
                    border: dragOverTarget === calDay.dateStr ? "2px dashed var(--accent)" : calDay.isToday ? "2px solid var(--accent)" : "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    minHeight: "110px",
                    padding: "var(--space-2)",
                    display: "flex",
                    flexDirection: "column",
                    opacity: calDay.isCurrentMonth ? 1 : 0.45,
                    boxShadow: "var(--shadow-sm)",
                    transition: "border 0.15s ease, background 0.15s ease"
                  }}
                >
                  {/* Cell Header with Day Number and Quick Add Button */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px"
                    }}
                  >
                    <span
                      style={{
                        fontWeight: calDay.isToday ? 800 : 600,
                        fontSize: "0.85rem",
                        color: calDay.isToday ? "var(--accent)" : "var(--text)"
                      }}
                    >
                      {calDay.dayNumber}
                    </span>
                    <button
                      type="button"
                      onClick={(): void => handleOpenAddModal(calDay.dateStr, slots[0] || "Dinner")}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        padding: "2px 4px",
                        fontSize: "0.85rem",
                        borderRadius: "var(--radius-sm)"
                      }}
                      title={`Add meal on ${calDay.dateStr}`}
                    >
                      +
                    </button>
                  </div>

                  {/* Planned meals pills */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto", flex: 1 }}>
                    {dayEntries.map((entry) => {
                      const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : undefined;
                      const title = recipe ? recipe.title : entry.freeText || "Custom Meal";
                      const badgeStyle = getSlotBadgeStyle(entry.slot);

                      return (
                        <div
                          key={entry.id}
                          draggable={true}
                          onDragStart={(e: DragEvent): void => handleDragStartEntry(e, entry.id)}
                          style={{
                            background: badgeStyle.bg,
                            border: badgeStyle.border,
                            borderRadius: "var(--radius-sm)",
                            padding: "2px 4px",
                            fontSize: "0.75rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "grab"
                          }}
                        >
                          <span
                            style={{
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              color: badgeStyle.color,
                              fontWeight: 600
                            }}
                            title={`${entry.slot}: ${title}`}
                          >
                            <span style={{ opacity: 0.8, marginRight: "3px" }}>
                              {entry.slot.charAt(0)}:
                            </span>
                            {title}
                          </span>
                          <button
                            type="button"
                            onClick={(): void => {
                              if (window.confirm("Remove this meal from the plan?")) onDeleteEntry(entry.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "var(--danger)",
                              cursor: "pointer",
                              padding: "0 2px",
                              fontSize: "0.75rem",
                              lineHeight: 1
                            }}
                            title="Remove meal"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
        </div>

        {/* Recipe Tray Sidebar */}
        {showRecipeTray && (
          <aside
            style={{
              width: "280px",
              flexShrink: 0,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
              maxHeight: "750px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1rem", margin: 0, fontFamily: "var(--font-serif)" }}>
                Recipe Tray
              </h3>
              <button
                type="button"
                onClick={(): void => setShowRecipeTray(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
                aria-label="Close recipe tray"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </div>

            <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: 0 }}>
              Drag any recipe onto a calendar slot to schedule it.
            </p>

            <div style={{ position: "relative" }}>
              <input
                type="search"
                value={traySearchQuery}
                onChange={(e): void => setTraySearchQuery(e.target.value)}
                placeholder="Search recipes..."
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 28px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  fontSize: "0.85rem"
                }}
              />
              <span style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
                <SearchIcon width={14} height={14} />
              </span>
            </div>

            <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
              {filteredTrayRecipes.map((r: Recipe) => (
                <div
                  key={r.id}
                  draggable={true}
                  onDragStart={(e: DragEvent): void => handleDragStartRecipe(e, r.id)}
                  style={{
                    background: "var(--surface-alt)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "8px 10px",
                    cursor: "grab",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  title="Drag onto calendar slot"
                >
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: "6px" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title}
                    </div>
                    {r.courses[0] && (
                      <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                        {r.courses[0]}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", userSelect: "none" }}>
                    :::
                  </span>
                </div>
              ))}

              {filteredTrayRecipes.length === 0 && (
                <div style={{ padding: "var(--space-4) var(--space-2)", fontSize: "0.82rem", color: "var(--muted)", textAlign: "center" }}>
                  No matching recipes.
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Add Meal Modal */}
      {modalDate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100
          }}
        >
          <div style={{ background: "var(--surface)", padding: "var(--space-6)", borderRadius: "var(--radius-md)", width: "90%", maxWidth: "450px" }}>
            <h3 style={{ marginBottom: "var(--space-3)", fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>
              Add Meal ({modalDate})
            </h3>
            <form onSubmit={handleSaveModalEntry} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Meal Slot
                </label>
                <select
                  value={modalSlot}
                  onChange={(e): void => setModalSlot(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                >
                  {slots.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {recipes.length > 0 && (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                    Select from Recipes
                  </label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => {
                      setSelectedRecipeId(e.target.value);
                      if (e.target.value) setFreeTextMeal("");
                    }}
                    style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--surface)" }}
                  >
                    <option value="">-- Or enter custom dish below --</option>
                    {recipes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Custom Meal / Restaurant / Leftovers
                </label>
                <input
                  type="text"
                  value={freeTextMeal}
                  onChange={(e) => {
                    setFreeTextMeal(e.target.value);
                    if (e.target.value) setSelectedRecipeId("");
                  }}
                  placeholder="e.g. Leftover Chili, Pizza Night..."
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Scale Multiplier
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={multiplier}
                  onChange={(e) => setMultiplier(parseFloat(e.target.value) || 1)}
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={() => setModalDate(null)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "8px 18px", borderRadius: "var(--radius-full)", cursor: "pointer", fontWeight: 600 }}
                >
                  Save to Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save Menu Modal */}
      {showSaveMenuModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", marginBottom: "var(--space-2)" }}>
              Save Week as Reusable Menu
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--muted)", marginBottom: "var(--space-4)" }}>
              Save this week's {currentWeekEntries.length} meals as a template you can apply to future weeks.
            </p>
            <form onSubmit={handleSaveCurrentAsMenu}>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                  Menu Name
                </label>
                <input
                  type="text"
                  required
                  value={menuNameInput}
                  onChange={(e) => setMenuNameInput(e.target.value)}
                  placeholder="e.g. Quick Weeknights"
                  style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={() => setShowSaveMenuModal(false)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: "var(--accent)", color: "var(--accent-contrast)", border: "none", padding: "8px 18px", borderRadius: "var(--radius-full)", cursor: "pointer", fontWeight: 600 }}
                >
                  Save Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menus List Modal */}
      {showMenusModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)",
              maxWidth: "500px",
              width: "100%",
              boxShadow: "var(--shadow-lg)",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem" }}>
                Saved Menus ({savedMenus.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowMenusModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>

            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: "var(--space-3)", flex: 1 }}>
              {savedMenus.map((menu) => (
                <div
                  key={menu.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "var(--space-3)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{menu.name}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                      {menu.items.length} planned meals
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => handleApplyMenu(menu)}
                      style={{
                        background: "var(--accent)",
                        color: "var(--accent-contrast)",
                        border: "none",
                        padding: "6px 14px",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      Apply
                    </button>
                    {onDeleteMenu && (
                      <button
                        type="button"
                        onClick={(): void => {
                          if (window.confirm(`Delete saved menu "${menu.name}"?`)) onDeleteMenu(menu.id);
                        }}
                        style={{
                          background: "none",
                          border: "1px solid var(--border)",
                          color: "var(--danger)",
                          padding: "6px 10px",
                          borderRadius: "var(--radius-full)",
                          cursor: "pointer"
                        }}
                        title="Delete menu"
                      >
                        <TrashIcon width={14} height={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Slots Modal */}
      {showSlotsModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "var(--space-4)"
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-6)",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-4)" }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.3rem", margin: 0 }}>
                Manage Meal Slots
              </h3>
              <button
                type="button"
                onClick={(): void => setShowSlotsModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)" }}
                aria-label="Close"
              >
                <CloseIcon width={18} height={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginBottom: "var(--space-4)", maxHeight: "200px", overflowY: "auto" }}>
              {slots.map((slotName) => (
                <div
                  key={slotName}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--surface-alt)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)"
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{slotName}</span>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={(): void => handleDeleteSlot(slotName)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        padding: "2px"
                      }}
                      title="Remove slot"
                    >
                      <TrashIcon width={14} height={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleAddSlot} style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
              <input
                type="text"
                required
                value={newSlotInput}
                onChange={(e): void => setNewSlotInput(e.target.value)}
                placeholder="New slot (e.g. Dessert, Supper)"
                style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}
              />
              <button
                type="submit"
                style={{
                  background: "var(--accent)",
                  color: "var(--accent-contrast)",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                + Add
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleResetSlots}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--muted)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Reset to Defaults
              </button>
              <button
                type="button"
                onClick={(): void => setShowSlotsModal(false)}
                style={{
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-full)",
                  padding: "6px 14px",
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
