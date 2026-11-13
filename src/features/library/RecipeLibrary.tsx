import { useState, useMemo, useEffect, useRef, type FC, type ReactElement } from "react";
import type { Recipe, Collection } from "../../domain/recipe/types";
import { RecipeSearchEngine, type SortField } from "../../domain/recipe/search";
import { getCoursePlaceholder } from "../../domain/recipe/placeholders";
import { formatTimeMinutes } from "../../domain/recipe/normalize";
import { CollectionsSidebar } from "../collections/CollectionsSidebar";
import {
  SearchIcon,
  PlusIcon,
  HeartIcon,
  StarIcon,
  ClockIcon,
  UploadIcon,
  PrinterIcon,
  GridIcon,
  ListIcon,
  BookOpenIcon,
  CloseIcon
} from "../../ui/icons";

export interface RecipeLibraryProps {
  recipes: Recipe[];
  collections?: Collection[];
  activeCollectionId?: string | null;
  onSelectCollection?: (collectionId: string | null) => void;
  onSaveCollection?: (collection: Collection) => void;
  onDeleteCollection?: (collectionId: string) => void;
  onBatchAssignCollection?: (recipeIds: string[], collectionId: string) => void;
  onSelectRecipe: (recipeId: string) => void;
  onNewRecipe: () => void;
  onImportFile: () => void;
  onLoadSamples: () => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenCookbookBuilder?: () => void;
  onBatchDelete?: (recipeIds: string[]) => void;
  onBatchTag?: (recipeIds: string[], tag: string) => void;
  onBatchExport?: (recipeIds: string[]) => void;
  onBatchTotals?: (recipeIds: string[]) => void;
}

export const RecipeLibrary: FC<RecipeLibraryProps> = ({
  recipes,
  collections,
  activeCollectionId,
  onSelectCollection,
  onSaveCollection,
  onDeleteCollection,
  onBatchAssignCollection,
  onSelectRecipe,
  onNewRecipe,
  onImportFile,
  onLoadSamples,
  onToggleFavorite,
  onOpenCookbookBuilder,
  onBatchDelete,
  onBatchTag,
  onBatchExport,
  onBatchTotals
}): ReactElement => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxMinutes, setMaxMinutes] = useState<number | undefined>(undefined);
  const [onlyHasPhoto, setOnlyHasPhoto] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "compact" | "list">("grid");
  const [sortBy, setSortBy] = useState<SortField>("recentAdded");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Multi-select batch mode state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTagPromptModal, setShowTagPromptModal] = useState<boolean>(false);
  const [batchTagInput, setBatchTagInput] = useState<string>("");
  const [showCollectionsSidebar, setShowCollectionsSidebar] = useState<boolean>(false);
  const [showCollectionModal, setShowCollectionModal] = useState<boolean>(false);
  const [selectedBatchCollectionId, setSelectedBatchCollectionId] = useState<string>("");

  // Setup search engine
  const searchEngine = useMemo(() => {
    const engine = new RecipeSearchEngine();
    engine.indexRecipes(recipes);
    return engine;
  }, [recipes]);

  // Keyboard shortcut '/' to focus search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement !== searchInputRef.current) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const coursesList = useMemo(() => {
    const set = new Set<string>();
    for (const r of recipes) {
      for (const c of r.courses) {
        if (c) set.add(c);
      }
    }
    return Array.from(set);
  }, [recipes]);

  const activeFilterCount = (onlyFavorites ? 1 : 0) +
    (selectedCourse ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (maxMinutes !== undefined ? 1 : 0) +
    (onlyHasPhoto ? 1 : 0);

  const handleResetFilters = (): void => {
    setSearchQuery("");
    setSelectedCourse("");
    setOnlyFavorites(false);
    setMinRating(0);
    setMaxMinutes(undefined);
    setOnlyHasPhoto(false);
  };

  const toggleMultiSelectMode = (): void => {
    setIsMultiSelectMode((prev: boolean): boolean => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  };

  const toggleSelectRecipe = (id: string, e?: React.MouseEvent): void => {
    e?.stopPropagation();
    setSelectedIds((prev: Set<string>): Set<string> => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = (): void => {
    setSelectedIds(new Set(filteredRecipes.map((r: Recipe): string => r.id)));
  };

  const deselectAll = (): void => {
    setSelectedIds(new Set());
  };

  const handleBatchDelete = (): void => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (window.confirm(`Move ${count} recipe(s) to Trash?`)) {
      onBatchDelete?.(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    }
  };

  const handleBatchExport = (): void => {
    if (selectedIds.size === 0) return;
    onBatchExport?.(Array.from(selectedIds));
  };

  const handleBatchTotals = (): void => {
    if (selectedIds.size === 0) return;
    onBatchTotals?.(Array.from(selectedIds));
  };

  const handleApplyBatchTag = (e: React.FormEvent): void => {
    e.preventDefault();
    const tag = batchTagInput.trim();
    if (!tag || selectedIds.size === 0) return;
    onBatchTag?.(Array.from(selectedIds), tag);
    setBatchTagInput("");
    setShowTagPromptModal(false);
  };

  const handleApplyBatchCollection = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!selectedBatchCollectionId || selectedIds.size === 0) return;
    onBatchAssignCollection?.(Array.from(selectedIds), selectedBatchCollectionId);
    setSelectedBatchCollectionId("");
    setShowCollectionModal(false);
  };

  const activeCollection = useMemo((): Collection | undefined => {
    if (!activeCollectionId || !collections) return undefined;
    return collections.find((c: Collection): boolean => c.id === activeCollectionId);
  }, [collections, activeCollectionId]);

  const filteredRecipes = useMemo(() => {
    let list = searchEngine.queryRecipes(
      recipes,
      searchQuery,
      {
        course: selectedCourse || undefined,
        onlyFavorites,
        minRating: minRating > 0 ? minRating : undefined,
        maxMinutes,
        hasPhoto: onlyHasPhoto ? true : undefined
      },
      sortBy
    );
    if (activeCollectionId) {
      list = list.filter((r: Recipe): boolean => {
        return r.collectionIds ? r.collectionIds.includes(activeCollectionId) : false;
      });
    }
    return list;
  }, [searchEngine, recipes, searchQuery, selectedCourse, onlyFavorites, minRating, maxMinutes, onlyHasPhoto, sortBy, activeCollectionId]);

  if (recipes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-8) var(--space-4)", maxWidth: "480px", width: "100%", margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.4rem, 5vw, 2rem)", marginBottom: "var(--space-3)", wordBreak: "break-word" }}>
          Your Recipe Book is Empty
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: "var(--space-6)" }}>
          Start building your collection or explore with original sample recipes.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <button
            type="button"
            onClick={onLoadSamples}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "12px 24px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Load Sample Recipes
          </button>
          <button
            type="button"
            onClick={onNewRecipe}
            style={{
              background: "var(--surface)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              padding: "12px 24px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <PlusIcon width={18} height={18} /> Add a Recipe
          </button>
          <button
            type="button"
            onClick={onImportFile}
            style={{
              background: "none",
              color: "var(--muted)",
              border: "none",
              padding: "10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            <UploadIcon width={16} height={16} /> Import from File
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", width: "100%", maxWidth: "100%", height: "100%", minHeight: 0, minWidth: 0, position: "relative", overflowX: "hidden" }}>
      {showCollectionsSidebar && collections && (
        <CollectionsSidebar
          collections={collections}
          recipes={recipes}
          activeCollectionId={activeCollectionId || null}
          onlyFavorites={onlyFavorites}
          onSelectCollection={(colId: string | null): void => {
            onSelectCollection?.(colId);
          }}
          onToggleFavoritesOnly={(only: boolean): void => {
            setOnlyFavorites(only);
          }}
          onSaveCollection={(col: Collection): void => {
            onSaveCollection?.(col);
          }}
          onDeleteCollection={(colId: string): void => {
            onDeleteCollection?.(colId);
          }}
          onClose={(): void => setShowCollectionsSidebar(false)}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, width: "100%", maxWidth: "var(--content-max-width)", margin: "0 auto", padding: "var(--space-4)", boxSizing: "border-box" }}>
      {/* Search and Action Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center", marginBottom: "var(--space-4)", width: "100%", minWidth: 0 }}>
        <div style={{ flex: "1 1 200px", minWidth: 0, maxWidth: "100%", position: "relative" }}>
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, ingredients, notes... (Press '/' to focus)"
            style={{
              width: "100%",
              padding: "8px 14px 8px 36px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              fontSize: "0.9rem"
            }}
          />
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
            <SearchIcon width={16} height={16} />
          </span>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap", width: "100%", maxWidth: "100%", minWidth: 0 }}>
          {collections && (
            <button
              type="button"
              onClick={(): void => setShowCollectionsSidebar(!showCollectionsSidebar)}
              style={{
                background: showCollectionsSidebar || activeCollectionId ? "var(--surface-alt)" : "var(--surface)",
                color: showCollectionsSidebar || activeCollectionId ? "var(--accent)" : "var(--muted)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                fontWeight: 500
              }}
              title="Toggle Collections Sidebar"
            >
              <BookOpenIcon width={16} height={16} /> Collections
            </button>
          )}

          <button
            type="button"
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            style={{
              background: onlyFavorites ? "var(--surface-alt)" : "var(--surface)",
              color: onlyFavorites ? "var(--danger)" : "var(--muted)",
              border: "1px solid var(--border)",
              padding: "8px 16px",
              borderRadius: "var(--radius-full)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              fontWeight: 500
            }}
          >
            <HeartIcon fill={onlyFavorites ? "currentColor" : "none"} width={16} height={16} /> Favorites
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-full)",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--text)",
              cursor: "pointer"
            }}
          >
            <option value="recentAdded">Recently Added</option>
            <option value="recentEdited">Recently Edited</option>
            <option value="title">Title (A-Z)</option>
            <option value="rating">Highest Rated</option>
            <option value="totalTime">Shortest Time</option>
          </select>

          {onOpenCookbookBuilder && (
            <button
              type="button"
              onClick={onOpenCookbookBuilder}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "8px 14px",
                borderRadius: "var(--radius-full)",
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
              title="Build and print a custom cookbook or PDF"
            >
              <PrinterIcon width={16} height={16} /> Cookbook
            </button>
          )}

          {/* View mode toggle */}
          <div style={{ display: "inline-flex", borderRadius: "var(--radius-full)", border: "1px solid var(--border)", overflow: "hidden", background: "var(--surface)" }}>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                background: viewMode === "grid" ? "var(--surface-alt)" : "none",
                color: viewMode === "grid" ? "var(--accent)" : "var(--muted)",
                border: "none",
                padding: "8px 10px",
                cursor: "pointer"
              }}
              title="Grid view"
              aria-label="Grid view"
            >
              <GridIcon width={16} height={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("compact")}
              style={{
                background: viewMode === "compact" ? "var(--surface-alt)" : "none",
                color: viewMode === "compact" ? "var(--accent)" : "var(--muted)",
                border: "none",
                padding: "8px 10px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600
              }}
              title="Compact grid"
              aria-label="Compact grid"
            >
              Dense
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              style={{
                background: viewMode === "list" ? "var(--surface-alt)" : "none",
                color: viewMode === "list" ? "var(--accent)" : "var(--muted)",
                border: "none",
                padding: "8px 10px",
                cursor: "pointer"
              }}
              title="List view"
              aria-label="List view"
            >
              <ListIcon width={16} height={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={toggleMultiSelectMode}
            style={{
              background: isMultiSelectMode ? "var(--accent)" : "var(--surface)",
              color: isMultiSelectMode ? "var(--accent-contrast)" : "var(--text)",
              border: "1px solid " + (isMultiSelectMode ? "var(--accent)" : "var(--border)"),
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 500
            }}
          >
            {isMultiSelectMode ? "Cancel Select" : "Select"}
          </button>

          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters || activeFilterCount > 0 ? "var(--surface-alt)" : "var(--surface)",
              color: showFilters || activeFilterCount > 0 ? "var(--accent)" : "var(--text)",
              border: "1px solid var(--border)",
              padding: "8px 14px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontSize: "0.88rem",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          <button
            type="button"
            onClick={onNewRecipe}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              padding: "8px 18px",
              borderRadius: "var(--radius-full)",
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <PlusIcon width={16} height={16} /> New Recipe
          </button>
        </div>
      </div>

      {/* Filter Drawer */}
      {showFilters && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
            marginBottom: "var(--space-4)",
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-4)",
            alignItems: "center"
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
              Rating
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(parseInt(e.target.value, 10) || 0)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.85rem" }}
            >
              <option value={0}>Any rating</option>
              <option value={3}>3+ stars</option>
              <option value={4}>4+ stars</option>
              <option value={5}>5 stars only</option>
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--muted)", marginBottom: "4px" }}>
              Total Time
            </label>
            <select
              value={maxMinutes ?? ""}
              onChange={(e) => setMaxMinutes(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              style={{ padding: "6px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg)", fontSize: "0.85rem" }}
            >
              <option value="">Any duration</option>
              <option value="30">30 min or less</option>
              <option value="45">45 min or less</option>
              <option value="60">60 min or less</option>
            </select>
          </div>

          <div style={{ paddingTop: "18px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={onlyHasPhoto}
                onChange={(e) => setOnlyHasPhoto(e.target.checked)}
              />
              Has photo
            </label>
          </div>

          {activeFilterCount > 0 && (
            <div style={{ paddingTop: "16px", marginLeft: "auto" }}>
              <button
                type="button"
                onClick={handleResetFilters}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textDecoration: "underline"
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active collection filter pill */}
      {activeCollection && (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-3)" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>Filtered by collection:</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              padding: "4px 10px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.85rem",
              fontWeight: 600
            }}
          >
            {activeCollection.name}
            <button
              type="button"
              onClick={(): void => onSelectCollection?.(null)}
              style={{
                background: "none",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center"
              }}
              title="Clear collection filter"
              aria-label="Clear collection filter"
            >
              <CloseIcon width={12} height={12} />
            </button>
          </span>
        </div>
      )}

      {/* Course filter chips */}
      {coursesList.length > 0 && (
        <div style={{ display: "flex", gap: "var(--space-2)", overflowX: "auto", paddingBottom: "var(--space-4)", marginBottom: "var(--space-4)", width: "100%", maxWidth: "100%", minWidth: 0 }}>
          <button
            type="button"
            onClick={() => setSelectedCourse("")}
            style={{
              background: selectedCourse === "" ? "var(--accent)" : "var(--surface)",
              color: selectedCourse === "" ? "var(--accent-contrast)" : "var(--text)",
              border: "1px solid " + (selectedCourse === "" ? "var(--accent)" : "var(--border)"),
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            All Courses
          </button>
          {coursesList.map((course) => (
            <button
              key={course}
              type="button"
              onClick={() => setSelectedCourse(course === selectedCourse ? "" : course)}
              style={{
                background: selectedCourse === course ? "var(--accent)" : "var(--surface)",
                color: selectedCourse === course ? "var(--accent-contrast)" : "var(--text)",
                border: "1px solid " + (selectedCourse === course ? "var(--accent)" : "var(--border)"),
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
                fontWeight: 500,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              {course}
            </button>
          ))}
        </div>
      )}

      {/* Empty Search / Filters State */}
      {filteredRecipes.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-12) var(--space-4)", maxWidth: "450px", margin: "0 auto" }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", marginBottom: "var(--space-2)" }}>
            No recipes found
          </h3>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "var(--space-4)" }}>
            No recipes match your search and filter criteria.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              background: "var(--surface)",
              color: "var(--accent)",
              border: "1px solid var(--border)",
              padding: "8px 18px",
              borderRadius: "var(--radius-full)",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.9rem"
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* List View Mode */}
      {viewMode === "list" && filteredRecipes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {filteredRecipes.map((recipe) => {
            const course = recipe.courses[0];
            const placeholder = getCoursePlaceholder(course);
            const timeFormatted = formatTimeMinutes(recipe.totalMinutes);
            const isSelected = selectedIds.has(recipe.id);

            return (
              <div
                key={recipe.id}
                onClick={(e): void => {
                  if (isMultiSelectMode) {
                    toggleSelectRecipe(recipe.id, e);
                  } else {
                    onSelectRecipe(recipe.id);
                  }
                }}
                style={{
                  background: isSelected ? "var(--surface-alt)" : "var(--surface)",
                  borderRadius: "var(--radius-md)",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-4)",
                  cursor: "pointer",
                  transition: "background 100ms ease"
                }}
              >
                {isMultiSelectMode && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(): void => {}}
                    style={{ width: "18px", height: "18px", cursor: "pointer", flexShrink: 0 }}
                  />
                )}

                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "var(--radius-sm)",
                    background: placeholder.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <div
                    style={{ width: "32px", height: "32px" }}
                    dangerouslySetInnerHTML={{ __html: placeholder.svgContent }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.1rem", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {recipe.title}
                  </h3>
                  <div style={{ display: "flex", gap: "var(--space-3)", fontSize: "0.82rem", color: "var(--muted)", marginTop: "4px" }}>
                    {course && <span>{course}</span>}
                    {timeFormatted && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <ClockIcon width={12} height={12} /> {timeFormatted}
                      </span>
                    )}
                    {recipe.rating > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", color: "var(--accent)" }}>
                        <StarIcon fill="currentColor" width={12} height={12} /> {recipe.rating}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e): void => {
                    e.stopPropagation();
                    onToggleFavorite(recipe.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: recipe.favorite ? "var(--danger)" : "var(--muted)",
                    padding: "6px"
                  }}
                  aria-label="Favorite"
                >
                  <HeartIcon fill={recipe.favorite ? "currentColor" : "none"} width={18} height={18} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid View Modes (Normal and Compact) */}
      {viewMode !== "list" && filteredRecipes.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: viewMode === "compact"
              ? "repeat(auto-fill, minmax(min(180px, 100%), 1fr))"
              : "repeat(auto-fill, minmax(min(260px, 100%), 1fr))",
            gap: viewMode === "compact" ? "var(--space-4)" : "var(--space-6)"
          }}
        >
          {filteredRecipes.map((recipe) => {
            const course = recipe.courses[0];
            const placeholder = getCoursePlaceholder(course);
            const timeFormatted = formatTimeMinutes(recipe.totalMinutes);
            const isSelected = selectedIds.has(recipe.id);

            return (
              <div
                key={recipe.id}
                onClick={(e): void => {
                  if (isMultiSelectMode) {
                    toggleSelectRecipe(recipe.id, e);
                  } else {
                    onSelectRecipe(recipe.id);
                  }
                }}
                style={{
                  background: isSelected ? "var(--surface-alt)" : "var(--surface)",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                  cursor: "pointer",
                  boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative"
                }}
                onMouseEnter={(e): void => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "var(--shadow-md)";
                }}
                onMouseLeave={(e): void => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                }}
              >
                {/* Selection Checkbox on Card */}
                {isMultiSelectMode && (
                  <div
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      zIndex: 10,
                      background: "var(--surface)",
                      borderRadius: "var(--radius-sm)",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      boxShadow: "var(--shadow-sm)"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(): void => {}}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                  </div>
                )}

                {/* Photo or placeholder */}
                <div
                  style={{
                    height: viewMode === "compact" ? "110px" : "170px",
                    background: placeholder.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    color: "var(--text)"
                  }}
                >
                  <div
                    style={{ width: viewMode === "compact" ? "50px" : "80px", height: viewMode === "compact" ? "50px" : "80px", opacity: 0.7 }}
                    dangerouslySetInnerHTML={{ __html: placeholder.svgContent }}
                  />

                  <button
                    type="button"
                    onClick={(e): void => {
                      e.stopPropagation();
                      onToggleFavorite(recipe.id);
                    }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "var(--surface)",
                      border: "none",
                      borderRadius: "var(--radius-full)",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      color: recipe.favorite ? "var(--danger)" : "var(--muted)",
                      boxShadow: "var(--shadow-sm)"
                    }}
                    aria-label="Favorite"
                  >
                    <HeartIcon fill={recipe.favorite ? "currentColor" : "none"} width={16} height={16} />
                  </button>
                </div>

                {/* Details */}
                <div style={{ padding: viewMode === "compact" ? "var(--space-3)" : "var(--space-4)", display: "flex", flexDirection: "column", flex: 1 }}>
                  <h3
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: viewMode === "compact" ? "1.05rem" : "1.25rem",
                      marginBottom: "var(--space-2)",
                      lineHeight: 1.3
                    }}
                  >
                    {recipe.title}
                  </h3>

                  {viewMode !== "compact" && recipe.description && (
                    <p
                      style={{
                        fontSize: "0.88rem",
                        color: "var(--muted)",
                        marginBottom: "var(--space-3)",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}
                    >
                      {recipe.description}
                    </p>
                  )}

                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--muted)" }}>
                    {timeFormatted ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <ClockIcon width={14} height={14} /> {timeFormatted}
                      </span>
                    ) : <span />}

                    {recipe.rating > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "2px", color: "var(--accent)" }}>
                        <StarIcon fill="currentColor" width={14} height={14} /> {recipe.rating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Batch Selection Bar */}
      {isMultiSelectMode && (
        <div
          style={{
            position: "fixed",
            bottom: "var(--space-6)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-lg)",
            padding: "8px 20px",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            zIndex: 500,
            maxWidth: "95vw",
            overflowX: "auto"
          }}
        >
          <span style={{ fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" }}>
            {selectedIds.size} selected
          </span>

          <button
            type="button"
            onClick={selectedIds.size === filteredRecipes.length ? deselectAll : selectAll}
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "4px 12px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            {selectedIds.size === filteredRecipes.length ? "Deselect All" : "Select All"}
          </button>

          {onBatchTotals && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBatchTotals}
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "4px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Totals ({selectedIds.size})
            </button>
          )}

          {onBatchTag && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={(): void => setShowTagPromptModal(true)}
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "4px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              + Tag
            </button>
          )}

          {onBatchAssignCollection && collections && collections.length > 0 && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={(): void => {
                setSelectedBatchCollectionId(collections[0].id);
                setShowCollectionModal(true);
              }}
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "4px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              + Collection
            </button>
          )}

          {onBatchExport && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBatchExport}
              style={{
                background: "var(--surface-alt)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-full)",
                padding: "4px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Export ({selectedIds.size})
            </button>
          )}

          {onBatchDelete && selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handleBatchDelete}
              style={{
                background: "none",
                color: "var(--danger)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-full)",
                padding: "4px 12px",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              Trash ({selectedIds.size})
            </button>
          )}

          <button
            type="button"
            onClick={toggleMultiSelectMode}
            style={{
              background: "var(--accent)",
              color: "var(--accent-contrast)",
              border: "none",
              borderRadius: "var(--radius-full)",
              padding: "4px 14px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            Done
          </button>
        </div>
      )}

      {/* Tag Prompt Modal */}
      {showTagPromptModal && (
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
              maxWidth: "400px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", marginBottom: "var(--space-2)" }}>
              Add Tag to {selectedIds.size} Recipes
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "var(--space-4)" }}>
              Enter a tag name to apply to all selected recipes.
            </p>
            <form onSubmit={handleApplyBatchTag}>
              <input
                type="text"
                required
                autoFocus
                value={batchTagInput}
                onChange={(e): void => setBatchTagInput(e.target.value)}
                placeholder="e.g. Quick, Vegetarian, Summer"
                style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "var(--space-4)" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={(): void => setShowTagPromptModal(false)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Apply Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Collection Prompt Modal */}
      {showCollectionModal && collections && collections.length > 0 && (
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
              maxWidth: "400px",
              width: "100%",
              boxShadow: "var(--shadow-lg)"
            }}
          >
            <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", marginBottom: "var(--space-2)" }}>
              Add {selectedIds.size} Recipes to Collection
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: "var(--space-4)" }}>
              Select a collection to assign to the selected recipes.
            </p>
            <form onSubmit={handleApplyBatchCollection}>
              <select
                value={selectedBatchCollectionId}
                onChange={(e): void => setSelectedBatchCollectionId(e.target.value)}
                style={{ width: "100%", padding: "8px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "var(--space-4)", background: "var(--surface)" }}
              >
                {collections.map((c: Collection) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
                <button
                  type="button"
                  onClick={(): void => setShowCollectionModal(false)}
                  style={{ background: "none", border: "1px solid var(--border)", padding: "8px 16px", borderRadius: "var(--radius-full)", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    border: "none",
                    padding: "8px 18px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Assign Collection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
