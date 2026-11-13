import type { Ingredient, Quantity } from "../recipe/types";
import { formatQuantityValue, type FormatOptions } from "./formatQuantity";

export interface ScaledIngredientResult {
  formattedText: string;
  isScaled: boolean;
  hint?: string;
  scaledQuantity?: Quantity;
}

export function scaleQuantity(quantity: Quantity, multiplier: number): Quantity {
  if (multiplier <= 0) {
    return quantity;
  }
  if (quantity.kind === "range") {
    return {
      kind: "range",
      min: quantity.min * multiplier,
      max: quantity.max * multiplier
    };
  }
  return {
    kind: "single",
    value: quantity.value * multiplier
  };
}

export function scaleIngredient(
  ingredient: Ingredient,
  multiplier: number,
  options: FormatOptions = {}
): ScaledIngredientResult {
  if (!ingredient.scalable || !ingredient.quantity || multiplier === 1) {
    if (!ingredient.scalable || !ingredient.quantity) {
      return {
        formattedText: ingredient.raw,
        isScaled: false
      };
    }
  }

  const scaledQuantity = scaleQuantity(ingredient.quantity, multiplier);
  const { formattedQuantity, resolvedUnit } = formatQuantityValue(
    scaledQuantity,
    ingredient.unit,
    options
  );

  const parts: string[] = [formattedQuantity];
  if (ingredient.note && ingredient.note.startsWith("(")) {
    parts.push(ingredient.note);
  }
  if (resolvedUnit) {
    parts.push(resolvedUnit);
  }
  if (ingredient.name) {
    parts.push(ingredient.name);
  }
  if (ingredient.note && !ingredient.note.startsWith("(")) {
    parts.push(`, ${ingredient.note}`);
  }

  const formattedText = parts.join(" ").replace(/\s+,/g, ",").trim();

  // Egg hint when fraction of egg results
  let hint: string | undefined;
  const isEgg = ingredient.name ? /\beggs?\b/i.test(ingredient.name) : false;
  if (isEgg && scaledQuantity.kind === "single" && scaledQuantity.value % 1 !== 0) {
    hint = "use 1 small egg or beat and halve";
  }

  return {
    formattedText,
    isScaled: true,
    hint,
    scaledQuantity
  };
}
