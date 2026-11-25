import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parseIngredient } from "../src/domain/scaling/parseIngredient";
import { scaleIngredient } from "../src/domain/scaling/scaleIngredient";
import { extractRecipesFromHtml, unescapeHtmlEntities } from "../src/domain/import/jsonld";
import { importRecipesFromUrl } from "../src/domain/import/nativeFetch";
import { parsePlainTextRecipe } from "../src/domain/import/textRecipeParser";
import { convertPaprikaJsonToRecipe } from "../src/domain/import/paprika";
import { isBrowserDemoMode, getStorageLocationInfo, clearVirtualStorageMemoryForTests } from "../src/domain/storage/recipeStorageService";

describe("Top Recipe Blogs Scraper & Fallback Parser", (): void => {
  const globalObj = globalThis as unknown as {
    window?: {
      nativeApi?: {
        isElectron: boolean;
        fetchPage: (url: string) => Promise<{ ok: boolean; status?: number; html?: string; error?: string }>;
      };
    };
  };

  beforeEach((): void => {
    clearVirtualStorageMemoryForTests();
    delete globalObj.window;
  });

  afterEach((): void => {
    delete globalObj.window;
  });

  it("extracts AllRecipes-style JSON-LD with recipeYield array, HowToSection headings, and metadata", (): void => {
    const html = `<!doctype html><html><head>
      <script type="application/ld+json; charset=utf-8">
      <!--
      {
        "@context": "https://schema.org",
        "@type": ["https://schema.org/Recipe"],
        "name": "Classic Banana Pancakes &#x2019; 2026",
        "description": "Fluffy &amp;amp; tender pancakes&mdash;weekend favorite.",
        "recipeYield": ["6", "6 servings"],
        "prepTime": "PT10M",
        "cookTime": "PT15M",
        "totalTime": "PT25M",
        "image": { "@type": "ImageObject", "url": "https://example.com/pancakes.jpg" },
        "author": [{ "@type": "Person", "name": "Test Chef" }],
        "recipeCategory": "Breakfast, Brunch",
        "recipeCuisine": ["American"],
        "keywords": "pancakes, breakfast, bananas",
        "recipeIngredient": [
          "1 \u00BD cups all-purpose flour",
          "\u00BD-\u00BE tsp kosher salt"
        ],
        "recipeInstructions": [
          {
            "@type": "HowToSection",
            "name": "Mix Dry Base",
            "itemListElement": [
              { "@type": "HowToStep", "text": "<p>Whisk flour &amp; salt together.</p>" }
            ]
          },
          {
            "@type": "HowToSection",
            "name": "Cook Griddle",
            "itemListElement": [
              "Cook 2 minutes per side at 350&#xB0;F."
            ]
          }
        ]
      }
      -->
      </script></head><body></body></html>`;

    const extracted = extractRecipesFromHtml(html);
    expect(extracted).toHaveLength(1);
    const r = extracted[0];
    expect(r.title).toContain("Classic Banana Pancakes");
    expect(r.title).toContain("\u2019");
    expect(r.description).toBe("Fluffy & tender pancakes-weekend favorite.");
    expect(r.servings).toBe(6);
    expect(r.servingsLabel).toBe("6 servings");
    expect(r.sourceName).toBe("Test Chef");
    expect(r.photoIds).toEqual(["https://example.com/pancakes.jpg"]);
    expect(r.categories).toEqual(["American"]);
    expect(r.tags).toEqual(["pancakes", "breakfast", "bananas"]);
    expect(r.directionGroups).toHaveLength(2);
    expect(r.directionGroups[0].heading).toBe("Mix Dry Base");
    expect(r.directionGroups[0].steps[0].text).toBe("Whisk flour & salt together.");
    expect(r.directionGroups[1].heading).toBe("Cook Griddle");
    expect(r.directionGroups[1].steps[0].text).toContain("350°F");
  });

  it("extracts schema.org Microdata when JSON-LD is absent", (): void => {
    const html = `<html><body>
      <article itemscope itemtype="https://schema.org/Recipe">
        <h1 itemprop="name">Budget Bytes Garlic Noodles</h1>
        <span itemprop="recipeYield">4 servings</span>
        <meta itemprop="prepTime" content="PT5M" />
        <meta itemprop="cookTime" content="PT10M" />
        <ul>
          <li itemprop="recipeIngredient">8 oz spaghetti</li>
          <li itemprop="recipeIngredient">2 tbsp butter</li>
        </ul>
        <ol>
          <li itemprop="recipeInstructions">Boil noodles until al dente.</li>
          <li itemprop="recipeInstructions">Toss with melted garlic butter.</li>
        </ol>
      </article>
    </body></html>`;

    const recipes = extractRecipesFromHtml(html);
    expect(recipes).toHaveLength(1);
    expect(recipes[0].title).toBe("Budget Bytes Garlic Noodles");
    expect(recipes[0].servings).toBe(4);
    expect(recipes[0].ingredientGroups[0].items).toHaveLength(2);
    expect(recipes[0].directionGroups[0].steps).toHaveLength(2);
  });

  it("classifies NYT Cooking 403 / paywall blocks cleanly with fallback guidance", async (): Promise<void> => {
    globalObj.window = {
      nativeApi: {
        isElectron: true,
        fetchPage: async () => ({
          ok: false,
          status: 403,
          html: "<html><body>Subscribe to continue reading NYT Cooking</body></html>",
          error: "HTTP 403"
        })
      }
    };

    const res = await importRecipesFromUrl("https://cooking.nytimes.com/recipes/12345");
    expect(res.ok).toBe(false);
    expect(res.failureReason).toBe("paywall_or_blocked");
    expect(res.error).toContain("paste");
  });

  it("parses copy-pasted blog text with checkboxes, split metadata, and numbered steps", (): void => {
    const copied = `
      Serious Eats Crispy Potatoes
      Jump to Recipe
      Print Recipe
      Servings:
      4
      Prep Time:
      15 mins
      Cook Time:
      45 mins
      1x 2x 3x

      Ingredients (1x 2x 3x)
      ▢ 2 lbs russet potatoes
      ▢ ½ cup olive oil
      [ ] 1½ tsp kosher salt
      ▢ 1⁄2 tsp black pepper

      Cooking Instructions
      Step 1
      Boil diced potatoes in salted water for 10 minutes.
      Step 2
      Shake well and roast at 450F until golden.
    `;

    const parsed = parsePlainTextRecipe(copied);
    expect(parsed.title).toBe("Serious Eats Crispy Potatoes");
    expect(parsed.servings).toBe(4);
    expect(parsed.prepMinutes).toBe(15);
    expect(parsed.cookMinutes).toBe(45);
    expect(parsed.ingredientGroups[0].items).toEqual([
      "2 lbs russet potatoes",
      "½ cup olive oil",
      "1½ tsp kosher salt",
      "1/2 tsp black pepper"
    ]);
    expect(parsed.directionGroups[0].steps).toEqual([
      "Boil diced potatoes in salted water for 10 minutes.",
      "Shake well and roast at 450F until golden."
    ]);
  });

  it("handles Unicode fractions, Unicode ranges, hyphenated mixed fractions, and U+2044 slashes in parseIngredient", (): void => {
    const cases: Array<[string, number, string | undefined]> = [
      ["\u00BD cup sugar", 0.5, "cup"],
      ["1 \u00BD cups all-purpose flour", 1.5, "cup"],
      ["1-1/2 tbsp olive oil", 1.5, "tbsp"],
      ["1\u20442 tsp baking powder", 0.5, "tsp"]
    ];
    for (const [raw, expectedVal, expectedUnit] of cases) {
      const parsed = parseIngredient(raw).ingredient;
      expect(parsed.quantity).toEqual({ kind: "single", value: expectedVal });
      expect(parsed.unit).toBe(expectedUnit);
      expect(scaleIngredient(parsed, 2).formattedText.length).toBeGreaterThan(0);
    }

    const rangeIng = parseIngredient("\u00BD-\u00BE tsp kosher salt").ingredient;
    expect(rangeIng.quantity).toEqual({ kind: "range", min: 0.5, max: 0.75 });
  });

  it("preserves Paprika total_time, sub-headings, and photo_data", (): void => {
    const rec = convertPaprikaJsonToRecipe({
      name: "Brioche",
      prep_time: "20 mins",
      cook_time: "30 mins",
      total_time: "50 mins",
      ingredients: "Dough:\n3 cups flour\nGlaze:\n1 egg",
      directions: "Mix Dough:\nKnead 10 mins.\nBake:\nBake at 375F.",
      photo_data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    });
    expect(rec.totalMinutes).toBe(50);
    expect(rec.ingredientGroups).toHaveLength(2);
    expect(rec.ingredientGroups[0].heading).toBe("Dough");
    expect(rec.ingredientGroups[1].heading).toBe("Glaze");
    expect(rec.directionGroups).toHaveLength(2);
    expect(rec.photoIds[0]).toMatch(/^data:image\/png;base64,/);
  });

  it("decodes hex/named HTML entities accurately without corruption", (): void => {
    expect(unescapeHtmlEntities("Chef&#x2019;s Kiss &mdash; &frac18; tsp &amp;amp; &nbsp;salt")).toBe(
      "Chef\u2019s Kiss - 1/8 tsp &  salt"
    );
  });

  it("reports browser demo IndexedDB storage mode when window lacks native bridges", async (): Promise<void> => {
    globalObj.window = {};
    expect(isBrowserDemoMode()).toBe(true);
    const info = await getStorageLocationInfo([]);
    expect(info.storagePath).toBe("Browser Storage (IndexedDB)");
    expect(info.canOpenSystemFolder).toBe(false);
  });
});
