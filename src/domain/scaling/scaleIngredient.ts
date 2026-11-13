import type { Ingredient, Quantity } from "../recipe/types";
import { formatQuantityValue, type FormatOptions } from "./formatQuantity";
import { parseIngredient } from "./parseIngredient";

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
  let effective = ingredient;
  if (!effective.quantity && effective.raw) {
    const parsed = parseIngredient(effective.raw, effective.id);
    if (parsed.confidence !== "none") {
      effective = parsed.ingredient;
    }
  }

  if (!effective.scalable || !effective.quantity) {
    return {
      formattedText: effective.raw,
      isScaled: false
    };
  }

  if (multiplier === 1 && !options.unitPromotion) {
    return {
      formattedText: effective.raw,
      isScaled: false,
      scaledQuantity: effective.quantity
    };
  }

  const scaledQuantity = scaleQuantity(effective.quantity, multiplier);
  const { formattedQuantity, resolvedUnit } = formatQuantityValue(
    scaledQuantity,
    effective.unit,
    options
  );

  const parts: string[] = [formattedQuantity];
  if (effective.note && effective.note.startsWith("(")) {
    parts.push(effective.note);
  }
  if (resolvedUnit) {
    parts.push(resolvedUnit);
  }
  if (effective.name) {
    parts.push(effective.name);
  }
  if (effective.note && !effective.note.startsWith("(")) {
    parts.push(`, ${effective.note}`);
  }

  const formattedText = parts.join(" ").replace(/\s+,/g, ",").trim();

  // Egg hint when fraction of egg results
  let hint: string | undefined;
  const isEgg = effective.name ? /\beggs?\b/i.test(effective.name) : false;
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
