import type { Recipe } from "../recipe/types";

export function formatMinutesToIsoDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  let result = "PT";
  if (hours > 0) result += `${hours}H`;
  if (remainingMinutes > 0 || hours === 0) result += `${remainingMinutes}M`;
  return result;
}

export function exportRecipeToJsonLd(recipe: Recipe): string {
  const totalMinutes = recipe.totalMinutes ?? ((recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0));

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    recipeYield: `${recipe.servings} ${recipe.servingsLabel || "servings"}`.trim()
  };

  if (recipe.description) jsonLd.description = recipe.description;
  if (recipe.prepMinutes) jsonLd.prepTime = formatMinutesToIsoDuration(recipe.prepMinutes);
  if (recipe.cookMinutes) jsonLd.cookTime = formatMinutesToIsoDuration(recipe.cookMinutes);
  if (totalMinutes > 0) jsonLd.totalTime = formatMinutesToIsoDuration(totalMinutes);
  if (recipe.courses.length > 0) jsonLd.recipeCategory = recipe.courses;

  const rawIngredients: string[] = [];
  for (const group of recipe.ingredientGroups) {
    for (const item of group.items) {
      rawIngredients.push(item.raw);
    }
  }
  jsonLd.recipeIngredient = rawIngredients;

  const instructions: { "@type": string; text: string }[] = [];
  for (const group of recipe.directionGroups) {
    for (const step of group.steps) {
      instructions.push({
        "@type": "HowToStep",
        text: step.text
      });
    }
  }
  jsonLd.recipeInstructions = instructions;

  if (recipe.rating > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: recipe.rating,
      bestRating: 5
    };
  }

  return JSON.stringify(jsonLd, null, 2);
}

export function exportRecipeToMarkdown(recipe: Recipe): string {
  const lines: string[] = [];
  lines.push(`# ${recipe.title}`);
  lines.push("");

  if (recipe.description) {
    lines.push(recipe.description);
    lines.push("");
  }

  const metaParts: string[] = [`**Servings:** ${recipe.servings}`];
  if (recipe.prepMinutes) metaParts.push(`**Prep:** ${recipe.prepMinutes} min`);
  if (recipe.cookMinutes) metaParts.push(`**Cook:** ${recipe.cookMinutes} min`);
  if (recipe.courses.length > 0) metaParts.push(`**Course:** ${recipe.courses.join(", ")}`);
  lines.push(metaParts.join(" | "));
  lines.push("");

  lines.push("## Ingredients");
  lines.push("");
  for (const group of recipe.ingredientGroups) {
    if (group.heading) {
      lines.push(`### ${group.heading}`);
      lines.push("");
    }
    for (const item of group.items) {
      lines.push(`- ${item.raw}`);
    }
    lines.push("");
  }

  lines.push("## Directions");
  lines.push("");
  let stepNumber = 1;
  for (const group of recipe.directionGroups) {
    if (group.heading) {
      lines.push(`### ${group.heading}`);
      lines.push("");
    }
    for (const step of group.steps) {
      lines.push(`${stepNumber}. ${step.text}`);
      stepNumber += 1;
    }
    lines.push("");
  }

  if (recipe.notes) {
    lines.push("## Notes");
    lines.push("");
    lines.push(recipe.notes);
    lines.push("");
  }

  return lines.join("\n").trim() + "\n";
}

export function exportRecipeToPlainText(recipe: Recipe): string {
  const lines: string[] = [];
  lines.push(recipe.title.toUpperCase());
  lines.push("=".repeat(recipe.title.length));
  lines.push("");

  if (recipe.description) {
    lines.push(recipe.description);
    lines.push("");
  }

  const metaParts: string[] = [`Servings: ${recipe.servings}`];
  if (recipe.prepMinutes) metaParts.push(`Prep: ${recipe.prepMinutes} min`);
  if (recipe.cookMinutes) metaParts.push(`Cook: ${recipe.cookMinutes} min`);
  if (recipe.courses.length > 0) metaParts.push(`Course: ${recipe.courses.join(", ")}`);
  lines.push(metaParts.join(" | "));
  lines.push("");

  lines.push("INGREDIENTS:");
  for (const group of recipe.ingredientGroups) {
    if (group.heading) {
      lines.push(`  [${group.heading}]`);
    }
    for (const item of group.items) {
      lines.push(`  * ${item.raw}`);
    }
  }
  lines.push("");

  lines.push("DIRECTIONS:");
  let stepNumber = 1;
  for (const group of recipe.directionGroups) {
    if (group.heading) {
      lines.push(`  [${group.heading}]`);
    }
    for (const step of group.steps) {
      lines.push(`  ${stepNumber}. ${step.text}`);
      stepNumber += 1;
    }
  }

  if (recipe.notes) {
    lines.push("");
    lines.push("NOTES:");
    lines.push(recipe.notes);
  }

  return lines.join("\n").trim() + "\n";
}
