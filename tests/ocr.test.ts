import { describe, it, expect } from "vitest";
import { splitOcrRecipeText } from "../src/domain/import/ocr";

describe("OCR Text Heuristic Splitter", (): void => {
  it("splits typical scanned cookbook text into title, ingredients, and directions", (): void => {
    const scannedText = `Blueberry Scones
Ingredients:
2 cups all-purpose flour
1/3 cup sugar
1 tbsp baking powder
1/2 tsp salt
1/2 cup butter, cold
1 cup fresh blueberries
1/2 cup heavy cream

Directions:
Whisk dry ingredients in large bowl.
Cut in cold butter until coarse crumbs form.
Fold in blueberries and heavy cream.
Bake at 400F for 18 minutes until golden.`;

    const parsed = splitOcrRecipeText(scannedText);
    expect(parsed.title).toBe("Blueberry Scones");
    expect(parsed.ingredients).toHaveLength(7);
    expect(parsed.directions).toHaveLength(4);
    expect(parsed.directions[0]).toContain("Whisk dry ingredients");
  });

  it("handles header-less lists via numeric heuristics", (): void => {
    const rawList = `Quick Salad
1 head romaine lettuce, chopped
1 cucumber, sliced
2 tbsp olive oil
Toss all ingredients together in large bowl and serve immediately.`;

    const parsed = splitOcrRecipeText(rawList);
    expect(parsed.title).toBe("Quick Salad");
    expect(parsed.ingredients).toHaveLength(3);
    expect(parsed.directions).toHaveLength(1);
  });
});
