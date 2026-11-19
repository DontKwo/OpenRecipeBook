import {
  useState,
  useMemo,
  type FC,
  type ReactElement,
  type ChangeEvent
} from "react";
import type { Recipe, Collection } from "../../domain/recipe/types";
import { resolvePhotoUrl } from "../../domain/recipe/photoPipeline";
import {
  generateCookbookHtml,
  generateCookbookMarkdown,
  generateCookbookText,
  printCookbookDocument,
  type CookbookOptions
} from "../../domain/export/cookbookGenerator";
import {
  CloseIcon,
  PrinterIcon,
  DownloadIcon,
  ChevronUp,
  ChevronDown,
  FolderIcon
} from "../../ui/icons";
import { Button, IconButton } from "../../ui/Button";
import { useToast } from "../../ui/Toast";

export interface CookbookBuilderModalProps {
  recipes: Recipe[];
  collections: Collection[];
  initialCollectionId?: string;
  initialRecipeId?: string;
  onClose: () => void;
}

export const CookbookBuilderModal: FC<CookbookBuilderModalProps> = ({
  recipes,
  collections,
  initialCollectionId,
  initialRecipeId,
  onClose
}): ReactElement => {
  const { showToast } = useToast();

  const isSingleRecipeMode = Boolean(initialRecipeId);
  const singleRecipe = useMemo(
    () => (initialRecipeId ? recipes.find((r) => r.id === initialRecipeId) : undefined),
    [recipes, initialRecipeId]
  );
  const initialFolder = collections.find((c) => c.id === initialCollectionId);

  const [activeFolderId, setActiveFolderId] = useState<string>(
    initialRecipeId ? "single" : initialCollectionId || "all"
  );
  const [bookTitle, setBookTitle] = useState<string>(() => {
    if (singleRecipe) return singleRecipe.title;
    if (initialFolder) return `${initialFolder.name} Cookbook`;
    return "My Recipe Collection";
  });
  const [bookSubtitle, setBookSubtitle] = useState<string>(() => {
    if (singleRecipe) return singleRecipe.description || "";
    return "Favorite kitchen recipes and traditions";
  });
  const [bookAuthor, setBookAuthor] = useState<string>("The Home Chef");

  // Selection & Ordering
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialRecipeId) {
      return new Set([initialRecipeId]);
    }
    if (initialCollectionId) {
      const folderRecs = recipes.filter((r) => r.collectionIds?.includes(initialCollectionId));
      return new Set(folderRecs.map((r) => r.id));
    }
    return new Set(recipes.map((r) => r.id));
  });

  const [orderedRecipeIds, setOrderedRecipeIds] = useState<string[]>(() => {
    if (initialRecipeId) {
      return [initialRecipeId];
    }
    if (initialCollectionId) {
      return recipes
        .filter((r) => r.collectionIds?.includes(initialCollectionId))
        .map((r) => r.id);
    }
    return recipes.map((r) => r.id);
  });

  // Customization Options
  const [includeCover, setIncludeCover] = useState<boolean>(!isSingleRecipeMode);
  const [includeToc, setIncludeToc] = useState<boolean>(!isSingleRecipeMode);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [includeNutrition, setIncludeNutrition] = useState<boolean>(true);
  const [includePhotos, setIncludePhotos] = useState<boolean>(true);
  const [twoColumnLayout, setTwoColumnLayout] = useState<boolean>(true);
  const [pageBreakAfterRecipe, setPageBreakAfterRecipe] = useState<boolean>(!isSingleRecipeMode);
  const [fontSize, setFontSize] = useState<"compact" | "standard" | "large">("standard");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const handleFolderChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const fId = e.target.value;
    setActiveFolderId(fId);

    if (fId === "all") {
      setBookTitle("My Recipe Collection");
      const allIds = recipes.map((r) => r.id);
      setSelectedIds(new Set(allIds));
      setOrderedRecipeIds(allIds);
      showToast(`Selected all ${recipes.length} recipes`);
    } else {
      const folder = collections.find((c) => c.id === fId);
      if (folder) {
        setBookTitle(`${folder.name} Cookbook`);
        const folderRecs = recipes.filter((r) => r.collectionIds?.includes(fId));
        const fIds = folderRecs.map((r) => r.id);
        setSelectedIds(new Set(fIds));
        setOrderedRecipeIds(fIds);
        showToast(`Selected ${fIds.length} recipes from "${folder.name}"`);
      }
    }
  };

  const toggleRecipe = (id: string): void => {
    const nextSet = new Set(selectedIds);
    if (nextSet.has(id)) {
      nextSet.delete(id);
      setOrderedRecipeIds((prev) => prev.filter((rId) => rId !== id));
    } else {
      nextSet.add(id);
      setOrderedRecipeIds((prev) => [...prev, id]);
    }
    setSelectedIds(nextSet);
  };

  const selectAll = (): void => {
    const allIds = recipes.map((r) => r.id);
    setSelectedIds(new Set(allIds));
    setOrderedRecipeIds(allIds);
  };

  const selectNone = (): void => {
    setSelectedIds(new Set());
    setOrderedRecipeIds([]);
  };

  const moveRecipe = (index: number, direction: "up" | "down"): void => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedRecipeIds.length) return;
    const next = [...orderedRecipeIds];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setOrderedRecipeIds(next);
  };

  const sortAlphabetical = (): void => {
    const sorted = [...orderedRecipeIds].sort((aId, bId) => {
      const a = recipes.find((r) => r.id === aId)?.title || "";
      const b = recipes.find((r) => r.id === bId)?.title || "";
      return a.localeCompare(b);
    });
    setOrderedRecipeIds(sorted);
    showToast("Sorted recipes A-Z");
  };

  const sortCourse = (): void => {
    const sorted = [...orderedRecipeIds].sort((aId, bId) => {
      const a = recipes.find((r) => r.id === aId)?.courses[0] || "Z";
      const b = recipes.find((r) => r.id === bId)?.courses[0] || "Z";
      return a.localeCompare(b);
    });
    setOrderedRecipeIds(sorted);
    showToast("Sorted recipes by course");
  };

  const selectedRecipes: Recipe[] = useMemo(() => {
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const list: Recipe[] = [];
    for (const id of orderedRecipeIds) {
      if (selectedIds.has(id)) {
        const found = recipeMap.get(id);
        if (found) list.push(found);
      }
    }
    return list;
  }, [recipes, orderedRecipeIds, selectedIds]);

  const currentOptions: CookbookOptions = useMemo(
    () => ({
      title: bookTitle.trim() || "My Cookbook",
      subtitle: bookSubtitle.trim(),
      author: bookAuthor.trim(),
      includeCover,
      includeToc,
      includeNotes,
      includeNutrition,
      includePhotos,
      twoColumnLayout,
      pageBreakAfterRecipe,
      fontSize
    }),
    [
      bookTitle,
      bookSubtitle,
      bookAuthor,
      includeCover,
      includeToc,
      includeNotes,
      includeNutrition,
      includePhotos,
      twoColumnLayout,
      pageBreakAfterRecipe,
      fontSize
    ]
  );

  const handlePrint = (): void => {
    if (selectedRecipes.length === 0) {
      showToast("Select at least 1 recipe to print");
      return;
    }
    printCookbookDocument(selectedRecipes, currentOptions);
  };

  const handleSavePdf = (): void => {
    if (selectedRecipes.length === 0) {
      showToast("Select at least 1 recipe to save as PDF");
      return;
    }
    showToast("Print dialog opening: In destination, choose 'Save as PDF'");
    printCookbookDocument(selectedRecipes, currentOptions);
  };

  const handleDownload = (format: "html" | "md" | "txt"): void => {
    if (selectedRecipes.length === 0) {
      showToast("Select at least 1 recipe to export");
      return;
    }
    let content = "";
    let mimeType = "";
    let ext = "";

    if (format === "html") {
      content = generateCookbookHtml(selectedRecipes, currentOptions);
      mimeType = "text/html;charset=utf-8";
      ext = "html";
    } else if (format === "md") {
      content = generateCookbookMarkdown(selectedRecipes, currentOptions);
      mimeType = "text/markdown;charset=utf-8";
      ext = "md";
    } else {
      content = generateCookbookText(selectedRecipes, currentOptions);
      mimeType = "text/plain;charset=utf-8";
      ext = "txt";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const slug = currentOptions.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    link.href = url;
    link.download = `${slug}-cookbook.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${currentOptions.title} as .${ext}`);
  };

  const visibleRecipeIds = useMemo(() => {
    if (!searchFilter.trim()) return orderedRecipeIds;
    const q = searchFilter.toLowerCase().trim();
    return orderedRecipeIds.filter((rId) => {
      const r = recipes.find((item) => item.id === rId);
      return r && r.title.toLowerCase().includes(q);
    });
  }, [orderedRecipeIds, recipes, searchFilter]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "var(--space-4)"
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Cookbook Builder & Folder Printing"
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "var(--radius-lg)",
          maxWidth: "1250px",
          width: "100%",
          height: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
          border: "1px solid var(--border)"
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "var(--space-3) var(--space-5)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface-alt)",
            flexWrap: "wrap",
            gap: "var(--space-2)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <FolderIcon width={22} height={22} style={{ color: "var(--accent)" }} />
            <div>
              <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.25rem", margin: 0 }}>
                {isSingleRecipeMode ? "Recipe Print & PDF Studio" : "Cookbook & Folder Print Studio"}
              </h2>
              <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
                {isSingleRecipeMode
                  ? "Customize layout, typography, and preview, then print or export to PDF"
                  : "Assemble folders into print-ready books, reorder recipes, customize layout, and export to PDF"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center", flexWrap: "wrap" }}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              icon={<PrinterIcon width={16} height={16} />}
              onClick={handlePrint}
            >
              Print ({selectedRecipes.length})
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={<DownloadIcon width={15} height={15} />}
              onClick={handleSavePdf}
            >
              Save as PDF
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(): void => handleDownload("html")}
            >
              HTML
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(): void => handleDownload("md")}
            >
              Markdown
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={(): void => handleDownload("txt")}
            >
              Text
            </Button>

            <IconButton
              variant="ghost"
              size="sm"
              icon={<CloseIcon width={18} height={18} />}
              aria-label="Close"
              onClick={onClose}
            />
          </div>
        </div>

        {/* Studio Body: Left Configuration Panel, Right Document Preview */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Settings & Reordering Sidebar */}
          <div
            style={{
              width: "380px",
              minWidth: "320px",
              borderRight: "1px solid var(--border)",
              padding: "var(--space-4)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
              background: "var(--surface)"
            }}
          >
            {/* Folder selection */}
            <div>
              <label
                htmlFor="cookbook-folder"
                style={{ display: "block", fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}
              >
                Folder / Source
              </label>
              <select
                id="cookbook-folder"
                value={activeFolderId}
                onChange={handleFolderChange}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  fontWeight: 600
                }}
              >
                <option value="all">All Recipes ({recipes.length})</option>
                {collections.map((col) => {
                  const count = recipes.filter((r) => r.collectionIds?.includes(col.id)).length;
                  return (
                    <option key={col.id} value={col.id}>
                      {col.name} ({count} recipes)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Book Details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                htmlFor="book-title-input"
                style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase" }}
              >
                Book Title & Author
              </label>
              <input
                id="book-title-input"
                type="text"
                placeholder="Book title..."
                value={bookTitle}
                onChange={(e): void => setBookTitle(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--text)",
                  outline: "none"
                }}
              />
              <input
                type="text"
                placeholder="Subtitle (e.g. Holiday traditions)..."
                value={bookSubtitle}
                onChange={(e): void => setBookSubtitle(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--text)",
                  outline: "none",
                  fontSize: "0.875rem"
                }}
              />
              <input
                type="text"
                placeholder="Author / Chef name..."
                value={bookAuthor}
                onChange={(e): void => setBookAuthor(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--text)",
                  outline: "none",
                  fontSize: "0.875rem"
                }}
              />
            </div>

            {/* Recipe Order & Reordering Section */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase" }}>
                  Recipe Order ({selectedRecipes.length})
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={sortAlphabetical}
                    style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                  >
                    A-Z
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={sortCourse}
                    style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                  >
                    Course
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectNone}
                    style={{ padding: "2px 6px", fontSize: "0.75rem" }}
                  >
                    None
                  </Button>
                </div>
              </div>

              {/* Search candidate filter */}
              <input
                type="text"
                placeholder="Filter recipes..."
                value={searchFilter}
                onChange={(e): void => setSearchFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  fontSize: "0.8125rem",
                  marginBottom: 6,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface-alt)",
                  color: "var(--text)",
                  outline: "none",
                  boxSizing: "border-box"
                }}
              />

              <div
                style={{
                  maxHeight: "220px",
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 2
                }}
              >
                {visibleRecipeIds.map((rId) => {
                  const r = recipes.find((item) => item.id === rId);
                  if (!r) return null;
                  const isChecked = selectedIds.has(rId);
                  const realIdx = orderedRecipeIds.indexOf(rId);

                  return (
                    <div
                      key={rId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 6px",
                        borderRadius: "var(--radius-sm)",
                        background: isChecked ? "var(--surface-alt)" : "transparent",
                        borderBottom: "1px solid var(--border-subtle)",
                        fontSize: "0.8125rem"
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(): void => toggleRecipe(rId)}
                      />
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          textDecoration: isChecked ? "none" : "line-through",
                          opacity: isChecked ? 1 : 0.5
                        }}
                      >
                        {realIdx + 1}. {r.title}
                      </span>

                      <div style={{ display: "flex", gap: 2 }}>
                        <button
                          type="button"
                          disabled={realIdx <= 0}
                          onClick={(): void => moveRecipe(realIdx, "up")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--muted)",
                            cursor: realIdx <= 0 ? "default" : "pointer",
                            opacity: realIdx <= 0 ? 0.25 : 0.8,
                            padding: 2
                          }}
                          aria-label={`Move ${r.title} up`}
                        >
                          <ChevronUp width={14} height={14} />
                        </button>
                        <button
                          type="button"
                          disabled={realIdx < 0 || realIdx >= orderedRecipeIds.length - 1}
                          onClick={(): void => moveRecipe(realIdx, "down")}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--muted)",
                            cursor: realIdx < 0 || realIdx >= orderedRecipeIds.length - 1 ? "default" : "pointer",
                            opacity: realIdx < 0 || realIdx >= orderedRecipeIds.length - 1 ? 0.25 : 0.8,
                            padding: 2
                          }}
                          aria-label={`Move ${r.title} down`}
                        >
                          <ChevronDown width={14} height={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Layout & Print Customization Options */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-3)" }}>
              <span style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Layout & Content Options
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.875rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e): void => setIncludeCover(e.target.checked)}
                  />
                  Cover Page
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeToc}
                    onChange={(e): void => setIncludeToc(e.target.checked)}
                  />
                  Table of Contents
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includePhotos}
                    onChange={(e): void => setIncludePhotos(e.target.checked)}
                  />
                  Include Recipe Photos
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e): void => setIncludeNotes(e.target.checked)}
                  />
                  Include Cook&apos;s Notes
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={includeNutrition}
                    onChange={(e): void => setIncludeNutrition(e.target.checked)}
                  />
                  Include Nutrition Facts
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={twoColumnLayout}
                    onChange={(e): void => setTwoColumnLayout(e.target.checked)}
                  />
                  2-Column Layout (Ingredients Left)
                </label>

                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={pageBreakAfterRecipe}
                    onChange={(e): void => setPageBreakAfterRecipe(e.target.checked)}
                  />
                  Start Each Recipe on Fresh Page
                </label>

                <div style={{ marginTop: 4 }}>
                  <label htmlFor="cookbook-font-size" style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)", marginBottom: 2 }}>
                    Typography Size
                  </label>
                  <select
                    id="cookbook-font-size"
                    value={fontSize}
                    onChange={(e): void => setFontSize(e.target.value as "compact" | "standard" | "large")}
                    style={{
                      width: "100%",
                      padding: "6px 8px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--surface-alt)",
                      color: "var(--text)",
                      fontSize: "0.8125rem"
                    }}
                  >
                    <option value="standard">Standard Print (11pt)</option>
                    <option value="large">Large Print / Accessible (13pt)</option>
                    <option value="compact">Compact / Paper Saver (9.5pt)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Document Preview Pane */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-8)",
              background: "var(--bg)",
              display: "flex",
              justifyContent: "center"
            }}
          >
            <div
              style={{
                maxWidth: "760px",
                width: "100%",
                background: "#ffffff",
                color: "#1c2826",
                padding: "var(--space-8)",
                boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
                borderRadius: "4px",
                border: "1px solid rgba(0,0,0,0.1)",
                boxSizing: "border-box",
                fontFamily: "Georgia, 'Times New Roman', serif"
              }}
            >
              {selectedRecipes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#666" }}>
                  <h3 style={{ margin: "0 0 8px 0" }}>No Recipes Selected</h3>
                  <p style={{ margin: 0, fontSize: "0.875rem" }}>
                    Select at least one recipe in the sidebar to preview and print your document.
                  </p>
                </div>
              ) : (
                <>
                  {/* Preview Cover */}
                  {includeCover && (
                    <div
                      style={{
                        minHeight: "360px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        borderBottom: "2px dashed #ccc",
                        paddingBottom: "var(--space-8)",
                        marginBottom: "var(--space-8)"
                      }}
                    >
                      <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.15em", color: "#777" }}>
                        OpenRecipeBook Collection
                      </span>
                      <h1 style={{ fontFamily: "Georgia, serif", fontSize: "2.4rem", margin: "12px 0 6px 0", color: "#1c3320" }}>
                        {currentOptions.title}
                      </h1>
                      {currentOptions.subtitle && (
                        <p style={{ fontStyle: "italic", color: "#555", margin: "0 0 16px 0" }}>
                          {currentOptions.subtitle}
                        </p>
                      )}
                      <div style={{ width: "60px", height: "2px", background: "#ca6531", margin: "12px auto" }} />
                      {currentOptions.author && (
                        <p style={{ fontWeight: 600, fontSize: "0.9375rem", margin: "0 0 4px 0", color: "#333" }}>
                          Curated by {currentOptions.author}
                        </p>
                      )}
                      <p style={{ fontSize: "0.8125rem", color: "#888", margin: 0 }}>
                        {selectedRecipes.length} Recipes &bull; Ready to Print
                      </p>
                    </div>
                  )}

                  {/* Preview Table of Contents */}
                  {includeToc && (
                    <div style={{ borderBottom: "1px solid #ddd", paddingBottom: "var(--space-6)", marginBottom: "var(--space-6)" }}>
                      <h3 style={{ fontFamily: "Georgia, serif", fontSize: "1.3rem", margin: "0 0 12px 0", color: "#1c3320" }}>
                        Table of Contents
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {selectedRecipes.map((r, idx) => (
                          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                            <span>
                              <strong>{idx + 1}.</strong> {r.title}
                            </span>
                            <span style={{ color: "#777", fontStyle: "italic" }}>
                              {r.courses.join(", ") || "General"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview Recipe Pages */}
                  {selectedRecipes.map((r, rIdx) => {
                    const photoUrl = resolvePhotoUrl(r.photoIds?.[0]);

                    return (
                      <article
                        key={r.id}
                        style={{
                          paddingBottom: "var(--space-8)",
                          marginBottom: "var(--space-8)",
                          borderBottom: rIdx < selectedRecipes.length - 1 ? "1px solid #eee" : "none"
                        }}
                      >
                        <h2 style={{ fontFamily: "Georgia, serif", fontSize: "1.6rem", margin: "0 0 4px 0", color: "#1c3320" }}>
                          {r.title}
                        </h2>
                        {r.description && (
                          <p style={{ fontStyle: "italic", color: "#555", fontSize: "0.9rem", margin: "0 0 8px 0" }}>
                            {r.description}
                          </p>
                        )}
                        <div style={{ fontSize: "0.8125rem", color: "#666", marginBottom: "12px", borderTop: "1px solid #eee", borderBottom: "1px solid #eee", padding: "4px 0" }}>
                          <span>Servings: {r.servings}</span>
                          {r.prepMinutes && <span> &bull; Prep: {r.prepMinutes}m</span>}
                          {r.cookMinutes && <span> &bull; Cook: {r.cookMinutes}m</span>}
                          {r.courses.length > 0 && <span> &bull; {r.courses.join(", ")}</span>}
                        </div>

                        {includePhotos && photoUrl && (
                          <div style={{ textAlign: "center", margin: "10px 0 14px" }}>
                            <img
                              src={photoUrl}
                              alt={r.title}
                              style={{ maxHeight: "160px", maxWidth: "100%", objectFit: "cover", borderRadius: "4px" }}
                            />
                          </div>
                        )}

                        <div
                          style={{
                            display: twoColumnLayout ? "grid" : "flex",
                            gridTemplateColumns: twoColumnLayout ? "1fr 1.3fr" : undefined,
                            flexDirection: twoColumnLayout ? undefined : "column",
                            gap: "var(--space-6)"
                          }}
                        >
                          <div>
                            <h4 style={{ textTransform: "uppercase", fontSize: "0.8125rem", letterSpacing: "0.05em", color: "#263e28", margin: "0 0 6px 0" }}>
                              Ingredients
                            </h4>
                            {r.ingredientGroups.map((g, gIdx) => (
                              <div key={gIdx} style={{ marginBottom: 6 }}>
                                {g.heading && <strong style={{ fontSize: "0.8125rem" }}>{g.heading}</strong>}
                                <ul style={{ paddingLeft: "18px", margin: "2px 0 0 0", fontSize: "0.875rem" }}>
                                  {g.items.map((i) => (
                                    <li key={i.id} style={{ marginBottom: 2 }}>{i.raw}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>

                          <div>
                            <h4 style={{ textTransform: "uppercase", fontSize: "0.8125rem", letterSpacing: "0.05em", color: "#263e28", margin: "0 0 6px 0" }}>
                              Directions
                            </h4>
                            {r.directionGroups.map((g, gIdx) => (
                              <div key={gIdx} style={{ marginBottom: 6 }}>
                                {g.heading && <strong style={{ fontSize: "0.8125rem" }}>{g.heading}</strong>}
                                <ol style={{ paddingLeft: "18px", margin: "2px 0 0 0", fontSize: "0.875rem" }}>
                                  {g.steps.map((s) => (
                                    <li key={s.id} style={{ marginBottom: 4 }}>
                                      {s.text}
                                      {s.note && <em style={{ color: "#666" }}> ({s.note})</em>}
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            ))}
                          </div>
                        </div>

                        {includeNotes && r.notes && (
                          <div style={{ marginTop: "12px", paddingTop: "8px", borderTop: "1px dashed #ddd", fontSize: "0.85rem", color: "#333" }}>
                            <strong>Cook&apos;s Notes:</strong> {r.notes}
                          </div>
                        )}

                        {includeNutrition && r.nutrition && (
                          <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "#666", borderTop: "1px solid #eee", paddingTop: "4px" }}>
                            <strong>Nutrition:</strong>{" "}
                            {Object.entries(r.nutrition).map(([k, v]) => `${k}: ${v}`).join(" | ")}
                          </div>
                        )}

                        {pageBreakAfterRecipe && rIdx < selectedRecipes.length - 1 && (
                          <div style={{ margin: "24px 0 12px", textAlign: "center", borderTop: "1px dashed #ccc", position: "relative" }}>
                            <span style={{ position: "relative", top: "-10px", background: "#ffffff", padding: "0 10px", fontSize: "0.75rem", color: "#999", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                              Page Break
                            </span>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
