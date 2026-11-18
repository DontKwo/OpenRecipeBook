import {
  useState,
  useRef,
  useEffect,
  type ChangeEvent,
  type KeyboardEvent
} from "react";
import type { Recipe } from "../domain/recipe/types";
import { useRecipeSearch } from "./useRecipeSearch";
import { resolvePhotoUrl } from "../domain/recipe/photoPipeline";
import { SearchIcon, BookOpenIcon, PlusIcon, ClockIcon } from "./icons";
import styles from "./RecipePicker.module.css";

export interface RecipePickerProps {
  recipes: Recipe[];
  onSelectRecipe: (recipe: Recipe) => void;
  onSelectCustomMeal?: (title: string) => void;
  placeholder?: string;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function RecipePicker({
  recipes,
  onSelectRecipe,
  onSelectCustomMeal,
  placeholder = "Search recipes...",
  onCancel,
  autoFocus = false
}: RecipePickerProps): JSX.Element {
  const [query, setQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const searchResults = useRecipeSearch(recipes, query);

  const displayList: Recipe[] = query.trim()
    ? searchResults
    : [
        ...recipes.filter((r: Recipe): boolean => Boolean(r.favorite)),
        ...recipes.filter((r: Recipe): boolean => !r.favorite)
      ];

  const hasCustomRow = Boolean(onSelectCustomMeal && query.trim().length > 0);
  const totalItemCount = displayList.length + (hasCustomRow ? 1 : 0);

  useEffect((): void => {
    setSelectedIndex(0);
  }, [query]);

  useEffect((): void => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev: number): number =>
        prev < totalItemCount - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev: number): number =>
        prev > 0 ? prev - 1 : totalItemCount - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex < displayList.length) {
        const item = displayList[selectedIndex];
        if (item) onSelectRecipe(item);
      } else if (hasCustomRow && onSelectCustomMeal) {
        onSelectCustomMeal(query.trim());
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel?.();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchBox}>
        <SearchIcon width={18} height={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>): void => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={totalItemCount > 0}
          aria-controls="recipe-picker-list"
          aria-label={placeholder}
        />
      </div>

      <div
        id="recipe-picker-list"
        ref={listRef}
        role="listbox"
        className={styles.resultsList}
      >
        {displayList.map((recipe: Recipe, idx: number): JSX.Element => {
          const isSelected = idx === selectedIndex;
          const time = recipe.totalMinutes || (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);

          return (
            <button
              key={recipe.id}
              type="button"
              role="option"
              aria-selected={isSelected}
              className={`${styles.resultItem} ${isSelected ? styles.selectedItem : ""}`.trim()}
              onClick={(): void => onSelectRecipe(recipe)}
              onMouseEnter={(): void => setSelectedIndex(idx)}
            >
              <div className={styles.thumbnail}>
                {recipe.photoIds?.[0] ? (
                  <img
                    src={resolvePhotoUrl(recipe.photoIds[0])}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>): void => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <BookOpenIcon width={20} height={20} />
                )}
              </div>
              <div className={styles.info}>
                <div className={styles.title}>{recipe.title}</div>
                <div className={styles.meta}>
                  {time > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      <ClockIcon width={13} height={13} />
                      {time} min
                    </span>
                  )}
                  {recipe.courses && recipe.courses.length > 0 && (
                    <span>- {recipe.courses[0]}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {hasCustomRow && onSelectCustomMeal && (
          <button
            type="button"
            className={`${styles.customMealRow} ${
              selectedIndex === displayList.length ? styles.selectedCustomMeal : ""
            }`.trim()}
            onClick={(): void => onSelectCustomMeal(query.trim())}
            onMouseEnter={(): void => setSelectedIndex(displayList.length)}
          >
            <PlusIcon width={18} height={18} />
            <span>Use &ldquo;{query.trim()}&rdquo; as a custom meal</span>
          </button>
        )}

        {totalItemCount === 0 && (
          <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--muted)" }}>
            No recipes found.
          </div>
        )}
      </div>
    </div>
  );
}
