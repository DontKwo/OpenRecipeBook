import {
  useState,
  useMemo,
  useRef,
  useEffect,
  type FC,
  type ReactElement,
  type ChangeEvent,
  type FormEvent,
  type DragEvent
} from "react";
import type { MealPlanEntry, Recipe, SavedMenu, SavedMenuItem } from "../../domain/recipe/types";
import {
  generateMonthGrid,
  formatMonthYearHeader,
  type CalendarGridDay
} from "../../domain/planner/calendarGrid";
import {
  calculateWeekMonday,
  createMealPlanEntry,
  filterEntriesForWeek,
  matchesSlotCategory
} from "../../domain/planner/plannerService";
import { resolvePhotoUrl } from "../../domain/recipe/photoPipeline";
import {
  ChevronLeft,
  ChevronRight,
  PlusIcon,
  TrashIcon,
  ShoppingCartIcon,
  CalendarIcon,
  MoreIcon,
  BookOpenIcon,
  BookmarkIcon,
  CopyIcon,
  ChefHatIcon,
  ClockIcon,
  StarIcon
} from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Menu } from "../../ui/Menu";
import { Dialog } from "../../ui/Dialog";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { RecipePicker } from "../../ui/RecipePicker";
import { useToast } from "../../ui/Toast";
import styles from "./MealPlannerView.module.css";

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
  const { showToast } = useToast();

  // View mode switcher: week vs month
  const [viewMode, setViewMode] = useState<"week" | "month">("week");

  // Custom slots state
  const [slots, setSlots] = useState<string[]>(DEFAULT_SLOTS);
  const [showSlotsModal, setShowSlotsModal] = useState<boolean>(false);
  const [newSlotInput, setNewSlotInput] = useState<string>("");
  const [deletingSlotName, setDeletingSlotName] = useState<string | null>(null);

  // Current week start (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>((): Date => {
    return calculateWeekMonday(new Date());
  });

  // Current month view year and month (0-indexed)
  const [currentMonthYear, setCurrentMonthYear] = useState<{ year: number; month: number }>(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  // Add meal modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [modalDate, setModalDate] = useState<string>("");
  const [modalSlot, setModalSlot] = useState<string>("Dinner");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [customDishText, setCustomDishText] = useState<string>("");
  const [modalMultiplier, setModalMultiplier] = useState<number>(1);

  // Meal detail / move modal state
  const [activeMealEntry, setActiveMealEntry] = useState<MealPlanEntry | null>(null);
  const [moveDate, setMoveDate] = useState<string>("");
  const [moveSlot, setMoveSlot] = useState<string>("Dinner");

  // Saved Menus modal state
  const [showMenusModal, setShowMenusModal] = useState<boolean>(false);
  const [showSaveWeekModal, setShowSaveWeekModal] = useState<boolean>(false);
  const [newMenuName, setNewMenuName] = useState<string>("");
  const [deletingMenu, setDeletingMenu] = useState<SavedMenu | null>(null);

  // Drag and Drop & horizontal edge auto-scroll state
  const weekGridWrapperRef = useRef<HTMLDivElement | null>(null);
  const [draggedMealId, setDraggedMealId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; slot: string } | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const dragMouseXRef = useRef<number | null>(null);

  const stopAutoScroll = (): void => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    dragMouseXRef.current = null;
  };

  const startAutoScroll = (): void => {
    if (autoScrollRafRef.current !== null) return;

    const tick = (): void => {
      const wrapper = weekGridWrapperRef.current;
      const mouseX = dragMouseXRef.current;
      if (wrapper && mouseX !== null) {
        const rect = wrapper.getBoundingClientRect();
        const threshold = 120;

        if (mouseX > rect.right - threshold) {
          const dist = Math.min(threshold, mouseX - (rect.right - threshold));
          const speed = Math.max(5, Math.round((dist / threshold) * 24));
          wrapper.scrollLeft += speed;
        } else if (mouseX < rect.left + threshold) {
          const dist = Math.min(threshold, (rect.left + threshold) - mouseX);
          const speed = Math.max(5, Math.round((dist / threshold) * 24));
          wrapper.scrollLeft -= speed;
        }
      }
      autoScrollRafRef.current = requestAnimationFrame(tick);
    };

    autoScrollRafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return (): void => {
      stopAutoScroll();
    };
  }, []);

  // Recipe lookup map
  const recipeMap = useMemo((): Map<string, Recipe> => {
    return new Map<string, Recipe>(recipes.map((r: Recipe): [string, Recipe] => [r.id, r]));
  }, [recipes]);

  // Current week entries
  const currentWeekEntries = useMemo((): MealPlanEntry[] => {
    return filterEntriesForWeek(entries, currentWeekStart);
  }, [entries, currentWeekStart]);

  // 7 days of current week
  const weekDays = useMemo(() => {
    const days: { dateStr: string; label: string; dayName: string; isToday: boolean; dateNumber: number }[] = [];
    const todayStr = new Date().toISOString().split("T")[0];
    for (let index = 0; index < 7; index += 1) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + index);
      const dateStr = d.toISOString().split("T")[0];
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ dateStr, label, dayName, isToday: dateStr === todayStr, dateNumber: d.getDate() });
    }
    return days;
  }, [currentWeekStart]);

  // Month grid
  const monthGridDays = useMemo((): CalendarGridDay[] => {
    return generateMonthGrid(currentMonthYear.year, currentMonthYear.month);
  }, [currentMonthYear]);

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

  const handleOpenAddModal = (dateStr: string, slot: string): void => {
    setModalDate(dateStr);
    setModalSlot(slot);
    setSelectedRecipe(null);
    setCustomDishText("");
    setModalMultiplier(1);
    setShowAddModal(true);
  };

  const handleSaveAddModal = (): void => {
    if (!modalDate) return;
    const title = selectedRecipe ? selectedRecipe.title : customDishText.trim();
    if (!title) return;

    const newEntry = createMealPlanEntry(
      modalDate,
      modalSlot,
      selectedRecipe ? selectedRecipe.id : undefined,
      selectedRecipe ? undefined : customDishText.trim(),
      modalMultiplier
    );

    onSaveEntry(newEntry);
    setShowAddModal(false);
    showToast(`Added "${title}" to ${modalSlot}`);
  };

  const handleOpenMealDetail = (entry: MealPlanEntry): void => {
    setActiveMealEntry(entry);
    setMoveDate(entry.date);
    setMoveSlot(entry.slot);
  };

  const handleDeleteMeal = (entry: MealPlanEntry): void => {
    const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : undefined;
    const title = recipe ? recipe.title : entry.freeText || "Meal";
    onDeleteEntry(entry.id);
    setActiveMealEntry(null);
    showToast({
      message: `Removed "${title}" from plan`,
      undo: (): void => onSaveEntry(entry),
      undoLabel: "Undo"
    });
  };

  const handleMoveMeal = (): void => {
    if (!activeMealEntry) return;
    const updated: MealPlanEntry = {
      ...activeMealEntry,
      date: moveDate,
      slot: moveSlot
    };
    onSaveEntry(updated);
    setActiveMealEntry(null);
    showToast(`Moved meal to ${moveSlot}`);
  };

  const handleDuplicateMeal = (): void => {
    if (!activeMealEntry) return;
    const duplicate: MealPlanEntry = {
      ...activeMealEntry,
      id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: moveDate,
      slot: moveSlot
    };
    onSaveEntry(duplicate);
    setActiveMealEntry(null);
    showToast(`Duplicated meal to ${moveSlot}`);
  };

  const renderSlotIcon = (slotName: string): ReactElement => {
    const norm = slotName.toLowerCase();
    if (norm.includes("breakfast") || norm.includes("brunch")) {
      return <BookOpenIcon width={13} height={13} />;
    }
    if (norm.includes("lunch")) {
      return <ClockIcon width={13} height={13} />;
    }
    if (norm.includes("dinner") || norm.includes("supper")) {
      return <ChefHatIcon width={13} height={13} />;
    }
    return <StarIcon width={13} height={13} />;
  };

  const handleSuggestPlan = (): void => {
    if (recipes.length === 0) {
      showToast("No recipes available to plan");
      return;
    }

    const existingKeys = new Set(
      currentWeekEntries.map((e: MealPlanEntry): string => `${e.date}__${e.slot}`)
    );
    const usedRecipeIds = new Set(
      currentWeekEntries.map((e: MealPlanEntry): string | undefined => e.recipeId).filter(Boolean)
    );
    const newEntries: MealPlanEntry[] = [];
    const unfilledSlots: string[] = [];

    for (const day of weekDays) {
      for (const slot of slots) {
        const key = `${day.dateStr}__${slot}`;
        if (existingKeys.has(key)) continue;

        const matchingRecipes = recipes.filter((r: Recipe): boolean => matchesSlotCategory(r, slot));
        if (matchingRecipes.length === 0) {
          if (!unfilledSlots.includes(slot)) {
            unfilledSlots.push(slot);
          }
          continue;
        }

        let candidatePool = matchingRecipes.filter((r: Recipe): boolean => !usedRecipeIds.has(r.id));
        if (candidatePool.length === 0) {
          candidatePool = [...matchingRecipes];
        }

        candidatePool.sort((a: Recipe, b: Recipe): number => {
          const scoreA = (a.favorite ? 10 : 0) + (a.rating || 0);
          const scoreB = (b.favorite ? 10 : 0) + (b.rating || 0);
          return scoreB - scoreA;
        });

        const picked = candidatePool[0];
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
      if (unfilledSlots.length > 0) {
        showToast(
          `Suggested ${newEntries.length} tagged meals. (Tag recipes with ${unfilledSlots.join(", ")} to fill open slots)`
        );
      } else {
        showToast(`Suggested full plan with ${newEntries.length} tag-matched meals`);
      }
    } else {
      if (unfilledSlots.length > 0) {
        showToast(`Could not suggest plan: no recipes tagged for ${unfilledSlots.join(", ")}`);
      } else {
        showToast("All slots for this week are already filled");
      }
    }
  };

  const handleCopyPreviousWeek = (): void => {
    const prevWeekMonday = new Date(currentWeekStart);
    prevWeekMonday.setDate(prevWeekMonday.getDate() - 7);
    const prevWeekEntries = filterEntriesForWeek(entries, prevWeekMonday);

    if (prevWeekEntries.length === 0) {
      showToast("No meals found in the previous week to copy");
      return;
    }

    const newEntries: MealPlanEntry[] = prevWeekEntries.map((oldEntry: MealPlanEntry): MealPlanEntry => {
      const oldDate = new Date(`${oldEntry.date}T00:00:00`);
      const newDate = new Date(oldDate);
      newDate.setDate(newDate.getDate() + 7);
      const newDateStr = newDate.toISOString().split("T")[0];

      return {
        ...oldEntry,
        id: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        date: newDateStr
      };
    });

    if (onSaveMultipleEntries) {
      onSaveMultipleEntries(newEntries);
    } else {
      for (const entry of newEntries) {
        onSaveEntry(entry);
      }
    }
    showToast(`Copied ${newEntries.length} meals from previous week`);
  };

  const handleDragOverWrapper = (e: DragEvent<HTMLDivElement>): void => {
    dragMouseXRef.current = e.clientX;
    startAutoScroll();
  };

  const handleDropMeal = (draggedId: string | null, targetDate: string, targetSlot: string): void => {
    stopAutoScroll();
    const idToMove = draggedId || draggedMealId;
    if (!idToMove) {
      setDraggedMealId(null);
      setDropTarget(null);
      return;
    }

    const entry = entries.find((e: MealPlanEntry): boolean => e.id === idToMove);
    if (!entry) {
      setDraggedMealId(null);
      setDropTarget(null);
      return;
    }

    if (entry.date === targetDate && entry.slot === targetSlot) {
      setDraggedMealId(null);
      setDropTarget(null);
      return;
    }

    const updated: MealPlanEntry = {
      ...entry,
      date: targetDate,
      slot: targetSlot
    };
    onSaveEntry(updated);
    setDraggedMealId(null);
    setDropTarget(null);

    const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : undefined;
    const title = recipe ? recipe.title : entry.freeText || "Meal";
    showToast(`Moved "${title}" to ${targetSlot}`);
  };

  const handleOpenSaveWeekModal = (): void => {
    const rangeLabel = `${weekDays[0].label} - ${weekDays[6].label}`;
    setNewMenuName(`Week of ${rangeLabel}`);
    setShowSaveWeekModal(true);
  };

  const handleSaveWeekAsMenu = (e: FormEvent): void => {
    e.preventDefault();
    const name = newMenuName.trim();
    if (!name || currentWeekEntries.length === 0) return;

    const items: SavedMenuItem[] = [];
    for (const entry of currentWeekEntries) {
      const entryDate = new Date(`${entry.date}T00:00:00`);
      const diffDays = Math.round(
        (entryDate.getTime() - currentWeekStart.getTime()) / (1000 * 60 * 60 * 24)
      );
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
      name,
      createdAt: new Date().toISOString(),
      items
    };

    onSaveMenu?.(menu);
    setNewMenuName("");
    setShowSaveWeekModal(false);
    showToast(`Saved week meal plan "${name}"`);
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
    showToast(`Applied menu "${menu.name}" to this week`);
  };

  const handleAddSlot = (e: FormEvent): void => {
    e.preventDefault();
    const trimmed = newSlotInput.trim();
    if (!trimmed || slots.includes(trimmed)) return;
    setSlots((prev: string[]): string[] => [...prev, trimmed]);
    setNewSlotInput("");
  };

  const handleConfirmDeleteSlot = (): void => {
    if (!deletingSlotName || slots.length <= 1) return;
    setSlots((prev: string[]): string[] => prev.filter((s: string): boolean => s !== deletingSlotName));
    setDeletingSlotName(null);
  };

  return (
    <div className={styles.container}>
      {/* Planner Header Toolbar */}
      <div className={styles.header}>
        <div className={styles.headerRowDesktop}>
          {/* Nav Group */}
          <div className={styles.navGroup}>
            <IconButton
              variant="secondary"
              size="sm"
              icon={<ChevronLeft width={18} height={18} />}
              aria-label={viewMode === "week" ? "Previous week" : "Previous month"}
              onClick={(): void => (viewMode === "week" ? changeWeek(-1) : changeMonth(-1))}
            />
            <span className={styles.dateRangeText}>
              {viewMode === "week"
                ? `${weekDays[0].label} - ${weekDays[6].label}`
                : formatMonthYearHeader(currentMonthYear.year, currentMonthYear.month)}
            </span>
            <IconButton
              variant="secondary"
              size="sm"
              icon={<ChevronRight width={18} height={18} />}
              aria-label={viewMode === "week" ? "Next week" : "Next month"}
              onClick={(): void => (viewMode === "week" ? changeWeek(1) : changeMonth(1))}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={jumpToToday}
            >
              Today
            </Button>
          </div>

          {/* Action Group */}
          <div className={styles.actionGroup}>
            <SegmentedControl
              options={[
                { value: "week", label: "Week" },
                { value: "month", label: "Month" }
              ]}
              value={viewMode}
              onChange={(val: string): void => setViewMode(val as "week" | "month")}
              size="sm"
            />

            <Button
              variant="primary"
              size="sm"
              icon={<ShoppingCartIcon width={16} height={16} />}
              onClick={(): void => {
                onAddMealsToShoppingList(currentWeekEntries);
                showToast(`Added ${currentWeekEntries.length} meals to shopping list`);
              }}
              disabled={currentWeekEntries.length === 0}
            >
              Add to Shopping
            </Button>

            {viewMode === "week" && (
              <Button
                variant="secondary"
                size="sm"
                icon={<BookmarkIcon width={16} height={16} />}
                onClick={handleOpenSaveWeekModal}
                disabled={currentWeekEntries.length === 0}
                title={
                  currentWeekEntries.length === 0
                    ? "Add meals to this week before saving"
                    : "Save this week as a reusable meal plan"
                }
              >
                Save Week
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              icon={<BookOpenIcon width={16} height={16} />}
              onClick={(): void => setShowMenusModal(true)}
              title="View, restore, or manage saved weekly meal plans"
            >
              Saved Plans{savedMenus.length > 0 ? ` (${savedMenus.length})` : ""}
            </Button>

            <Menu
              trigger={
                <IconButton
                  variant="ghost"
                  size="md"
                  icon={<MoreIcon width={18} height={18} />}
                  aria-label="Meal planner options"
                />
              }
              items={[
                {
                  id: "save-week",
                  icon: <BookmarkIcon width={16} height={16} />,
                  label: "Save Current Week Plan",
                  onClick: handleOpenSaveWeekModal,
                  disabled: currentWeekEntries.length === 0
                },
                {
                  id: "suggest",
                  icon: <CalendarIcon width={16} height={16} />,
                  label: "Suggest a Plan",
                  onClick: handleSuggestPlan,
                  disabled: recipes.length === 0
                },
                {
                  id: "copy-prev",
                  icon: <CopyIcon width={16} height={16} />,
                  label: "Copy Previous Week",
                  onClick: handleCopyPreviousWeek
                },
                {
                  id: "menus",
                  icon: <BookOpenIcon width={16} height={16} />,
                  label: `Saved Meal Plans (${savedMenus.length})`,
                  onClick: (): void => setShowMenusModal(true)
                },
                {
                  id: "slots",
                  icon: <PlusIcon width={16} height={16} />,
                  label: `Meal Slots (${slots.length})`,
                  onClick: (): void => setShowSlotsModal(true)
                }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Week Grid Mode */}
      {viewMode === "week" && (
        <div
          ref={weekGridWrapperRef}
          className={styles.weekGridWrapper}
          onDragOver={handleDragOverWrapper}
          style={{
            scrollSnapType: draggedMealId ? "none" : undefined
          }}
        >
          <div className={styles.weekGrid}>
            {weekDays.map((day) => {
              const dayEntries = currentWeekEntries.filter((e: MealPlanEntry): boolean => e.date === day.dateStr);

              return (
                <div key={day.dateStr} className={styles.dayColumn}>
                  {/* Day Header */}
                  <div className={`${styles.dayHeader} ${day.isToday ? styles.todayHeader : ""}`}>
                    <span className={styles.dayName}>{day.dayName}</span>
                    <div className={`${styles.dateBadge} ${day.isToday ? styles.dateBadgeToday : ""}`}>
                      {day.dateNumber}
                    </div>
                  </div>

                  {/* Day Slots */}
                  <div className={styles.daySlots}>
                    {slots.map((slotName: string): ReactElement => {
                      const slotEntries = dayEntries.filter((e: MealPlanEntry): boolean => e.slot === slotName);
                      const isDropActive = dropTarget?.date === day.dateStr && dropTarget?.slot === slotName;

                      return (
                        <div
                          key={slotName}
                          className={`${styles.slotBox} ${isDropActive ? styles.slotBoxDropTarget : ""}`}
                          onDragOver={(e): void => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            handleDragOverWrapper(e);
                          }}
                          onDragEnter={(e): void => {
                            e.preventDefault();
                            setDropTarget({ date: day.dateStr, slot: slotName });
                          }}
                          onDragLeave={(e): void => {
                            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                            if (dropTarget?.date === day.dateStr && dropTarget?.slot === slotName) {
                              setDropTarget(null);
                            }
                          }}
                          onDrop={(e): void => {
                            e.preventDefault();
                            const mealId =
                              e.dataTransfer.getData("application/x-openrecipebook-meal") ||
                              e.dataTransfer.getData("text/plain") ||
                              draggedMealId;
                            handleDropMeal(mealId, day.dateStr, slotName);
                          }}
                        >
                          <div className={styles.slotHeaderRow}>
                            <span className={styles.slotIconBadge}>{renderSlotIcon(slotName)}</span>
                            <span className={styles.slotLabel}>{slotName}</span>
                          </div>

                          {slotEntries.map((entry: MealPlanEntry): ReactElement => {
                            const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : undefined;
                            const title = recipe ? recipe.title : entry.freeText || "Custom Meal";
                            const isDragging = draggedMealId === entry.id;
                            const photoUrl = recipe?.photoIds?.[0]
                              ? resolvePhotoUrl(recipe.photoIds[0])
                              : undefined;

                            return (
                              <div
                                key={entry.id}
                                className={`${styles.mealCard} ${isDragging ? styles.mealCardDragging : ""}`}
                                draggable={true}
                                onDragStart={(e): void => {
                                  e.dataTransfer.setData("application/x-openrecipebook-meal", entry.id);
                                  e.dataTransfer.setData("text/plain", entry.id);
                                  e.dataTransfer.effectAllowed = "move";
                                  setDraggedMealId(entry.id);
                                  dragMouseXRef.current = e.clientX;
                                  startAutoScroll();
                                }}
                                onDragEnd={(): void => {
                                  stopAutoScroll();
                                  setDraggedMealId(null);
                                  setDropTarget(null);
                                }}
                                onClick={(): void => handleOpenMealDetail(entry)}
                                title="Drag to move to another day/slot, or click to edit"
                              >
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt=""
                                    className={styles.mealThumb}
                                    onError={(e): void => {
                                      (e.target as HTMLElement).style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className={styles.mealThumbFallback}>
                                    {renderSlotIcon(slotName)}
                                  </div>
                                )}

                                <div className={styles.mealInfo}>
                                  <div className={styles.mealTitle}>{title}</div>
                                  <div className={styles.mealMeta}>
                                    {entry.multiplier !== 1 && (
                                      <span className={styles.multiplierBadge}>
                                        {entry.multiplier}x
                                      </span>
                                    )}
                                    {recipe?.totalMinutes ? (
                                      <span className={styles.timeBadge}>
                                        {recipe.totalMinutes}m
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <button
                            type="button"
                            className={styles.addSlotBtn}
                            onClick={(): void => handleOpenAddModal(day.dateStr, slotName)}
                            aria-label={`Add meal to ${day.dayName} ${slotName}`}
                          >
                            <PlusIcon width={13} height={13} style={{ marginRight: 4 }} />
                            Add
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

      {/* Month Grid Mode */}
      {viewMode === "month" && (
        <div className={styles.monthGrid}>
          {monthGridDays.map((calDay: CalendarGridDay): ReactElement => {
            const dayEntries = entries.filter((e: MealPlanEntry): boolean => e.date === calDay.dateStr);

            return (
              <div
                key={calDay.dateStr}
                className={`${styles.monthCell} ${calDay.isToday ? styles.monthCellToday : ""}`}
                style={{ opacity: calDay.isCurrentMonth ? 1 : 0.45 }}
                onClick={(): void => {
                  const target = new Date(`${calDay.dateStr}T00:00:00`);
                  setCurrentWeekStart(calculateWeekMonday(target));
                  setViewMode("week");
                }}
              >
                <div className={styles.monthCellHeader}>
                  <span
                    className={`${styles.monthDateBadge} ${calDay.isToday ? styles.monthDateBadgeToday : ""}`}
                  >
                    {calDay.dayNumber}
                  </span>
                  <span style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>
                    {dayEntries.length > 0 ? `${dayEntries.length} meals` : ""}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" }}>
                  {dayEntries.slice(0, 3).map((entry: MealPlanEntry): ReactElement => {
                    const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : undefined;
                    const title = recipe ? recipe.title : entry.freeText || "Meal";
                    return (
                      <span key={entry.id} className={styles.monthMealDot}>
                        {title}
                      </span>
                    );
                  })}
                  {dayEntries.length > 3 && (
                    <span style={{ fontSize: "0.6875rem", color: "var(--muted)" }}>
                      +{dayEntries.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Meal Dialog */}
      {showAddModal && (
        <Dialog
          isOpen
          title={`Add Meal - ${modalDate}`}
          onClose={(): void => setShowAddModal(false)}
          maxWidth={500}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Button
                variant="secondary"
                onClick={(): void => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAddModal}
                disabled={!selectedRecipe && !customDishText.trim()}
              >
                Add to Plan
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                  DATE
                </label>
                <input
                  type="date"
                  value={modalDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setModalDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                  MEAL SLOT
                </label>
                <select
                  value={modalSlot}
                  onChange={(e: ChangeEvent<HTMLSelectElement>): void => setModalSlot(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                >
                  {slots.map((s: string): ReactElement => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                RECIPE OR DISH
              </label>
              {selectedRecipe ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-alt)",
                    border: "1px solid var(--accent)"
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{selectedRecipe.title}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(): void => setSelectedRecipe(null)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <RecipePicker
                  recipes={recipes}
                  placeholder="Search recipe or type custom meal..."
                  onSelectRecipe={(r: Recipe): void => {
                    setSelectedRecipe(r);
                    setCustomDishText("");
                  }}
                  onSelectCustomMeal={(title: string): void => {
                    setCustomDishText(title);
                    setSelectedRecipe(null);
                  }}
                />
              )}
            </div>

            {customDishText && !selectedRecipe && (
              <div>
                <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                  CUSTOM MEAL NAME
                </label>
                <input
                  type="text"
                  value={customDishText}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setCustomDishText(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                SCALE MULTIPLIER
              </label>
              <input
                type="number"
                min="0.25"
                step="0.25"
                value={modalMultiplier}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setModalMultiplier(parseFloat(e.target.value) || 1)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
              />
            </div>
          </div>
        </Dialog>
      )}

      {/* Meal Detail / Move Modal */}
      {activeMealEntry && (
        <Dialog
          isOpen
          title="Meal Options"
          onClose={(): void => setActiveMealEntry(null)}
          maxWidth={440}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8 }}>
              <Button
                variant="danger"
                icon={<TrashIcon width={16} height={16} />}
                onClick={(): void => handleDeleteMeal(activeMealEntry)} // noqa: 81
              >
                Remove
              </Button>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  variant="secondary"
                  icon={<CopyIcon width={16} height={16} />}
                  onClick={handleDuplicateMeal}
                >
                  Duplicate
                </Button>
                <Button
                  variant="primary"
                  onClick={handleMoveMeal}
                >
                  Move
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div style={{ fontWeight: 600, fontSize: "1rem" }}>
              {activeMealEntry.recipeId
                ? recipeMap.get(activeMealEntry.recipeId)?.title
                : activeMealEntry.freeText || "Custom Meal"}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                TARGET DATE
              </label>
              <input
                type="date"
                value={moveDate}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setMoveDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8125rem", fontWeight: 600, color: "var(--muted)", marginBottom: 4 }}>
                TARGET SLOT
              </label>
              <select
                value={moveSlot}
                onChange={(e: ChangeEvent<HTMLSelectElement>): void => setMoveSlot(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
              >
                {slots.map((s: string): ReactElement => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Dialog>
      )}

      {/* Slots Configuration Modal */}
      {showSlotsModal && (
        <Dialog
          isOpen
          title="Meal Slots Configuration"
          onClose={(): void => setShowSlotsModal(false)}
          maxWidth={420}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
              <Button
                variant="ghost"
                onClick={(): void => setSlots(DEFAULT_SLOTS)}
              >
                Reset Defaults
              </Button>
              <Button
                variant="secondary"
                onClick={(): void => setShowSlotsModal(false)}
              >
                Done
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <form onSubmit={handleAddSlot} style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                placeholder="New slot name..."
                value={newSlotInput}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewSlotInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
              />
              <Button
                variant="primary"
                size="sm"
                icon={<PlusIcon width={16} height={16} />}
                disabled={!newSlotInput.trim() || slots.includes(newSlotInput.trim())}
              >
                Add
              </Button>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto" }}>
              {slots.map((slotName: string): ReactElement => (
                <div
                  key={slotName}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--surface-alt)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)"
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{slotName}</span>
                  {slots.length > 1 && (
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<TrashIcon width={16} height={16} />}
                      aria-label={`Delete ${slotName} slot`}
                      onClick={(): void => setDeletingSlotName(slotName)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Slot Confirmation */}
      {deletingSlotName && (
        <ConfirmDialog
          isOpen
          title="Delete Meal Slot"
          message={`Are you sure you want to delete slot "${deletingSlotName}"? Meals in this slot will remain in history.`}
          confirmLabel="Delete"
          isDanger
          onConfirm={handleConfirmDeleteSlot}
          onCancel={(): void => setDeletingSlotName(null)}
        />
      )}

      {/* Save Week Plan Modal */}
      {showSaveWeekModal && (
        <Dialog
          isOpen
          title="Save Week Meal Plan"
          onClose={(): void => setShowSaveWeekModal(false)}
          maxWidth={480}
        >
          <form onSubmit={handleSaveWeekAsMenu} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <p style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
              Save all <strong>{currentWeekEntries.length} meals</strong> from this week ({weekDays[0].label} - {weekDays[6].label}) as a reusable meal plan template. You can restore it to any future week at any time.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label htmlFor="save-week-plan-name" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                Plan Name
              </label>
              <input
                id="save-week-plan-name"
                type="text"
                value={newMenuName}
                onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewMenuName(e.target.value)}
                placeholder="e.g. Week of Nov 18, Quick Weeknights..."
                autoFocus
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: "var(--space-2)" }}>
              <Button
                type="button"
                variant="ghost"
                onClick={(): void => setShowSaveWeekModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={!newMenuName.trim() || currentWeekEntries.length === 0}
              >
                Save Meal Plan
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Saved Menus Modal */}
      {showMenusModal && (
        <Dialog
          isOpen
          title="Saved Week Plans"
          onClose={(): void => setShowMenusModal(false)}
          maxWidth={500}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}>
              <Button
                variant="secondary"
                onClick={(): void => setShowMenusModal(false)}
              >
                Close
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* Save current week section */}
            {currentWeekEntries.length > 0 && (
              <form onSubmit={handleSaveWeekAsMenu} style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Save this week as menu..."
                  value={newMenuName}
                  onChange={(e: ChangeEvent<HTMLInputElement>): void => setNewMenuName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    color: "var(--text)"
                  }}
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!newMenuName.trim()}
                >
                  Save Week
                </Button>
              </form>
            )}

            {/* List of menus */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
              {savedMenus.length === 0 ? (
                <div style={{ textAlign: "center", padding: "var(--space-4)", color: "var(--muted)" }}>
                  No saved menus yet. Save a week plan to reuse it anytime!
                </div>
              ) : (
                savedMenus.map((menu: SavedMenu): ReactElement => (
                  <div
                    key={menu.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)"
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{menu.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                        {menu.items.length} meals
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(): void => handleApplyMenu(menu)}
                      >
                        Apply
                      </Button>
                      {onDeleteMenu && (
                        <IconButton
                          variant="ghost"
                          size="sm"
                          icon={<TrashIcon width={16} height={16} />}
                          aria-label={`Delete ${menu.name}`}
                          onClick={(): void => setDeletingMenu(menu)}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Menu Confirmation */}
      {deletingMenu && onDeleteMenu && (
        <ConfirmDialog
          isOpen
          title="Delete Menu"
          message={`Are you sure you want to delete saved menu "${deletingMenu.name}"?`}
          confirmLabel="Delete"
          isDanger
          onConfirm={(): void => {
            onDeleteMenu(deletingMenu.id);
            setDeletingMenu(null);
            showToast(`Deleted menu "${deletingMenu.name}"`);
          }}
          onCancel={(): void => setDeletingMenu(null)}
        />
      )}
    </div>
  );
};
