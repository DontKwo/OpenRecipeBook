import { describe, it, expect } from "vitest";
import { parseSchemaRecipeJsonLd, parseIsoDuration, unescapeHtmlEntities, extractRecipesFromHtml } from "../src/domain/import/jsonld";
import { parsePlainTextRecipe } from "../src/domain/import/textRecipeParser";
import { cleanOcrText, splitOcrRecipeText } from "../src/domain/import/ocr";
import { parseNumberToken, parseQuantityPrefix, parseIngredient } from "../src/domain/scaling/parseIngredient";

describe("Hard Edge-Case Tests: Link and JSON-LD Import", (): void => {
  it("parses deeply nested @graph structure with multiple non-recipe entities", (): void => {
    const complexJsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://example.com/#website",
          name: "Epicurean Feast"
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [{ "@type": "ListItem", position: 1, name: "Home" }]
        },
        {
          "@type": ["Recipe", "NewsArticle"],
          name: "Artisan Sourdough &amp; Rosemary Loaf",
          description: "Crusty golden bread with &quot;cloud-like&quot; open crumb &amp; herbaceous aroma.",
          prepTime: "PT2H30M",
          cookTime: "PT45M",
          totalTime: "P0DT3H15M",
          recipeYield: "Serves 8 to 10 dinner guests",
          recipeIngredient: [
            "4 cups &frac12; unbleached bread flour",
            "1 &frac34; cups warm filtered water",
            "1 tbsp Diamond Crystal kosher salt",
            "2 sprigs fresh rosemary, minced"
          ],
          recipeInstructions: [
            {
              "@type": "HowToStep",
              text: "Whisk flour &amp; salt in large bowl at 72&deg;F."
            },
            {
              "@type": "HowToStep",
              text: "Perform coil folds every 30 minutes for 2 hours."
            }
          ],
          recipeCategory: ["Bread", "Baking", "Artisan"]
        }
      ]
    };

    const recipes = parseSchemaRecipeJsonLd(complexJsonLd);
    expect(recipes).toHaveLength(1);
    const r = recipes[0];
    expect(r.title).toBe("Artisan Sourdough & Rosemary Loaf");
    expect(r.description).toBe('Crusty golden bread with "cloud-like" open crumb & herbaceous aroma.');
    expect(r.prepMinutes).toBe(150);
    expect(r.cookMinutes).toBe(45);
    expect(r.totalMinutes).toBe(195);
    expect(r.servings).toBe(8);
    expect(r.ingredientGroups[0].items[0].raw).toBe("4 cups 1/2 unbleached bread flour");
    expect(r.directionGroups[0].steps[0].text).toBe("Whisk flour & salt in large bowl at 72°F.");
  });

  it("extracts JSON-LD script tags embedded within messy HTML markup", (): void => {
    const messyHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Classic Pot Roast",
              "recipeIngredient": ["3 lbs beef chuck roast", "1 lb baby carrots"],
              "recipeInstructions": "Season roast generously with salt.\\nSear on all sides in Dutch oven."
            }
          </script>
        </head>
        <body><div>Content</div></body>
      </html>
    `;

    const extracted = extractRecipesFromHtml(messyHtml);
    expect(extracted).toHaveLength(1);
    expect(extracted[0].title).toBe("Classic Pot Roast");
    expect(extracted[0].ingredientGroups[0].items).toHaveLength(2);
    expect(extracted[0].directionGroups[0].steps).toHaveLength(2);
  });

  it("handles extreme ISO durations and day representations", (): void => {
    expect(parseIsoDuration("P1DT2H30M")).toBe(24 * 60 + 150);
    expect(parseIsoDuration("PT90M")).toBe(90);
    expect(parseIsoDuration("PT0H45M")).toBe(45);
    expect(parseIsoDuration("")).toBe(0);
  });

  it("unescapes all common culinary HTML numeric and named entities", (): void => {
    const raw = "Bake at 350&deg;F with &frac12; cup sugar, &frac14; tsp salt &amp; 1 &quot;pinch&quot; of nutmeg.";
    expect(unescapeHtmlEntities(raw)).toBe('Bake at 350°F with 1/2 cup sugar, 1/4 tsp salt & 1 "pinch" of nutmeg.');
  });
});

describe("Hard Edge-Case Tests: Text File & Paste Parsing", (): void => {
  it("parses recipe with markdown headers, bullet points, unicode fractions and ranges", (): void => {
    const markdownRecipe = `
# Grandma's Cinnamon Rolls

Yield: Makes 12 large rolls
Prep Time: 30 minutes
Cook Time: 25 minutes
Total: 55 mins

**Ingredients:**
* 2 ½ to 3 cups all-purpose flour
* 1 package (¼ oz) active dry yeast
* ¾ cup warm milk (110°F)
* ⅓ cup granulated sugar
* 1 - 2 tsp ground cinnamon
* 4 tbsp unsalted butter, softened

### Directions:
1. Dissolve yeast in warm milk with 1 tbsp sugar; let foam for 5 minutes.
2. In a stand mixer, combine flour, remaining sugar, and yeast mixture.
3. Knead on medium speed for 8-10 minutes until smooth and elastic.
4. Roll into a 16x12-inch rectangle, spread butter, and sprinkle cinnamon-sugar.
5. Bake at 375°F for 22 to 25 minutes until lightly browned.

Notes:
Best served warm with cream cheese icing.
    `;

    const parsed = parsePlainTextRecipe(markdownRecipe);
    expect(parsed.title).toBe("Grandma's Cinnamon Rolls");
    expect(parsed.servings).toBe(12);
    expect(parsed.prepMinutes).toBe(30);
    expect(parsed.cookMinutes).toBe(25);
    expect(parsed.totalMinutes).toBe(55);
    expect(parsed.ingredientGroups[0].items.length).toBeGreaterThanOrEqual(6);
    expect(parsed.ingredientGroups[0].items[0]).toContain("2 ½ to 3 cups all-purpose flour");
    expect(parsed.directionGroups[0].steps.length).toBe(5);
    expect(parsed.notes).toContain("Best served warm with cream cheese icing.");
  });

  it("handles headerless recipes partitioned purely by numeric heuristics", (): void => {
    const rawNoHeaders = `
Simple Vinaigrette
3 tbsp extra virgin olive oil
1 tbsp red wine vinegar
1 tsp Dijon mustard
1/2 tsp kosher salt
1/4 tsp freshly cracked black pepper
Whisk all ingredients vigorously in a small bowl until emulsified.
Drizzle over mixed greens right before serving.
    `;

    const parsed = parsePlainTextRecipe(rawNoHeaders);
    expect(parsed.title).toBe("Simple Vinaigrette");
    expect(parsed.ingredientGroups[0].items).toHaveLength(5);
    expect(parsed.directionGroups[0].steps).toHaveLength(2);
  });
});

describe("Hard Edge-Case Tests: OCR Scanning Text Correction", (): void => {
  it("cleans OCR optical character recognition errors on numbers and fractions", (): void => {
    const rawOcr = `
~ Pan-Seared Salmon
Ingredients:
| I cup chicken broth
* I/2 cup heavy cream
- l/4 tsp white pepper
O.5 tsp kosher salt
2 salmon fillets

Directions:
Heat oil in cast iron skillet.
Sear salmon 4 minutes per side.
    `;

    const cleaned = cleanOcrText(rawOcr);
    expect(cleaned).toContain("1 cup chicken broth");
    expect(cleaned).toContain("1/2 cup heavy cream");
    expect(cleaned).toContain("1/4 tsp white pepper");
    expect(cleaned).toContain("0.5 tsp kosher salt");

    const parsed = splitOcrRecipeText(rawOcr);
    expect(parsed.title).toBe("Pan-Seared Salmon");
    expect(parsed.ingredients).toHaveLength(5);
    expect(parsed.ingredients[0]).toBe("1 cup chicken broth");
    expect(parsed.directions).toHaveLength(2);
  });
});

describe("Ingredient Token & Quantity Parsing Robustness", (): void => {
  it("parses numbers, words, fractions, and ranges reliably", (): void => {
    expect(parseNumberToken("1/2")).toBe(0.5);
    expect(parseNumberToken("¾")).toBe(0.75);
    expect(parseNumberToken("one")).toBe(1);
    expect(parseNumberToken("two")).toBe(2);
    expect(parseNumberToken("1.5")).toBe(1.5);

    const prefix1 = parseQuantityPrefix("1 1/2 cups flour");
    expect(prefix1.quantity).toBeDefined();
    if (prefix1.quantity && prefix1.quantity.kind === "single") {
      expect(prefix1.quantity.value).toBe(1.5);
    }

    const rangePrefix = parseQuantityPrefix("2 to 3 cloves garlic");
    expect(rangePrefix.quantity).toBeDefined();
    if (rangePrefix.quantity && rangePrefix.quantity.kind === "range") {
      expect(rangePrefix.quantity.min).toBe(2);
      expect(rangePrefix.quantity.max).toBe(3);
    }

    const ing = parseIngredient("1 cup (8 oz) sour cream").ingredient;
    expect(ing.unit).toBe("cup");
    expect(ing.name).toContain("sour cream");
  });
});
