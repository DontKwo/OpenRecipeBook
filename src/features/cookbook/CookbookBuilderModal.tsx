import { useState, useMemo, type FC, type ReactElement } from "react";
import type { Recipe, Collection } from "../../domain/recipe/types";
import { CloseIcon, PrinterIcon } from "../../ui/icons";

export interface CookbookBuilderModalProps {
  recipes: Recipe[];
  collections: Collection[];
  onClose: () => void;
}

export const CookbookBuilderModal: FC<CookbookBuilderModalProps> = ({
  recipes,
  collections,
  onClose
}): ReactElement => {
  const [bookTitle, setBookTitle] = useState<string>("Family Recipe Cookbook");
  const [bookSubtitle, setBookSubtitle] = useState<string>("Favorite recipes and kitchen traditions");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(recipes.map((r) => r.id)));
  const [includeCover, setIncludeCover] = useState<boolean>(true);
  const [includeToc, setIncludeToc] = useState<boolean>(true);
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [filterCourse, setFilterCourse] = useState<string>("All");
  const [filterCollection, setFilterCollection] = useState<string>("All");

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => {
      const matchCourse = filterCourse === "All" || r.courses.includes(filterCourse);
      const matchCollection = filterCollection === "All" || r.collectionIds.includes(filterCollection);
      return matchCourse && matchCollection;
    });
  }, [recipes, filterCourse, filterCollection]);

  const selectedRecipes = useMemo(() => {
    return recipes.filter((r) => selectedIds.has(r.id));
  }, [recipes, selectedIds]);

  const toggleRecipe = (id: string): void => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const selectAll = (): void => {
    setSelectedIds(new Set(recipes.map((r) => r.id)));
  };

  const selectNone = (): void => {
    setSelectedIds(new Set());
  };

  const handlePrint = (): void => {
    window.print();
  };

  const handleExportHtml = (): void => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${bookTitle}</title>
  <style>
    body { font-family: Georgia, serif; line-height: 1.5; color: #222; margin: 40px; }
    h1, h2, h3 { font-family: Georgia, serif; }
    .cover { text-align: center; padding-top: 100px; page-break-after: always; break-after: page; }
    .toc { page-break-after: always; break-after: page; margin-bottom: 40px; }
    .recipe { page-break-after: always; break-after: page; margin-bottom: 40px; }
    .meta { color: #666; font-size: 0.95em; margin-bottom: 16px; }
    .grid { display: flex; gap: 32px; }
    .col { flex: 1; }
    ul, ol { padding-left: 20px; }
    li { margin-bottom: 6px; }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  ${includeCover ? `
  <div class="cover">
    <h1 style="font-size: 3rem; margin-bottom: 8px;">${bookTitle}</h1>
    <p style="font-size: 1.3rem; color: #555;">${bookSubtitle}</p>
    <p style="margin-top: 60px; font-size: 0.95rem; color: #888;">${selectedRecipes.length} recipes included</p>
  </div>` : ""}

  ${includeToc ? `
  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>
      ${selectedRecipes.map((r) => `<li><strong>${r.title}</strong> (${r.courses.join(", ") || "General"})</li>`).join("")}
    </ol>
  </div>` : ""}

  ${selectedRecipes.map((r) => `
  <div class="recipe">
    <h2>${r.title}</h2>
    <div class="meta">
      ${r.courses.join(", ") ? `Course: ${r.courses.join(", ")} | ` : ""}
      Servings: ${r.servings}
      ${r.prepMinutes ? ` | Prep: ${r.prepMinutes} min` : ""}
      ${r.cookMinutes ? ` | Cook: ${r.cookMinutes} min` : ""}
    </div>
    ${r.description ? `<p style="font-style: italic;">${r.description}</p>` : ""}
    <div class="grid">
      <div class="col">
        <h3>Ingredients</h3>
        ${r.ingredientGroups.map((g) => `
          ${g.heading ? `<h4>${g.heading}</h4>` : ""}
          <ul>${g.items.map((i) => `<li>${i.raw}</li>`).join("")}</ul>
        `).join("")}
      </div>
      <div class="col">
        <h3>Directions</h3>
        ${r.directionGroups.map((g) => `
          ${g.heading ? `<h4>${g.heading}</h4>` : ""}
          <ol>${g.steps.map((s) => `<li>${s.text}</li>`).join("")}</ol>
        `).join("")}
      </div>
    </div>
    ${includeNotes && r.notes ? `<div style="margin-top: 20px;"><h3>Notes</h3><p>${r.notes}</p></div>` : ""}
  </div>
  `).join("")}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${bookTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "var(--space-4)"
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          borderRadius: "var(--radius-lg)",
          maxWidth: "1100px",
          width: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden"
        }}
      >
        {/* Modal Header */}
        <div
          className="no-print"
          style={{
            padding: "var(--space-4) var(--space-6)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--surface)"
          }}
        >
          <div>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem" }}>
              Cookbook Builder
            </h2>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              Assemble recipes into a printable book or PDF document with page breaks
            </div>
          </div>
          <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                border: "none",
                padding: "8px 18px",
                borderRadius: "var(--radius-full)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <PrinterIcon width={16} height={16} /> Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={handleExportHtml}
              style={{
                background: "var(--surface)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                padding: "8px 16px",
                borderRadius: "var(--radius-full)",
                fontWeight: 500,
                fontSize: "0.9rem",
                cursor: "pointer"
              }}
            >
              Export HTML
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                padding: "8px",
                cursor: "pointer",
                color: "var(--muted)"
              }}
              aria-label="Close"
            >
              <CloseIcon width={20} height={20} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split between controls & book preview */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Controls Sidebar */}
          <div
            className="no-print"
            style={{
              width: "340px",
              borderRight: "1px solid var(--border)",
              padding: "var(--space-4)",
              overflowY: "auto",
              background: "var(--surface)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)"
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Book Title
              </label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px" }}>
                Subtitle
              </label>
              <input
                type="text"
                value={bookSubtitle}
                onChange={(e) => setBookSubtitle(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                Sections to Include
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "0.9rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={includeCover}
                    onChange={(e) => setIncludeCover(e.target.checked)}
                  />
                  Cover Page
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={includeToc}
                    onChange={(e) => setIncludeToc(e.target.checked)}
                  />
                  Table of Contents
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                  />
                  Cook's Notes
                </label>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  Recipes ({selectedIds.size} of {recipes.length})
                </label>
                <div style={{ display: "flex", gap: "6px", fontSize: "0.8rem" }}>
                  <button
                    type="button"
                    onClick={selectAll}
                    style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", padding: 0 }}
                  >
                    All
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={selectNone}
                    style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
                  >
                    None
                  </button>
                </div>
              </div>

              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px",
                  marginBottom: "8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  fontSize: "0.85rem"
                }}
              >
                <option value="All">All Courses</option>
                <option value="Breakfast">Breakfast</option>
                <option value="Lunch">Lunch</option>
                <option value="Dinner">Dinner</option>
                <option value="Dessert">Dessert</option>
                <option value="Snack">Snack</option>
                <option value="Drink">Drink</option>
              </select>

              {collections.length > 0 && (
                <select
                  value={filterCollection}
                  onChange={(e) => setFilterCollection(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px",
                    marginBottom: "8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border)",
                    fontSize: "0.85rem"
                  }}
                >
                  <option value="All">All Collections</option>
                  {collections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}

              <div
                style={{
                  maxHeight: "260px",
                  overflowY: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "4px"
                }}
              >
                {filteredRecipes.map((r) => (
                  <label
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "6px 8px",
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-subtle)"
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r.id)}
                      onChange={() => toggleRecipe(r.id)}
                    />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Document Preview Pane */}
          <div
            id="cookbook-print-area"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-8)",
              background: "var(--bg)"
            }}
          >
            {/* Cover Page */}
            {includeCover && (
              <div
                className="page-break"
                style={{
                  minHeight: "450px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  border: "2px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-8)",
                  marginBottom: "var(--space-8)",
                  background: "var(--surface)"
                }}
              >
                <h1
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "2.8rem",
                    marginBottom: "var(--space-3)",
                    color: "var(--text)"
                  }}
                >
                  {bookTitle}
                </h1>
                <p style={{ fontSize: "1.2rem", color: "var(--muted)", maxWidth: "500px" }}>
                  {bookSubtitle}
                </p>
                <div style={{ marginTop: "var(--space-8)", fontSize: "0.9rem", color: "var(--muted)" }}>
                  {selectedRecipes.length} curated recipes
                </div>
              </div>
            )}

            {/* Table of Contents */}
            {includeToc && (
              <div
                className="page-break"
                style={{
                  padding: "var(--space-6)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-8)",
                  background: "var(--surface)"
                }}
              >
                <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", marginBottom: "var(--space-4)" }}>
                  Table of Contents
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {selectedRecipes.map((r, index) => (
                    <div
                      key={r.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingBottom: "4px",
                        borderBottom: "1px dotted var(--border)",
                        fontSize: "0.95rem"
                      }}
                    >
                      <span>
                        {index + 1}. {r.title}
                      </span>
                      <span style={{ color: "var(--muted)" }}>
                        {r.courses.join(", ") || "General"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe Pages */}
            {selectedRecipes.map((r) => (
              <div
                key={r.id}
                className="page-break avoid-break"
                style={{
                  padding: "var(--space-6)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "var(--space-8)",
                  background: "var(--surface)"
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "2rem",
                    marginBottom: "var(--space-2)"
                  }}
                >
                  {r.title}
                </h2>
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-4)",
                    color: "var(--muted)",
                    fontSize: "0.9rem",
                    marginBottom: "var(--space-4)",
                    paddingBottom: "var(--space-3)",
                    borderBottom: "1px solid var(--border)"
                  }}
                >
                  <span>Servings: {r.servings}</span>
                  {r.prepMinutes && <span>Prep: {r.prepMinutes} min</span>}
                  {r.cookMinutes && <span>Cook: {r.cookMinutes} min</span>}
                  {r.courses.length > 0 && <span>Course: {r.courses.join(", ")}</span>}
                </div>

                {r.description && (
                  <p style={{ fontStyle: "italic", marginBottom: "var(--space-4)", color: "var(--muted)" }}>
                    {r.description}
                  </p>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-6)" }}>
                  {/* Ingredients */}
                  <div>
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "var(--space-3)"
                      }}
                    >
                      Ingredients
                    </h3>
                    {r.ingredientGroups.map((group, gIdx) => (
                      <div key={gIdx} style={{ marginBottom: "var(--space-3)" }}>
                        {group.heading && (
                          <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>
                            {group.heading}
                          </div>
                        )}
                        <ul style={{ paddingLeft: "20px", margin: 0 }}>
                          {group.items.map((item) => (
                            <li key={item.id} style={{ marginBottom: "4px", fontSize: "0.95rem" }}>
                              {item.raw}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Directions */}
                  <div>
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        marginBottom: "var(--space-3)"
                      }}
                    >
                      Directions
                    </h3>
                    {r.directionGroups.map((group, gIdx) => (
                      <div key={gIdx} style={{ marginBottom: "var(--space-3)" }}>
                        {group.heading && (
                          <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>
                            {group.heading}
                          </div>
                        )}
                        <ol style={{ paddingLeft: "20px", margin: 0 }}>
                          {group.steps.map((step) => (
                            <li key={step.id} style={{ marginBottom: "8px", fontSize: "0.95rem" }}>
                              {step.text}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>

                {includeNotes && r.notes && (
                  <div
                    style={{
                      marginTop: "var(--space-4)",
                      paddingTop: "var(--space-3)",
                      borderTop: "1px solid var(--border)",
                      fontSize: "0.9rem"
                    }}
                  >
                    <strong>Cook's Notes:</strong> {r.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
