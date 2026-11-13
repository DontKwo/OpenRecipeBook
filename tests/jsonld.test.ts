import { describe, it, expect } from "vitest";
import { parseSchemaRecipeJsonLd, parseIsoDuration, extractRecipesFromHtml } from "../src/domain/import/jsonld";

describe("Schema.org JSON-LD Importer", (): void => {
  it("parses ISO 8601 durations correctly", (): void => {
    expect(parseIsoDuration("PT1H30M")).toBe(90);
    expect(parseIsoDuration("PT45M")).toBe(45);
    expect(parseIsoDuration("PT2H")).toBe(120);
    expect(parseIsoDuration("")).toBe(0);
  });

  it("extracts recipe from standard schema.org JSON-LD structure", (): void => {
    const jsonLdSample = {
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Guacamole",
      description: "Simple fresh guacamole with lime and cilantro.",
      recipeYield: "4 servings",
      prepTime: "PT10M",
      recipeIngredient: [
        "3 ripe avocados",
        "1 lime, juiced",
        "1/2 tsp salt",
        "1/4 cup diced onion"
      ],
      recipeInstructions: [
        {
          "@type": "HowToStep",
          text: "Mash avocados in bowl with lime juice and salt."
        },
        {
          "@type": "HowToStep",
          text: "Stir in diced onion and serve immediately."
        }
      ]
    };

    const parsed = parseSchemaRecipeJsonLd(jsonLdSample);
    expect(parsed).toHaveLength(1);

    const recipe = parsed[0];
    expect(recipe.title).toBe("Guacamole");
    expect(recipe.servings).toBe(4);
    expect(recipe.prepMinutes).toBe(10);
    expect(recipe.ingredientGroups[0].items).toHaveLength(4);
    expect(recipe.directionGroups[0].steps).toHaveLength(2);
    expect(recipe.directionGroups[0].steps[0].text).toBe("Mash avocados in bowl with lime juice and salt.");
  });

  it("handles @graph arrays seamlessly", (): void => {
    const graphData = {
      "@graph": [
        { "@type": "WebSite", name: "Food Blog" },
        {
          "@type": "Recipe",
          name: "Lemonade",
          recipeIngredient: ["1 cup lemon juice", "1 cup sugar", "4 cups water"]
        }
      ]
    };

    const parsed = parseSchemaRecipeJsonLd(graphData);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].title).toBe("Lemonade");
  });

  it("extracts schema.org recipes embedded inside HTML script tags", (): void => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Berry Cobbler",
              "recipeIngredient": ["4 cups berries", "1 cup flour", "1/2 cup sugar"]
            }
          </script>
        </head>
        <body><h1>Berry Cobbler</h1></body>
      </html>
    `;

    const extracted = extractRecipesFromHtml(html);
    expect(extracted).toHaveLength(1);
    expect(extracted[0].title).toBe("Berry Cobbler");
    expect(extracted[0].ingredientGroups[0].items).toHaveLength(3);
  });
});
