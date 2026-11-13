import type { Recipe, DictionaryIngredient } from "../recipe/types";
import { parseIngredient } from "../scaling/parseIngredient";
import { scaleQuantity } from "../scaling/scaleIngredient";
import { matchIngredient, extractDescriptorNotes } from "./matcher";
import { createRational, addRationals, rationalFromNumber, rationalToNumber, type Rational } from "../scaling/rational";
import { formatFractionalNumber, promoteUnit, pluralizeUnit } from "../scaling/formatQuantity";

export interface TotalsSelectionItem {
  recipe: Recipe;
  multiplier: number;
}

export interface ContributionTrace {
  recipeTitle: string;
  originalRaw: string;
  scaledQuantityText: string;
}

export interface AggregatedItem {
  ingredientId?: string;
  displayName: string;
  aisle: string;
  totalDisplay: string;
  unitFamily: "volume" | "weight" | "count" | "other" | "combined";
  notes: string[];
  traces: ContributionTrace[];
  isMatched: boolean;
}

export interface TotalsResult {
  items: AggregatedItem[];
  alsoNeeded: { name: string; traces: ContributionTrace[] }[];
}

export interface TotalsOptions {
  combineVolumeAndWeight?: boolean;
  treatVariantsSame?: boolean;
  roundUpForShopping?: boolean;
}

// Unit conversion ratios to base units (ml for volume)
const VOLUME_TO_ML: Record<string, number> = {
  tsp: 4.92892159375,
  tbsp: 14.78676478125,
  "fl oz": 29.5735295625,
  cup: 236.5882365,
  pint: 473.176473,
  quart: 946.352946,
  gallon: 3785.411784,
  ml: 1.0,
  l: 1000.0
};

// Unit conversion ratios to base units (g for weight)
const WEIGHT_TO_G: Record<string, number> = {
  oz: 28.349523125,
  lb: 453.59237,
  g: 1.0,
  kg: 1000.0
};

export function computeIngredientTotals(
  selections: TotalsSelectionItem[],
  dictionary: DictionaryIngredient[],
  options: TotalsOptions = {}
): TotalsResult {
  const aggregatedGroups: Map<string, {
    dictionaryItem?: DictionaryIngredient;
    fallbackName: string;
    unitFamily: "volume" | "weight" | "count" | "other" | "combined";
    aisle: string;
    allSameUnit?: string;
    rationalSumMin: Rational;
    rationalSumMax: Rational;
    baseUnitSumMin: Rational;
    baseUnitSumMax: Rational;
    hasRange: boolean;
    traces: ContributionTrace[];
    notes: Set<string>;
    packageSpec?: string;
    isCombinedDensity?: boolean;
  }> = new Map();

  const alsoNeededMap: Map<string, ContributionTrace[]> = new Map();

  for (const selection of selections) {
    const { recipe, multiplier } = selection;

    for (const group of recipe.ingredientGroups) {
      for (const ingredientItem of group.items) {
        const parsed = parseIngredient(ingredientItem.raw, ingredientItem.id);
        const activeIngredient = parsed.ingredient;

        // Trace entry
        const trace: ContributionTrace = {
          recipeTitle: recipe.title,
          originalRaw: ingredientItem.raw,
          scaledQuantityText: ""
        };

        if (!activeIngredient.scalable || !activeIngredient.quantity) {
          const rawName = activeIngredient.name || ingredientItem.raw;
          trace.scaledQuantityText = rawName;
          const currentTraces = alsoNeededMap.get(rawName) || [];
          currentTraces.push(trace);
          alsoNeededMap.set(rawName, currentTraces);
          continue;
        }

        const scaledQuantity = scaleQuantity(activeIngredient.quantity, multiplier);
        const minAmount = scaledQuantity.kind === "single" ? scaledQuantity.value : scaledQuantity.min;
        const maxAmount = scaledQuantity.kind === "single" ? scaledQuantity.value : scaledQuantity.max;
        const hasLineRange = scaledQuantity.kind === "range";
        trace.scaledQuantityText = hasLineRange
          ? `${minAmount} to ${maxAmount} ${activeIngredient.unit || ""} ${activeIngredient.name || ""}`.trim()
          : `${maxAmount} ${activeIngredient.unit || ""} ${activeIngredient.name || ""}`.trim();

        const matchedDict = matchIngredient(activeIngredient.name || "", dictionary);
        const resolvedId = matchedDict
          ? (options.treatVariantsSame && matchedDict.family ? matchedDict.family : matchedDict.id)
          : activeIngredient.name?.toLowerCase() || "unmatched";

        const aisle = matchedDict?.aisle || "Pantry";
        const displayName = matchedDict?.name || activeIngredient.name || "Ingredient";
        const lineUnitFamily: "volume" | "weight" | "count" | "other" = (activeIngredient.unit && activeIngredient.unit in VOLUME_TO_ML)
          ? "volume"
          : (activeIngredient.unit && activeIngredient.unit in WEIGHT_TO_G)
            ? "weight"
            : (activeIngredient.unit ? "other" : "count");

        const shouldCombineDensity = Boolean(
          options.combineVolumeAndWeight &&
          matchedDict?.gramsPerMl &&
          (lineUnitFamily === "volume" || lineUnitFamily === "weight")
        );

        const groupFamily = shouldCombineDensity ? "combined" : lineUnitFamily;
        const packageSpec = activeIngredient.note?.startsWith("(") ? activeIngredient.note : undefined;
        const groupKey = `${resolvedId}::${groupFamily}::${packageSpec || "none"}`;

        let currentGroup = aggregatedGroups.get(groupKey);
        if (!currentGroup) {
          currentGroup = {
            dictionaryItem: matchedDict || undefined,
            fallbackName: displayName,
            unitFamily: groupFamily,
            aisle,
            allSameUnit: shouldCombineDensity ? undefined : activeIngredient.unit,
            rationalSumMin: createRational(0, 1),
            rationalSumMax: createRational(0, 1),
            baseUnitSumMin: createRational(0, 1),
            baseUnitSumMax: createRational(0, 1),
            hasRange: false,
            traces: [],
            notes: new Set<string>(),
            packageSpec,
            isCombinedDensity: shouldCombineDensity
          };
          aggregatedGroups.set(groupKey, currentGroup);
        }

        // Add trace and notes
        currentGroup.traces.push(trace);
        if (activeIngredient.note && !packageSpec) {
          currentGroup.notes.add(activeIngredient.note);
        }
        const descriptorNotes = extractDescriptorNotes(activeIngredient.name || "");
        for (const desc of descriptorNotes) {
          currentGroup.notes.add(desc);
        }
        if (hasLineRange) {
          currentGroup.hasRange = true;
        }

        // Check if all items in this group share the exact same unit
        if (currentGroup.allSameUnit !== activeIngredient.unit) {
          currentGroup.allSameUnit = undefined;
        }

        // Add quantity using exact rational arithmetic
        currentGroup.rationalSumMin = addRationals(currentGroup.rationalSumMin, rationalFromNumber(minAmount));
        currentGroup.rationalSumMax = addRationals(currentGroup.rationalSumMax, rationalFromNumber(maxAmount));

        if (shouldCombineDensity && matchedDict?.gramsPerMl) {
          let gMin = 0;
          let gMax = 0;
          if (lineUnitFamily === "volume" && activeIngredient.unit && activeIngredient.unit in VOLUME_TO_ML) {
            const mlFactor = VOLUME_TO_ML[activeIngredient.unit];
            gMin = minAmount * mlFactor * matchedDict.gramsPerMl;
            gMax = maxAmount * mlFactor * matchedDict.gramsPerMl;
          } else if (lineUnitFamily === "weight" && activeIngredient.unit && activeIngredient.unit in WEIGHT_TO_G) {
            const gFactor = WEIGHT_TO_G[activeIngredient.unit];
            gMin = minAmount * gFactor;
            gMax = maxAmount * gFactor;
          }
          currentGroup.baseUnitSumMin = addRationals(currentGroup.baseUnitSumMin, rationalFromNumber(gMin));
          currentGroup.baseUnitSumMax = addRationals(currentGroup.baseUnitSumMax, rationalFromNumber(gMax));
        } else if (activeIngredient.unit && activeIngredient.unit in VOLUME_TO_ML) {
          const factor = VOLUME_TO_ML[activeIngredient.unit];
          currentGroup.baseUnitSumMin = addRationals(currentGroup.baseUnitSumMin, rationalFromNumber(minAmount * factor));
          currentGroup.baseUnitSumMax = addRationals(currentGroup.baseUnitSumMax, rationalFromNumber(maxAmount * factor));
        } else if (activeIngredient.unit && activeIngredient.unit in WEIGHT_TO_G) {
          const factor = WEIGHT_TO_G[activeIngredient.unit];
          currentGroup.baseUnitSumMin = addRationals(currentGroup.baseUnitSumMin, rationalFromNumber(minAmount * factor));
          currentGroup.baseUnitSumMax = addRationals(currentGroup.baseUnitSumMax, rationalFromNumber(maxAmount * factor));
        }
      }
    }
  }

  const items: AggregatedItem[] = [];

  for (const group of aggregatedGroups.values()) {
    const totalNumericMin = rationalToNumber(group.rationalSumMin);
    const totalNumericMax = rationalToNumber(group.rationalSumMax);
    const isRange = group.hasRange && totalNumericMin !== totalNumericMax;
    let totalDisplay = "";

    if (group.isCombinedDensity) {
      const totalG = rationalToNumber(group.baseUnitSumMax);
      let formattedNumber: string;
      let unitStr: string;
      if (totalG >= WEIGHT_TO_G.lb) {
        const lb = totalG / WEIGHT_TO_G.lb;
        formattedNumber = formatFractionalNumber(lb);
        unitStr = pluralizeUnit("lb", lb);
      } else if (totalG >= 100) {
        formattedNumber = String(Math.round(totalG));
        unitStr = "g";
      } else {
        formattedNumber = formatFractionalNumber(totalG);
        unitStr = "g";
      }
      totalDisplay = `\u2248 ${formattedNumber} ${unitStr} ${group.fallbackName}`.trim();
    } else if (group.allSameUnit) {
      if (isRange) {
        const promotedMin = promoteUnit(totalNumericMin, group.allSameUnit);
        const promotedMax = promoteUnit(totalNumericMax, group.allSameUnit);
        const formattedNumber = `${formatFractionalNumber(promotedMin.amount)} to ${formatFractionalNumber(promotedMax.amount)}`;
        const pluralUnit = promotedMax.unit ? pluralizeUnit(promotedMax.unit, promotedMax.amount) : "";
        const spec = group.packageSpec ? `${group.packageSpec} ` : "";
        totalDisplay = `${formattedNumber} ${spec}${pluralUnit} ${group.fallbackName}`.trim();
      } else {
        const promoted = promoteUnit(totalNumericMax, group.allSameUnit);
        const formattedNumber = formatFractionalNumber(promoted.amount);
        const pluralUnit = promoted.unit ? pluralizeUnit(promoted.unit, promoted.amount) : "";
        const spec = group.packageSpec ? `${group.packageSpec} ` : "";
        totalDisplay = `${formattedNumber} ${spec}${pluralUnit} ${group.fallbackName}`.trim();
      }
    } else if (group.unitFamily === "volume" && rationalToNumber(group.baseUnitSumMax) > 0) {
      const totalMl = rationalToNumber(group.baseUnitSumMax);
      const cups = totalMl / VOLUME_TO_ML.cup;
      let promoted;
      if (cups >= 0.25) {
        promoted = promoteUnit(cups, "cup");
      } else {
        const tbsp = totalMl / VOLUME_TO_ML.tbsp;
        promoted = promoteUnit(tbsp, "tbsp");
      }
      const formattedNumber = formatFractionalNumber(promoted.amount);
      const pluralUnit = promoted.unit ? pluralizeUnit(promoted.unit, promoted.amount) : "";
      const spec = group.packageSpec ? `${group.packageSpec} ` : "";
      totalDisplay = `${formattedNumber} ${spec}${pluralUnit} ${group.fallbackName}`.trim();
    } else if (group.unitFamily === "weight" && rationalToNumber(group.baseUnitSumMax) > 0) {
      const totalG = rationalToNumber(group.baseUnitSumMax);
      let formattedNumber: string;
      let unitStr: string;
      if (totalG >= WEIGHT_TO_G.lb) {
        const lb = totalG / WEIGHT_TO_G.lb;
        formattedNumber = formatFractionalNumber(lb);
        unitStr = pluralizeUnit("lb", lb);
      } else if (totalG >= WEIGHT_TO_G.oz) {
        const oz = totalG / WEIGHT_TO_G.oz;
        formattedNumber = formatFractionalNumber(oz);
        unitStr = pluralizeUnit("oz", oz);
      } else {
        formattedNumber = formatFractionalNumber(totalG);
        unitStr = "g";
      }
      const spec = group.packageSpec ? `${group.packageSpec} ` : "";
      totalDisplay = `${formattedNumber} ${spec}${unitStr} ${group.fallbackName}`.trim();
    } else {
      const formattedNumber = isRange
        ? `${formatFractionalNumber(totalNumericMin)} to ${formatFractionalNumber(totalNumericMax)}`
        : formatFractionalNumber(totalNumericMax);
      const spec = group.packageSpec ? `${group.packageSpec} ` : "";
      totalDisplay = `${formattedNumber} ${spec}${group.fallbackName}`.trim();
    }

    items.push({
      ingredientId: group.dictionaryItem?.id,
      displayName: group.fallbackName,
      aisle: group.aisle,
      totalDisplay,
      unitFamily: group.unitFamily,
      notes: Array.from(group.notes),
      traces: group.traces,
      isMatched: group.dictionaryItem !== undefined
    });
  }

  const alsoNeeded: { name: string; traces: ContributionTrace[] }[] = [];
  for (const [name, traces] of alsoNeededMap.entries()) {
    alsoNeeded.push({ name, traces });
  }

  return { items, alsoNeeded };
}
