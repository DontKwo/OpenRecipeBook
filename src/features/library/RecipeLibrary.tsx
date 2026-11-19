import {
  useState,
  useMemo,
  useRef,
  type FC,
  type ReactElement,
  type ChangeEvent,
  type MouseEvent
} from "react";
import type { Recipe, Collection } from "../../domain/recipe/types";
import { RecipeSearchEngine, type SortField } from "../../domain/recipe/search";
import { getCoursePlaceholder } from "../../domain/recipe/placeholders";
import { formatTimeMinutes } from "../../domain/recipe/normalize";
import { resolvePhotoUrl } from "../../domain/recipe/photoPipeline";
import {
  SearchIcon,
  PlusIcon,
  HeartIcon,
  StarIcon,
  ClockIcon,
  GridIcon,
  CompactGridIcon,
  ListIcon,
  FilterIcon,
  MoreIcon,
  FolderIcon,
  PrinterIcon,
  UploadIcon,
  TrashIcon,
  BookOpenIcon,
  ChefHatIcon,
  XIcon
} from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { Chip } from "../../ui/Chip";
import { Menu } from "../../ui/Menu";
import { Dialog } from "../../ui/Dialog";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { FolderManagerModal } from "../collections/FolderManagerModal";
import { AddRecipesToFolderModal } from "../collections/AddRecipesToFolderModal";
import { RecipeFilterModal } from "./RecipeFilterModal";
import { useToast } from "../../ui/Toast";
import styles from "./RecipeLibrary.module.css";

export interface RecipeLibraryProps {
  recipes: Recipe[];
  collections?: Collection[];
  activeCollectionId?: string | null;
  onSelectCollection?: (collectionId: string | null) => void;
  onSaveCollection?: (collection: Collection) => Promise<void> | void;
  onDeleteCollection?: (collectionId: string) => Promise<void> | void;
  onBatchAssignCollection?: (recipeIds: string[], collectionId: string) => void;
  onSaveFolderRecipes?: (collectionId: string, selectedRecipeIds: string[]) => Promise<void> | void;
  onOpenStorageModal?: () => void;
  onUpdateRecipe?: (recipe: Recipe) => void;
  onSelectRecipe: (recipeId: string) => void;
  onNewRecipe: () => void;
  onImportFile: () => void;
  onLoadSamples: () => void;
  onToggleFavorite: (recipeId: string) => void;
  onOpenCookbookBuilder?: (collectionId?: string) => void;
  onBatchDelete?: (recipeIds: string[]) => void;
  onBatchTag?: (recipeIds: string[], tag: string) => void;
  onBatchExport?: (recipeIds: string[]) => void;
  onBatchTotals?: (recipeIds: string[]) => void;
}

export const RecipeLibrary: FC<RecipeLibraryProps> = ({
  recipes,
  collections = [],
  activeCollectionId,
  onSelectCollection,
  onSaveCollection,
  onDeleteCollection,
  onBatchAssignCollection,
  onSaveFolderRecipes,
  onOpenStorageModal,
  onSelectRecipe,
  onNewRecipe,
  onImportFile,
  onLoadSamples,
  onToggleFavorite,
  onOpenCookbookBuilder,
  onBatchDelete
}): ReactElement => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [maxMinutes, setMaxMinutes] = useState<number | undefined>(undefined);
  const [onlyHasPhoto, setOnlyHasPhoto] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortField>("recentAdded");
  const [viewMode, setViewMode] = useState<"list" | "expanded" | "grid">(
    () => (localStorage.getItem("orb_library_view") as "list" | "expanded" | "grid") || "grid"
  );

  // Modal states
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showFolderModal, setShowFolderModal] = useState<boolean>(false);
  const [addRecipesFolderId, setAddRecipesFolderId] = useState<string | null>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState<boolean>(false);
  const [showBatchFolderModal, setShowBatchFolderModal] = useState<boolean>(false);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchEngine = useMemo(() => {
    const engine = new RecipeSearchEngine();
    engine.indexRecipes(recipes);
    return engine;
  }, [recipes]);

  const coursesList = useMemo((): string[] => {
    const set = new Set<string>();
    for (const r of recipes) {
      for (const c of r.courses) {
        if (c) set.add(c);
      }
    }
    return Array.from(set).sort();
  }, [recipes]);

  const activeCollection = useMemo((): Collection | undefined => {
    if (!activeCollectionId) return undefined;
    return collections.find((c: Collection): boolean => c.id === activeCollectionId);
  }, [collections, activeCollectionId]);

  const addRecipesTargetCollection = useMemo((): Collection | undefined => {
    if (!addRecipesFolderId) return undefined;
    return collections.find((c: Collection): boolean => c.id === addRecipesFolderId);
  }, [collections, addRecipesFolderId]);

  const activeCollectionRecipeCount = useMemo((): number => {
    if (!activeCollectionId) return 0;
    return recipes.filter((r: Recipe): boolean => r.collectionIds?.includes(activeCollectionId) ?? false).length;
  }, [recipes, activeCollectionId]);

  const activeFilterCount =
    (selectedCourse ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (maxMinutes !== undefined ? 1 : 0) +
    (onlyHasPhoto ? 1 : 0);

  const handleResetFilters = (): void => {
    setSelectedCourse("");
    setMinRating(0);
    setMaxMinutes(undefined);
    setOnlyHasPhoto(false);
  };

  const filteredRecipes = useMemo((): Recipe[] => {
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
  }, [
    searchEngine,
    recipes,
    searchQuery,
    selectedCourse,
    onlyFavorites,
    minRating,
    maxMinutes,
    onlyHasPhoto,
    sortBy,
    activeCollectionId
  ]);

  const toggleSelectRecipe = (id: string, e?: MouseEvent): void => {
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

  const handleSelectAll = (): void => {
    setSelectedIds(new Set(filteredRecipes.map((r: Recipe): string => r.id)));
  };

  const handleDeselectAll = (): void => {
    setSelectedIds(new Set());
  };

  const handleConfirmBatchDelete = (): void => {
    if (selectedIds.size === 0) return;
    onBatchDelete?.(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
    setShowBatchDeleteConfirm(false);
  };

  const handleAssignBatchFolder = (): void => {
    if (selectedIds.size === 0 || !batchTargetFolderId) return;
    onBatchAssignCollection?.(Array.from(selectedIds), batchTargetFolderId);
    setBatchTargetFolderId("");
    setShowBatchFolderModal(false);
    setSelectedIds(new Set());
    setIsMultiSelectMode(false);
  };

  const handleSurpriseMe = (): void => {
    const pool = filteredRecipes.length > 0 ? filteredRecipes : recipes;
    if (pool.length === 0) {
      showToast("No recipes available to pick from");
      return;
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];
    onSelectRecipe(chosen.id);
    showToast(`Picked "${chosen.title}"!`);
  };

  if (recipes.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "var(--space-8) var(--space-4)", maxWidth: "480px", margin: "0 auto" }}>
        <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(1.4rem, 5vw, 2rem)", marginBottom: "var(--space-3)" }}>
          Your Recipe Book is Empty
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: "var(--space-6)" }}>
          Start building your collection, add recipe files to your storage folder, or explore sample recipes.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Button
            type="button"
            variant="primary"
            onClick={onLoadSamples}
          >
            Load Sample Recipes
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon={<PlusIcon width={18} height={18} />}
            onClick={onNewRecipe}
          >
            Add a Recipe
          </Button>
          {onOpenStorageModal && (
            <Button
              type="button"
              variant="secondary"
              icon={<FolderIcon width={16} height={16} />}
              onClick={onOpenStorageModal}
            >
              Open Recipe Storage Folder
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            icon={<UploadIcon width={16} height={16} />}
            onClick={onImportFile}
          >
            Import from File
          </Button>
        </div>
      </div>
    );
  }

  const isEmptyFolderWithoutQuery = Boolean(
    activeCollection &&
      activeCollectionRecipeCount === 0 &&
      !searchQuery.trim() &&
      activeFilterCount === 0 &&
      !onlyFavorites
  );

  const matchingCollections = useMemo((): Collection[] => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return collections.filter((col: Collection): boolean =>
      col.name.toLowerCase().includes(q) ||
      (col.description ? col.description.toLowerCase().includes(q) : false)
    );
  }, [collections, searchQuery]);

  const getCollectionRecipeCount = (colId: string): number => {
    return recipes.filter((r: Recipe): boolean => r.collectionIds?.includes(colId) ?? false).length;
  };

  return (
    <div className={styles.libraryContainer}>
      {/* Sticky Header with Row 1 & Row 2 */}
      <div className={styles.controlsHeader}>
        <div className={styles.row1}>
          <div
            className={styles.searchBox}
            onClick={(): void => searchInputRef.current?.focus()}
          >
            <SearchIcon width={18} height={18} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>): void => setSearchQuery(e.target.value)}
              placeholder="Search recipes..."
              className={styles.searchInput}
              aria-label="Search recipes"
            />
            {searchQuery && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<XIcon width={14} height={14} />}
                aria-label="Clear search"
                onClick={(e): void => {
                  e.stopPropagation();
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
              />
            )}
          </div>

          <div className={styles.toolbarActions}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<FilterIcon width={15} height={15} />}
                onClick={(): void => setShowFilterModal(true)}
                aria-label="Filters"
              >
                {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                icon={<ChefHatIcon width={15} height={15} />}
                onClick={handleSurpriseMe}
                title="Pick a random recipe"
              >
                Surprise Me
              </Button>

              {onOpenStorageModal && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<FolderIcon width={15} height={15} />}
                  onClick={onOpenStorageModal}
                  aria-label="Recipe storage folder"
                >
                  Storage
                </Button>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <SegmentedControl
                className={styles.viewToggle}
                name="Recipe layout view"
                options={[
                  { value: "list", icon: <ListIcon width={16} height={16} />, label: "List", ariaLabel: "List view" },
                  {
                    value: "expanded",
                    icon: <CompactGridIcon width={16} height={16} />,
                    label: "Expanded",
                    ariaLabel: "Expanded list view"
                  },
                  { value: "grid", icon: <GridIcon width={16} height={16} />, label: "Grid", ariaLabel: "Grid view" }
                ]}
                value={viewMode}
                onChange={(val: string): void => {
                  const mode = val as "list" | "expanded" | "grid";
                  setViewMode(mode);
                  localStorage.setItem("orb_library_view", mode);
                }}
                size="sm"
              />

              <Menu
                trigger={
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<MoreIcon width={18} height={18} />}
                    aria-label="More options"
                  />
                }
                items={[
                  ...(onOpenStorageModal
                    ? [
                        {
                          id: "storage",
                          icon: <FolderIcon width={16} height={16} />,
                          label: "Recipe Storage Folder",
                          onClick: onOpenStorageModal
                        }
                      ]
                    : []),
                  ...(onOpenCookbookBuilder
                    ? [
                        {
                          id: "print",
                          icon: <PrinterIcon width={16} height={16} />,
                          label: "Print / Export Cookbook",
                          onClick: onOpenCookbookBuilder
                        }
                      ]
                    : []),
                  {
                    id: "select",
                    icon: <ListIcon width={16} height={16} />,
                    label: isMultiSelectMode ? "Exit Select Mode" : "Select Multiple Recipes",
                    onClick: (): void => {
                      if (isMultiSelectMode) {
                        setSelectedIds(new Set());
                      }
                      setIsMultiSelectMode(!isMultiSelectMode);
                    }
                  },
                  {
                    id: "import",
                    icon: <UploadIcon width={16} height={16} />,
                    label: "Import Recipes",
                    onClick: onImportFile
                  },
                  {
                    id: "folders",
                    icon: <FolderIcon width={16} height={16} />,
                    label: "Manage Folders",
                    onClick: (): void => setShowFolderModal(true)
                  }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Row 2: Horizontally scrollable chips */}
        <div className={styles.row2}>
          <Chip
            label="All Recipes"
            selected={!activeCollectionId && !onlyFavorites}
            onClick={(): void => {
              onSelectCollection?.(null);
              setOnlyFavorites(false);
            }}
          />
          <Chip
            icon={<HeartIcon fill={onlyFavorites ? "currentColor" : "none"} width={14} height={14} />}
            label="Favorites"
            selected={onlyFavorites}
            onClick={(): void => {
              setOnlyFavorites(!onlyFavorites);
              if (!onlyFavorites) {
                onSelectCollection?.(null);
              }
            }}
          />
          {collections.map((col: Collection): ReactElement => {
            const isSelected = activeCollectionId === col.id;
            return (
              <Chip
                key={col.id}
                icon={<FolderIcon width={14} height={14} />}
                label={col.name}
                selected={isSelected}
                onClick={(): void => {
                  setOnlyFavorites(false);
                  onSelectCollection?.(isSelected ? null : col.id);
                }}
              />
            );
          })}
          <Chip
            icon={<PlusIcon width={14} height={14} />}
            label="Folder"
            onClick={(): void => setShowFolderModal(true)}
          />
        </div>
      </div>

      {/* Active Folder Banner */}
      {activeCollection && (
        <div className={styles.activeFolderBanner}>
          <div className={styles.activeFolderInfo}>
            <FolderIcon width={20} height={20} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div>
              <h2 className={styles.activeFolderTitle}>{activeCollection.name}</h2>
              <span className={styles.activeFolderCount}>
                {activeCollectionRecipeCount} {activeCollectionRecipeCount === 1 ? "recipe" : "recipes"}
              </span>
            </div>
          </div>
          <div className={styles.activeFolderActions}>
            {onSaveFolderRecipes && (
              <Button
                variant="primary"
                size="sm"
                icon={<PlusIcon width={15} height={15} />}
                onClick={(): void => setAddRecipesFolderId(activeCollection.id)}
              >
                Add Recipes
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(): void => setShowFolderModal(true)}
            >
              Manage Folders
            </Button>
            {onOpenCookbookBuilder && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<PrinterIcon width={15} height={15} />}
                onClick={(): void => onOpenCookbookBuilder(activeCollection.id)}
              >
                Print Folder
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(): void => onSelectCollection?.(null)}
            >
              All Recipes
            </Button>
          </div>
        </div>
      )}

      {/* Matching Folders in Search Results */}
      {matchingCollections.length > 0 && (
        <div className={styles.matchingFoldersContainer}>
          <div className={styles.matchingFoldersHeader}>
            <FolderIcon width={16} height={16} style={{ color: "var(--accent)" }} />
            <span>Matching Folders ({matchingCollections.length})</span>
          </div>
          <div className={styles.matchingFoldersList}>
            {matchingCollections.map((col: Collection): ReactElement => {
              const count = getCollectionRecipeCount(col.id);
              const isSelected = activeCollectionId === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  className={`${styles.folderSearchCard} ${isSelected ? styles.folderSearchCardActive : ""}`}
                  onClick={(): void => {
                    setOnlyFavorites(false);
                    onSelectCollection?.(isSelected ? null : col.id);
                  }}
                >
                  <div className={styles.folderCardIconWrap}>
                    <FolderIcon width={20} height={20} />
                  </div>
                  <div className={styles.folderCardBody}>
                    <div className={styles.folderCardTitleRow}>
                      <span className={styles.folderCardTitle}>{col.name}</span>
                      <span className={styles.folderCardBadge}>
                        {count} {count === 1 ? "recipe" : "recipes"}
                      </span>
                    </div>
                    {col.description && (
                      <p className={styles.folderCardDesc}>{col.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recipe List / Grid / Compact Content */}
      {isEmptyFolderWithoutQuery && activeCollection ? (
        <div style={{ textAlign: "center", padding: "var(--space-8) var(--space-4)", color: "var(--muted)" }}>
          <p style={{ fontSize: "1.125rem", marginBottom: "var(--space-3)", color: "var(--text)" }}>
            Folder &ldquo;{activeCollection.name}&rdquo; is empty.
          </p>
          <p style={{ fontSize: "0.9375rem", marginBottom: "var(--space-4)" }}>
            Search or select recipes from your cookbook to add into this folder.
          </p>
          {onSaveFolderRecipes && (
            <Button
              variant="primary"
              icon={<PlusIcon width={16} height={16} />}
              onClick={(): void => setAddRecipesFolderId(activeCollection.id)}
            >
              Select or Search Recipes to Add
            </Button>
          )}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-8) var(--space-4)", color: "var(--muted)" }}>
          <p style={{ fontSize: "1.125rem", marginBottom: "var(--space-2)" }}>
            {matchingCollections.length > 0
              ? `No individual recipes matched, but found ${matchingCollections.length} folder${matchingCollections.length > 1 ? "s" : ""} above.`
              : "No recipes matched your search or filters."}
          </p>
          <Button
            variant="secondary"
            onClick={(): void => {
              setSearchQuery("");
              handleResetFilters();
              onSelectCollection?.(null);
              setOnlyFavorites(false);
            }}
          >
            Clear Search & Filters
          </Button>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? styles.grid
              : viewMode === "expanded"
              ? styles.expandedList
              : styles.list
          }
        >
          {filteredRecipes.map((recipe: Recipe): ReactElement => {
            const isSelected = selectedIds.has(recipe.id);
            const totalMinutes = (recipe.prepMinutes || 0) + (recipe.cookMinutes || 0);
            const hasAssignedFolders = recipe.collectionIds && recipe.collectionIds.length > 0;
            const placeholder = getCoursePlaceholder(recipe.courses?.[0]);

            if (viewMode === "list") {
              return (
                <div
                  key={recipe.id}
                  className={`${styles.listItem} ${isSelected ? styles.cardSelected : ""}`}
                  onClick={(): void => {
                    if (isMultiSelectMode) {
                      toggleSelectRecipe(recipe.id);
                    } else {
                      onSelectRecipe(recipe.id);
                    }
                  }}
                >
                  {isMultiSelectMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(): void => toggleSelectRecipe(recipe.id)}
                      onClick={(e: MouseEvent): void => e.stopPropagation()}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                  )}
                  {recipe.photoIds?.[0] ? (
                    <img
                      src={resolvePhotoUrl(recipe.photoIds[0])}
                      alt={recipe.title}
                      className={styles.listThumbnail}
                      onError={(e: MouseEvent<HTMLImageElement>): void => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className={styles.listThumbnail}
                      style={{ background: placeholder.gradient }}
                    >
                      <BookOpenIcon width={22} height={22} />
                    </div>
                  )}
                  <div className={styles.listBody}>
                    <h3 className={styles.cardTitle}>{recipe.title}</h3>
                    <div className={styles.cardMeta}>
                      {recipe.rating ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--accent)" }}>
                          <StarIcon fill="currentColor" width={13} height={13} />
                          {recipe.rating}
                        </span>
                      ) : null}
                      {totalMinutes > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <ClockIcon width={13} height={13} />
                          {formatTimeMinutes(totalMinutes)}
                        </span>
                      )}
                      {recipe.courses?.[0] && <span>{recipe.courses[0]}</span>}
                    </div>
                  </div>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<HeartIcon fill={recipe.favorite ? "var(--danger)" : "none"} width={16} height={16} />}
                    style={{ color: recipe.favorite ? "var(--danger)" : "var(--muted)" }}
                    aria-label={recipe.favorite ? "Remove favorite" : "Add favorite"}
                    onClick={(e: MouseEvent): void => {
                      e.stopPropagation();
                      onToggleFavorite(recipe.id);
                    }}
                  />
                </div>
              );
            }

            if (viewMode === "expanded") {
              return (
                <div
                  key={recipe.id}
                  className={`${styles.expandedItem} ${isSelected ? styles.cardSelected : ""}`}
                  onClick={(): void => {
                    if (isMultiSelectMode) {
                      toggleSelectRecipe(recipe.id);
                    } else {
                      onSelectRecipe(recipe.id);
                    }
                  }}
                >
                  {isMultiSelectMode && (
                    <div style={{ display: "flex", alignItems: "center", padding: "0 var(--space-2)" }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(): void => toggleSelectRecipe(recipe.id)}
                        onClick={(e: MouseEvent): void => e.stopPropagation()}
                        style={{ width: 18, height: 18, cursor: "pointer" }}
                      />
                    </div>
                  )}
                  {recipe.photoIds?.[0] ? (
                    <img
                      src={resolvePhotoUrl(recipe.photoIds[0])}
                      alt={recipe.title}
                      className={styles.expandedThumbnail}
                      onError={(e: MouseEvent<HTMLImageElement>): void => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <div
                      className={styles.expandedThumbnail}
                      style={{ background: placeholder.gradient }}
                    >
                      <BookOpenIcon width={36} height={36} />
                    </div>
                  )}

                  <div className={styles.expandedBody}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <h3 className={styles.cardTitle}>{recipe.title}</h3>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<HeartIcon fill={recipe.favorite ? "var(--danger)" : "none"} width={16} height={16} />}
                        style={{ color: recipe.favorite ? "var(--danger)" : "var(--muted)" }}
                        aria-label={recipe.favorite ? "Remove favorite" : "Add favorite"}
                        onClick={(e: MouseEvent): void => {
                          e.stopPropagation();
                          onToggleFavorite(recipe.id);
                        }}
                      />
                    </div>

                    {recipe.description && (
                      <p className={styles.expandedDescription}>{recipe.description}</p>
                    )}

                    <div className={styles.cardMeta} style={{ marginTop: "4px" }}>
                      {recipe.rating ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--accent)" }}>
                          <StarIcon fill="currentColor" width={13} height={13} />
                          {recipe.rating}
                        </span>
                      ) : null}
                      {totalMinutes > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                          <ClockIcon width={13} height={13} />
                          {formatTimeMinutes(totalMinutes)}
                        </span>
                      )}
                      {recipe.servings && <span>{recipe.servings} {recipe.servingsLabel || "servings"}</span>}
                      {recipe.courses?.[0] && <span>{recipe.courses[0]}</span>}
                    </div>

                    {hasAssignedFolders && (
                      <div className={styles.cardTags} style={{ marginTop: "4px" }}>
                        {recipe.collectionIds?.map((colId: string): ReactElement | null => {
                          const col = collections.find((c: Collection): boolean => c.id === colId);
                          if (!col) return null;
                          return (
                            <span key={col.id} className={styles.tagBadge}>
                              <FolderIcon width={11} height={11} />
                              {col.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={recipe.id}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ""}`}
                onClick={(): void => {
                  if (isMultiSelectMode) {
                    toggleSelectRecipe(recipe.id);
                  } else {
                    onSelectRecipe(recipe.id);
                  }
                }}
              >
                {recipe.photoIds?.[0] ? (
                  <img
                    src={resolvePhotoUrl(recipe.photoIds[0])}
                    alt={recipe.title}
                    className={styles.cardThumbnail}
                    onError={(e: MouseEvent<HTMLImageElement>): void => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className={styles.cardThumbnail}
                    style={{ background: placeholder.gradient }}
                  >
                    <BookOpenIcon width={44} height={44} />
                  </div>
                )}

                <div className={styles.cardBody}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <h3 className={styles.cardTitle}>{recipe.title}</h3>
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<HeartIcon fill={recipe.favorite ? "var(--danger)" : "none"} width={16} height={16} />}
                      style={{ color: recipe.favorite ? "var(--danger)" : "var(--muted)" }}
                      aria-label={recipe.favorite ? "Remove favorite" : "Add favorite"}
                      onClick={(e: MouseEvent): void => {
                        e.stopPropagation();
                        onToggleFavorite(recipe.id);
                      }}
                    />
                  </div>

                  <div className={styles.cardMeta}>
                    {recipe.rating ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--accent)" }}>
                        <StarIcon fill="currentColor" width={13} height={13} />
                        {recipe.rating}
                      </span>
                    ) : null}
                    {totalMinutes > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                        <ClockIcon width={13} height={13} />
                        {formatTimeMinutes(totalMinutes)}
                      </span>
                    )}
                    {recipe.courses?.[0] && <span>{recipe.courses[0]}</span>}
                  </div>

                  {hasAssignedFolders && viewMode === "grid" && (
                    <div className={styles.cardFolders}>
                      {recipe.collectionIds?.map((colId: string): ReactElement | null => {
                        const col = collections.find((c: Collection): boolean => c.id === colId);
                        if (!col) return null;
                        return (
                          <span key={colId} className={styles.cardFolderBadge}>
                            <FolderIcon width={11} height={11} />
                            {col.name}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile Floating Action Button for + New Recipe */}
      <button
        type="button"
        className={styles.mobileFab}
        onClick={onNewRecipe}
        aria-label="Create new recipe"
      >
        <PlusIcon width={24} height={24} />
      </button>

      {/* Multi-Select Action Bar */}
      {isMultiSelectMode && (
        <div className={styles.multiSelectBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
              {selectedIds.size} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectedIds.size === filteredRecipes.length ? handleDeselectAll : handleSelectAll}
            >
              {selectedIds.size === filteredRecipes.length ? "Deselect All" : "Select All"}
            </Button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {collections.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                icon={<FolderIcon width={14} height={14} />}
                onClick={(): void => setShowBatchFolderModal(true)}
                disabled={selectedIds.size === 0}
              >
                Folder
              </Button>
            )}
            <Button
              variant="danger"
              size="sm"
              icon={<TrashIcon width={14} height={14} />}
              onClick={(): void => setShowBatchDeleteConfirm(true)}
              disabled={selectedIds.size === 0}
            >
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(): void => {
                setSelectedIds(new Set());
                setIsMultiSelectMode(false);
              }}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Filters Modal */}
      <RecipeFilterModal
        isOpen={showFilterModal}
        onClose={(): void => setShowFilterModal(false)}
        sortBy={sortBy}
        onSortChange={setSortBy}
        selectedCourse={selectedCourse}
        onCourseChange={setSelectedCourse}
        availableCourses={coursesList}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        maxMinutes={maxMinutes}
        onMaxMinutesChange={setMaxMinutes}
        onlyHasPhoto={onlyHasPhoto}
        onOnlyHasPhotoChange={setOnlyHasPhoto}
        onResetFilters={handleResetFilters}
      />

      {/* Folder Manager Modal */}
      {showFolderModal && onSaveCollection && onDeleteCollection && (
        <FolderManagerModal
          collections={collections}
          recipes={recipes}
          onSaveCollection={onSaveCollection}
          onDeleteCollection={onDeleteCollection}
          onOpenCollection={(colId: string): void => {
            setOnlyFavorites(false);
            onSelectCollection?.(colId);
          }}
          onAddRecipesToCollection={
            onSaveFolderRecipes ? (colId: string): void => setAddRecipesFolderId(colId) : undefined
          }
          onClose={(): void => setShowFolderModal(false)}
        />
      )}

      {/* Add Recipes to Folder Modal */}
      {addRecipesTargetCollection && onSaveFolderRecipes && (
        <AddRecipesToFolderModal
          collection={addRecipesTargetCollection}
          recipes={recipes}
          onSaveFolderRecipes={onSaveFolderRecipes}
          onClose={(): void => setAddRecipesFolderId(null)}
        />
      )}

      {/* Batch Folder Assignment Modal */}
      {showBatchFolderModal && (
        <Dialog
          isOpen
          title={`Add ${selectedIds.size} Recipe(s) to Folder`}
          onClose={(): void => setShowBatchFolderModal(false)}
          maxWidth={400}
          footer={
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, width: "100%" }}>
              <Button
                type="button"
                variant="secondary"
                onClick={(): void => setShowBatchFolderModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleAssignBatchFolder}
                disabled={!batchTargetFolderId}
              >
                Assign
              </Button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
              Choose a folder for selected recipes:
            </label>
            <select
              value={batchTargetFolderId}
              onChange={(e: ChangeEvent<HTMLSelectElement>): void => setBatchTargetFolderId(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)"
              }}
            >
              <option value="">Select a folder...</option>
              {collections.map((col: Collection): ReactElement => (
                <option key={col.id} value={col.id}>
                  {col.name}
                </option>
              ))}
            </select>
          </div>
        </Dialog>
      )}

      {/* Batch Delete Confirmation */}
      {showBatchDeleteConfirm && (
        <ConfirmDialog
          isOpen
          title="Delete Recipes"
          message={`Are you sure you want to delete ${selectedIds.size} recipe(s)? This action cannot be undone.`}
          confirmLabel="Delete"
          isDanger
          onConfirm={handleConfirmBatchDelete}
          onCancel={(): void => setShowBatchDeleteConfirm(false)}
        />
      )}
    </div>
  );
};
