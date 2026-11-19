import type { Recipe } from "../recipe/types";
import { resolvePhotoUrl } from "../recipe/photoPipeline";

export interface CookbookOptions {
  title: string;
  subtitle: string;
  author: string;
  includeCover: boolean;
  includeToc: boolean;
  includeNotes: boolean;
  includeNutrition: boolean;
  includePhotos: boolean;
  twoColumnLayout: boolean;
  pageBreakAfterRecipe: boolean;
  fontSize: "compact" | "standard" | "large";
}

export function generateCookbookHtml(
  recipes: Recipe[],
  options: CookbookOptions
): string {
  const fontPt =
    options.fontSize === "large" ? "13pt" : options.fontSize === "compact" ? "9.5pt" : "11pt";

  const coverHtml = options.includeCover
    ? `<div class="cover page-break">
        <div class="cover-inner">
          <div class="cover-badge">OpenRecipeBook Collection</div>
          <h1 class="cover-title">${options.title}</h1>
          ${options.subtitle ? `<p class="cover-subtitle">${options.subtitle}</p>` : ""}
          <div class="cover-divider"></div>
          ${options.author ? `<p class="cover-author">Curated by ${options.author}</p>` : ""}
          <p class="cover-meta">${recipes.length} Recipes &bull; ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long" })}</p>
        </div>
      </div>`
    : "";

  const tocHtml = options.includeToc
    ? `<div class="toc page-break">
        <h2 class="toc-title">Table of Contents</h2>
        <div class="toc-list">
          ${recipes
            .map(
              (r, idx) => `
            <div class="toc-item">
              <span class="toc-num">${idx + 1}.</span>
              <span class="toc-name"><strong>${r.title}</strong></span>
              <span class="toc-dots"></span>
              <span class="toc-course">${r.courses.join(", ") || "General"}</span>
            </div>`
            )
            .join("")}
        </div>
      </div>`
    : "";

  const recipesHtml = recipes
    .map((r) => {
      const metaParts: string[] = [];
      if (r.servings) metaParts.push(`Yield: ${r.servings} servings`);
      if (r.prepMinutes) metaParts.push(`Prep: ${r.prepMinutes} min`);
      if (r.cookMinutes) metaParts.push(`Cook: ${r.cookMinutes} min`);
      if (r.courses.length > 0) metaParts.push(`Course: ${r.courses.join(", ")}`);
      if (r.rating) metaParts.push(`Rating: ${r.rating}/5 stars`);

      const photoUrl = resolvePhotoUrl(r.photoIds?.[0]);
      const photoHtml =
        options.includePhotos && photoUrl
          ? `<div class="recipe-photo-wrap"><img src="${photoUrl}" alt="${r.title}" class="recipe-photo" /></div>`
          : "";

      const ingHtml = r.ingredientGroups
        .map((g) => {
          const heading = g.heading ? `<div class="group-heading">${g.heading}</div>` : "";
          const items = g.items.map((i) => `<li>${i.raw}</li>`).join("");
          return `${heading}<ul>${items}</ul>`;
        })
        .join("");

      const dirHtml = r.directionGroups
        .map((g) => {
          const heading = g.heading ? `<div class="group-heading">${g.heading}</div>` : "";
          const steps = g.steps
            .map((s) => `<li>${s.text}${s.note ? ` <em class="step-note">(${s.note})</em>` : ""}</li>`)
            .join("");
          return `${heading}<ol>${steps}</ol>`;
        })
        .join("");

      const notesHtml =
        options.includeNotes && r.notes
          ? `<div class="recipe-notes"><strong>Cook's Notes:</strong> ${r.notes}</div>`
          : "";

      const nutritionHtml =
        options.includeNutrition && r.nutrition
          ? `<div class="recipe-nutrition">
              <strong>Nutrition:</strong>
              ${Object.entries(r.nutrition)
                .map(([k, v]) => ` ${k}: ${v}`)
                .join(" &bull; ")}
            </div>`
          : "";

      const bodyContent = options.twoColumnLayout
        ? `<div class="grid">
            <div class="col-ing">
              <h3>Ingredients</h3>
              ${ingHtml}
            </div>
            <div class="col-dir">
              <h3>Directions</h3>
              ${dirHtml}
            </div>
          </div>`
        : `<div class="single-column">
            <h3>Ingredients</h3>
            ${ingHtml}
            <h3 style="margin-top: 14pt;">Directions</h3>
            ${dirHtml}
          </div>`;

      const breakClass = options.pageBreakAfterRecipe ? "page-break" : "";

      return `<article class="recipe ${breakClass} avoid-break">
        <header class="recipe-header">
          <h2>${r.title}</h2>
          ${r.description ? `<p class="recipe-desc">${r.description}</p>` : ""}
          <div class="recipe-meta">${metaParts.join(" &bull; ")}</div>
        </header>
        ${photoHtml}
        ${bodyContent}
        ${notesHtml}
        ${nutritionHtml}
      </article>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${options.title}</title>
  <style>
    @page { margin: 1.4cm; size: auto; }
    body {
      font-family: "Georgia", "Times New Roman", serif;
      color: #1a1a1a;
      background: #ffffff;
      line-height: 1.45;
      font-size: ${fontPt};
      margin: 0;
      padding: 0;
    }
    .cover {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 85vh;
      text-align: center;
      padding: 40pt 20pt;
    }
    .cover-inner { max-width: 520pt; }
    .cover-badge {
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #777;
      margin-bottom: 12pt;
    }
    .cover-title {
      font-size: 28pt;
      margin: 0 0 10pt 0;
      color: #1c3320;
      line-height: 1.2;
    }
    .cover-subtitle {
      font-size: 13pt;
      color: #555;
      font-style: italic;
      margin: 0 0 20pt 0;
    }
    .cover-divider {
      width: 60pt;
      height: 2pt;
      background: #ca6531;
      margin: 0 auto 20pt auto;
    }
    .cover-author { font-size: 11pt; color: #333; margin: 0 0 8pt 0; }
    .cover-meta { font-size: 9.5pt; color: #888; margin: 0; }
    .toc { padding: 20pt 0; }
    .toc-title {
      font-size: 16pt;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-bottom: 2pt solid #1c3320;
      padding-bottom: 6pt;
      margin-bottom: 14pt;
    }
    .toc-item {
      display: flex;
      align-items: baseline;
      gap: 6pt;
      margin-bottom: 6pt;
      font-size: 10.5pt;
    }
    .toc-num { color: #888; width: 22pt; font-size: 9.5pt; }
    .toc-dots { flex: 1; border-bottom: 1px dotted #ccc; margin: 0 4pt; }
    .toc-course { color: #666; font-size: 9pt; font-style: italic; }
    .recipe {
      padding-top: 14pt;
      margin-bottom: 24pt;
      border-top: 1px solid #ddd;
    }
    .recipe-header { margin-bottom: 10pt; }
    .recipe-header h2 {
      font-size: 18pt;
      margin: 0 0 4pt 0;
      color: #1c3320;
    }
    .recipe-desc {
      font-style: italic;
      color: #555;
      font-size: 9.5pt;
      margin: 0 0 6pt 0;
    }
    .recipe-meta {
      font-size: 9pt;
      color: #666;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;
      padding: 4pt 0;
    }
    .recipe-photo-wrap { margin: 10pt 0; text-align: center; }
    .recipe-photo {
      max-height: 160pt;
      max-width: 100%;
      object-fit: cover;
      border-radius: 4pt;
    }
    .grid { display: flex; gap: 20pt; }
    .col-ing { flex: 0 0 38%; }
    .col-dir { flex: 1; }
    h3 {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 10pt 0 4pt 0;
      color: #263e28;
      border-bottom: 1px solid #eee;
      padding-bottom: 2pt;
    }
    .group-heading { font-weight: 600; font-size: 9.5pt; margin-top: 6pt; }
    ul, ol { padding-left: 16pt; margin: 0 0 8pt 0; }
    li { margin-bottom: 4pt; }
    .step-note { color: #666; font-size: 9pt; }
    .recipe-notes {
      margin-top: 10pt;
      border-top: 1px solid #eee;
      padding-top: 6pt;
      font-size: 9.5pt;
      color: #444;
    }
    .recipe-nutrition {
      margin-top: 6pt;
      font-size: 8.5pt;
      color: #777;
    }
    .page-break { page-break-after: always; break-after: page; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    .print-toolbar {
      position: sticky;
      top: 0;
      left: 0;
      right: 0;
      background: #1c3320;
      color: #ffffff;
      padding: 10px 18px;
      display: flex;
      justifyContent: space-between;
      align-items: center;
      z-index: 99999;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .print-toolbar-brand {
      font-size: 14px;
      font-weight: 500;
    }
    .print-toolbar-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .print-toolbar .btn-print,
    .print-toolbar .btn-pdf,
    .print-toolbar .btn-close {
      cursor: pointer;
      user-select: none;
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      padding: 7px 14px;
      font-size: 13px;
      font-weight: 600;
      line-height: 1;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .print-toolbar .btn-print {
      background: #ca6531;
      color: #ffffff;
    }
    .print-toolbar .btn-pdf {
      background: #2e593b;
      color: #ffffff;
    }
    .print-toolbar .btn-close {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
    }
    @media print {
      body { margin: 0; }
      .recipe { border-top: none; }
      .no-print, .print-toolbar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar no-print">
    <div class="print-toolbar-brand">
      <strong>OpenRecipeBook</strong> &bull; ${options.title}
    </div>
    <div class="print-toolbar-actions">
      <span class="btn-print" onclick="window.print()">Print</span>
      <span class="btn-pdf" onclick="window.print()" title="In printer destination, choose 'Save as PDF'">Save as PDF</span>
      <span class="btn-close" onclick="window.close()">Close</span>
    </div>
  </div>
  ${coverHtml}
  ${tocHtml}
  ${recipesHtml}
</body>
</html>`;
}

export function generateCookbookMarkdown(
  recipes: Recipe[],
  options: CookbookOptions
): string {
  const lines: string[] = [];
  lines.push(`# ${options.title}`);
  if (options.subtitle) lines.push(`*${options.subtitle}*`);
  if (options.author) lines.push(`Curated by: ${options.author}`);
  lines.push("");

  if (options.includeToc) {
    lines.push("## Table of Contents");
    recipes.forEach((r, idx) => {
      lines.push(`${idx + 1}. [${r.title}](#${r.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")})`);
    });
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  recipes.forEach((r) => {
    lines.push(`## ${r.title}`);
    if (r.description) lines.push(`*${r.description}*`);
    const meta: string[] = [];
    if (r.servings) meta.push(`Servings: ${r.servings}`);
    if (r.prepMinutes) meta.push(`Prep: ${r.prepMinutes}m`);
    if (r.cookMinutes) meta.push(`Cook: ${r.cookMinutes}m`);
    if (meta.length > 0) lines.push(`**${meta.join(" | ")}**`);
    lines.push("");

    lines.push("### Ingredients");
    r.ingredientGroups.forEach((g) => {
      if (g.heading) lines.push(`#### ${g.heading}`);
      g.items.forEach((i) => lines.push(`- ${i.raw}`));
    });
    lines.push("");

    lines.push("### Directions");
    r.directionGroups.forEach((g) => {
      if (g.heading) lines.push(`#### ${g.heading}`);
      g.steps.forEach((s, sIdx) => {
        lines.push(`${sIdx + 1}. ${s.text}${s.note ? ` *(${s.note})*` : ""}`);
      });
    });
    lines.push("");

    if (options.includeNotes && r.notes) {
      lines.push(`**Notes:** ${r.notes}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  });

  return lines.join("\n");
}

export function generateCookbookText(
  recipes: Recipe[],
  options: CookbookOptions
): string {
  const lines: string[] = [];
  lines.push(options.title.toUpperCase());
  if (options.subtitle) lines.push(options.subtitle);
  if (options.author) lines.push(`Curated by: ${options.author}`);
  lines.push("=".repeat(60));
  lines.push("");

  if (options.includeToc) {
    lines.push("TABLE OF CONTENTS");
    lines.push("-".repeat(40));
    recipes.forEach((r, idx) => {
      lines.push(`${String(idx + 1).padStart(2, " ")}. ${r.title}`);
    });
    lines.push("");
    lines.push("=".repeat(60));
    lines.push("");
  }

  recipes.forEach((r, idx) => {
    lines.push(`RECIPE ${idx + 1}: ${r.title.toUpperCase()}`);
    if (r.description) lines.push(r.description);
    lines.push(`Yield: ${r.servings} servings | Prep: ${r.prepMinutes || 0}m | Cook: ${r.cookMinutes || 0}m`);
    lines.push("-".repeat(40));
    lines.push("INGREDIENTS:");
    r.ingredientGroups.forEach((g) => {
      if (g.heading) lines.push(`  [${g.heading}]`);
      g.items.forEach((i) => lines.push(`  - ${i.raw}`));
    });
    lines.push("");
    lines.push("DIRECTIONS:");
    r.directionGroups.forEach((g) => {
      if (g.heading) lines.push(`  [${g.heading}]`);
      g.steps.forEach((s, sIdx) => {
        lines.push(`  ${sIdx + 1}. ${s.text}`);
      });
    });
    if (options.includeNotes && r.notes) {
      lines.push("");
      lines.push(`NOTES: ${r.notes}`);
    }
    lines.push("");
    lines.push("=".repeat(60));
    lines.push("");
  });

  return lines.join("\n");
}

export function printCookbookDocument(recipes: Recipe[], options: CookbookOptions): void {
  const html = generateCookbookHtml(recipes, options);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  } else {
    // Popup fallback
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${options.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-cookbook.html`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
