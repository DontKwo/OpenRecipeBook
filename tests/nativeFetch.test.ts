import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { fetchRecipePage, importRecipesFromUrl } from "../src/domain/import/nativeFetch";

interface MockWindow {
  nativeApi?: {
    isElectron: boolean;
    fetchPage: (url: string) => Promise<{ ok: boolean; html?: string; status?: number; error?: string }>;
  };
}

describe("Native Fetch Importer", (): void => {
  const globalObj = globalThis as unknown as { window?: MockWindow };

  beforeEach((): void => {
    globalObj.window = {};
  });

  afterEach((): void => {
    delete globalObj.window;
  });

  it("returns unsupportedInBrowser when running in standard browser", async (): Promise<void> => {
    const result = await fetchRecipePage("https://example.com/recipe");
    expect(result.ok).toBe(false);
    expect(result.unsupportedInBrowser).toBe(true);
  });

  it("fetches page and parses recipes when running in native wrapper", async (): Promise<void> => {
    const mockHtml = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Banana Bread",
              "recipeIngredient": ["3 ripe bananas", "1/3 cup melted butter", "3/4 cup sugar"]
            }
          </script>
        </head>
        <body>Banana Bread Recipe</body>
      </html>
    `;

    globalObj.window = {
      nativeApi: {
        isElectron: true,
        fetchPage: async (_url: string): Promise<{ ok: boolean; html: string }> => {
          return { ok: true, html: mockHtml };
        }
      }
    };

    const result = await importRecipesFromUrl("https://example.com/banana-bread");
    expect(result.ok).toBe(true);
    expect(result.recipes).toHaveLength(1);
    expect(result.recipes[0].title).toBe("Banana Bread");
    expect(result.recipes[0].sourceUrl).toBe("https://example.com/banana-bread");
    expect(result.recipes[0].ingredientGroups[0].items).toHaveLength(3);
  });
});
