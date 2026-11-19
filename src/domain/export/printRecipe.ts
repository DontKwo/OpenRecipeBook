import type { Recipe } from "../recipe/types";

export function getRecipePrintHtml(recipe: Recipe): string {
  const metaParts: string[] = [];
  if (recipe.servings) metaParts.push(`Yield: ${recipe.servings} servings`);
  if (recipe.prepMinutes) metaParts.push(`Prep: ${recipe.prepMinutes} min`);
  if (recipe.cookMinutes) metaParts.push(`Cook: ${recipe.cookMinutes} min`);
  if (recipe.courses.length > 0) metaParts.push(`Course: ${recipe.courses.join(", ")}`);
  if (recipe.rating) metaParts.push(`Rating: ${recipe.rating}/5 stars`);

  const ingredientsHtml = recipe.ingredientGroups
    .map((g) => {
      const heading = g.heading ? `<div style="font-weight:600;margin-top:6pt;">${g.heading}</div>` : "";
      const items = g.items.map((i) => `<li>${i.raw}</li>`).join("");
      return `${heading}<ul>${items}</ul>`;
    })
    .join("");

  const directionsHtml = recipe.directionGroups
    .map((g) => {
      const heading = g.heading ? `<div style="font-weight:600;margin-top:6pt;">${g.heading}</div>` : "";
      const steps = g.steps
        .map((s) => `<li>${s.text}${s.note ? ` <em>(${s.note})</em>` : ""}</li>`)
        .join("");
      return `${heading}<ol>${steps}</ol>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${recipe.title} - OpenRecipeBook</title>
  <style>
    @page { margin: 1.2cm; size: auto; }
    body {
      font-family: "Georgia", "Times New Roman", serif;
      color: #1a1a1a;
      line-height: 1.45;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
    }
    .header { margin-bottom: 10pt; }
    h1 {
      font-size: 20pt;
      margin: 0 0 4pt 0;
      color: #1c3320;
    }
    .desc { font-style: italic; color: #555; margin: 0 0 6pt 0; font-size: 10pt; }
    .meta {
      font-size: 9pt;
      color: #666;
      border-top: 1px solid #ddd;
      border-bottom: 1px solid #ddd;
      padding: 4pt 0;
      margin-bottom: 12pt;
    }
    .grid { display: flex; gap: 20pt; }
    .col-ing { flex: 0 0 38%; }
    .col-dir { flex: 1; }
    h2 {
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 6pt 0;
      color: #263e28;
      border-bottom: 1px solid #eee;
      padding-bottom: 2pt;
    }
    ul, ol { padding-left: 16pt; margin: 0 0 10pt 0; }
    li { margin-bottom: 4pt; }
    .notes {
      margin-top: 12pt;
      border-top: 1px solid #ddd;
      padding-top: 6pt;
      font-size: 9.5pt;
    }
    .footer {
      margin-top: 16pt;
      text-align: center;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 4pt;
    }
    @media print {
      body { margin: 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${recipe.title}</h1>
    ${recipe.description ? `<div class="desc">${recipe.description}</div>` : ""}
    <div class="meta">${metaParts.join(" &bull; ")}</div>
  </div>
  <div class="grid">
    <div class="col-ing">
      <h2>Ingredients</h2>
      ${ingredientsHtml}
    </div>
    <div class="col-dir">
      <h2>Directions</h2>
      ${directionsHtml}
    </div>
  </div>
  ${recipe.notes ? `<div class="notes"><strong>Cook's Notes:</strong> ${recipe.notes}</div>` : ""}
  <div class="footer">OpenRecipeBook &bull; Free Personal Cookbook</div>
</body>
</html>`;
}

export function printRecipeDocument(recipe: Recipe): void {
  const html = getRecipePrintHtml(recipe);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } else {
    // Fall back to direct print if popup blocked
    window.print();
  }
}
