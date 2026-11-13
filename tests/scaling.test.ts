import { describe, it, expect } from "vitest";
import { parseIngredient } from "../src/domain/scaling/parseIngredient";
import { scaleIngredient } from "../src/domain/scaling/scaleIngredient";
import { computeGcd, createRational, addRationals, multiplyRational, rationalFromNumber } from "../src/domain/scaling/rational";

describe("Rational Arithmetic", (): void => {
  it("computes greatest common divisor correctly", (): void => {
    expect(computeGcd(12, 8)).toBe(4);
    expect(computeGcd(7, 3)).toBe(1);
    expect(computeGcd(0, 5)).toBe(5);
  });

  it("reduces rationals to lowest terms", (): void => {
    const fraction = createRational(6, 8);
    expect(fraction.numerator).toBe(3);
    expect(fraction.denominator).toBe(4);
  });

  it("adds fractions with exact rational arithmetic", (): void => {
    // 1 cup + 2/3 cup + 1/3 cup = 2 cups
    const one = createRational(1, 1);
    const twoThirds = createRational(2, 3);
    const oneThird = createRational(1, 3);

    const sum1 = addRationals(one, twoThirds);
    const total = addRationals(sum1, oneThird);

    expect(total.numerator).toBe(2);
    expect(total.denominator).toBe(1);
  });

  it("multiplies rationals accurately", (): void => {
    const fraction = createRational(3, 4);
    const multiplied = multiplyRational(fraction, 2);
    expect(multiplied.numerator).toBe(3);
    expect(multiplied.denominator).toBe(2);
  });

  it("converts floating numbers to exact cooking fractions", (): void => {
    const half = rationalFromNumber(0.5);
    expect(half.numerator).toBe(1);
    expect(half.denominator).toBe(2);

    const twoThirds = rationalFromNumber(0.6666667);
    expect(twoThirds.numerator).toBe(2);
    expect(twoThirds.denominator).toBe(3);
  });
});

describe("Ingredient Parser and Scaler Required Test Table", (): void => {
  it("scales 1 1/2 cups flour by 2 to 3 cups flour", (): void => {
    const parsed = parseIngredient("1 1/2 cups flour");
    const scaled = scaleIngredient(parsed.ingredient, 2);
    expect(scaled.formattedText).toBe("3 cups flour");
  });

  it("scales 1/2 tsp salt by 3 to 1 1/2 tsp salt", (): void => {
    const parsed = parseIngredient("1/2 tsp salt");
    const scaled = scaleIngredient(parsed.ingredient, 3, { useVulgarFractions: true });
    expect(scaled.formattedText).toBe("1 \u00BD tsp salt");
  });

  it("scales 2-3 cloves garlic by 2 to 4 to 6 cloves garlic", (): void => {
    const parsed = parseIngredient("2-3 cloves garlic");
    const scaled = scaleIngredient(parsed.ingredient, 2);
    expect(scaled.formattedText).toBe("4 to 6 cloves garlic");
  });

  it("scales 1 (14 oz) can tomatoes by 2 to 2 (14 oz) cans tomatoes", (): void => {
    const parsed = parseIngredient("1 (14 oz) can tomatoes");
    const scaled = scaleIngredient(parsed.ingredient, 2);
    expect(scaled.formattedText).toBe("2 (14 oz) cans tomatoes");
  });

  it("keeps non-scalable phrases unchanged", (): void => {
    const parsed = parseIngredient("Salt to taste");
    const scaled = scaleIngredient(parsed.ingredient, 5);
    expect(scaled.formattedText).toBe("Salt to taste");
    expect(scaled.isScaled).toBe(false);
  });

  it("promotes units when configured: 3 tsp sugar -> 1 tbsp sugar", (): void => {
    const parsed = parseIngredient("3 tsp sugar");
    const scaled = scaleIngredient(parsed.ingredient, 1, { unitPromotion: true });
    expect(scaled.formattedText).toBe("1 tbsp sugar");
  });

  it("provides hint when scaling egg to fractional amount", (): void => {
    const parsed = parseIngredient("1 egg");
    const scaled = scaleIngredient(parsed.ingredient, 0.5, { useVulgarFractions: true });
    expect(scaled.formattedText).toBe("\u00BD egg");
    expect(scaled.hint).toBe("use 1 small egg or beat and halve");
  });

  it("scales metric grams cleanly: 250 g butter by 1.5 to 375 g butter", (): void => {
    const parsed = parseIngredient("250 g butter");
    const scaled = scaleIngredient(parsed.ingredient, 1.5);
    expect(scaled.formattedText).toBe("375 g butter");
  });
});

describe("Additional Parser Edge Cases", (): void => {
  it("handles spelled-out number words", (): void => {
    const parsed = parseIngredient("two onions");
    expect(parsed.ingredient.quantity).toEqual({ kind: "single", value: 2 });
    expect(parsed.ingredient.name).toBe("onions");
  });

  it("handles reversed format: Salt, 1 tsp", (): void => {
    const parsed = parseIngredient("Salt, 1 tsp");
    expect(parsed.ingredient.name).toBe("Salt");
    expect(parsed.ingredient.unit).toBe("tsp");
    expect(parsed.ingredient.quantity).toEqual({ kind: "single", value: 1 });
  });

  it("handles unquantified ingredient lines safely", (): void => {
    const parsed = parseIngredient("Fresh basil leaves");
    expect(parsed.ingredient.scalable).toBe(false);
    expect(parsed.ingredient.name).toBe("Fresh basil leaves");
  });
});
