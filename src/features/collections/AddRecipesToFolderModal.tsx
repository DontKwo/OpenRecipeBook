import {
  useState,
  useMemo,
  useRef,
  type FC,
  type ReactElement,
  type ChangeEvent
} from "react";
import type { Collection, Recipe } from "../../domain/recipe/types";
import { RecipeSearchEngine } from "../../domain/recipe/search";
import { formatTimeMinutes } from "../../domain/recipe/normalize";
import {
  FolderIcon,
  SearchIcon,
  CheckIcon,
  ClockIcon,
  XIcon,
  BookOpenIcon
} from "../../ui/icons";
import { Dialog } from "../../ui/Dialog";
import { Button, IconButton } from "../../ui/Button";
import { Chip } from "../../ui/Chip";

export interface AddRecipesToFolderModalProps {
  collection: Collection;
  recipes: Recipe[];
  onSaveFolderRecipes: (collectionId: string, selectedRecipeIds: string[]) => Promise<void> | void;
  onClose: () => void;
}

type MembershipFilter = "all" | "outside" | "inside";

export const AddRecipesToFolderModal: FC<AddRecipesToFolderModalProps> = ({
  collection,
  recipes,
  onSaveFolderRecipes,
  onClose
}): ReactElement => {
  const [query, setQuery] = useState<string>("");
  const [filterMode, setFilterMode] = useState<MembershipFilter>("all");
  const [saving, setSaving] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(
      recipes
        .filter((r: Recipe): boolean => r.collectionIds?.includes(collection.id) ?? false)
        .map((r: Recipe): string => r.id)
    );
  });

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const searchEngine = useMemo((): RecipeSearchEngine => {
    const engine = new RecipeSearchEngine();
    engine.indexRecipes(recipes);
    return engine;
  }, [recipes]);

  const matchingRecipes = useMemo((): Recipe[] => {
    const base = searchEngine.queryRecipes(recipes, query, {}, "title");
    if (filterMode === "inside") {
      return base.filter((r: Recipe): boolean => selectedIds.has(r.id));
    }
    if (filterMode === "outside") {
      return base.filter((r: Recipe): boolean => !selectedIds.has(r.id));
    }
    return base;
  }, [searchEngine, recipes, query, filterMode, selectedIds]);

  const toggleRecipe = (recipeId: string): void => {
    setSelectedIds((prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      if (next.has(recipeId)) {
        next.delete(recipeId);
      } else {
        next.add(recipeId);
      }
      return next;
    });
  };

  const handleSelectShown = (): void => {
    setSelectedIds((prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      for (const r of matchingRecipes) {
        next.add(r.id);
      }
      return next;
    });
  };

  const handleClearShown = (): void => {
    setSelectedIds((prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      for (const r of matchingRecipes) {
        next.delete(r.id);
      }
      return next;
    });
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      await onSaveFolderRecipes(collection.id, Array.from(selectedIds));
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      isOpen
      onClose={onClose}
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <FolderIcon width={20} height={20} />
          Add Recipes to &ldquo;{collection.name}&rdquo;
        </span>
      }
      maxWidth={560}
      footer={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            width: "100%",
            flexWrap: "wrap"
          }}
        >
          <span style={{ fontSize: "0.875rem", color: "var(--muted)", fontWeight: 500 }}>
            {selectedIds.size} selected in folder
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={saving}
              icon={<CheckIcon width={16} height={16} />}
              onClick={(): void => {
                void handleSave();
              }}
            >
              {saving ? "Saving..." : "Save Folder"}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <div
          onClick={(): void => searchInputRef.current?.focus()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface-alt)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)",
            padding: "0 12px",
            minHeight: 44,
            cursor: "text"
          }}
        >
          <SearchIcon width={16} height={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input
            ref={searchInputRef}
            type="search"
            autoFocus
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => setQuery(e.target.value)}
            placeholder="Search recipes by title, ingredient, or course..."
            aria-label="Search recipes to add to folder"
            style={{
              flex: 1,
              minWidth: 0,
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontSize: "0.9375rem",
              outline: "none",
              boxShadow: "none",
              minHeight: 40
            }}
          />
          {query && (
            <IconButton
              size="sm"
              variant="ghost"
              icon={<XIcon width={14} height={14} />}
              aria-label="Clear recipe search"
              onClick={(e): void => {
                e.stopPropagation();
                setQuery("");
              }}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap"
          }}
        >
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Chip label="All" selected={filterMode === "all"} onClick={(): void => setFilterMode("all")} />
            <Chip
              label="Not in Folder"
              selected={filterMode === "outside"}
              onClick={(): void => setFilterMode("outside")}
            />
            <Chip
              label="In Folder"
              selected={filterMode === "inside"}
              onClick={(): void => setFilterMode("inside")}
            />
          </div>

          <div style={{ display: "flex", gap: 4 }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectShown}
              disabled={matchingRecipes.length === 0}
            >
              Select Shown
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearShown}
              disabled={matchingRecipes.length === 0}
            >
              Clear Shown
            </Button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {matchingRecipes.length === 0 ? (
            <div style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--muted)" }}>
              No recipes matched your search.
            </div>
          ) : (
            matchingRecipes.map((recipe: Recipe): ReactElement => {
              const checked = selectedIds.has(recipe.id);
              const totalMin = recipe.totalMinutes || (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);
              return (
                <label
                  key={recipe.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    minHeight: 48,
                    borderRadius: "var(--radius-md)",
                    border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
                    background: checked ? "var(--surface-alt)" : "var(--surface)",
                    cursor: "pointer"
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(): void => toggleRecipe(recipe.id)}
                    style={{ width: 20, height: 20, accentColor: "var(--accent)", flexShrink: 0 }}
                  />
                  <BookOpenIcon width={18} height={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9375rem",
                        color: "var(--text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {recipe.title}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: "0.75rem",
                        color: "var(--muted)"
                      }}
                    >
                      {recipe.courses?.[0] && <span>{recipe.courses[0]}</span>}
                      {totalMin > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <ClockIcon width={12} height={12} />
                          {formatTimeMinutes(totalMin)}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </Dialog>
  );
};
