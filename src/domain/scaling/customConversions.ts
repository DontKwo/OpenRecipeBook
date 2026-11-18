export interface CustomUnitDefinition {
  key: string;
  label: string;
  family: "volume" | "weight";
  toBase: number;
  aliases: string[];
  isBuiltIn?: boolean;
  disabled?: boolean;
  source?: string;
}

export interface CustomDensityDefinition {
  key: string;
  name: string;
  category: string;
  gramsPerMl: number;
  source: string;
  aliases: string[];
  isBuiltIn?: boolean;
  disabled?: boolean;
}

export interface ConversionOverrideState {
  units: Record<string, CustomUnitDefinition>;
  disabledUnits: string[];
  densities: Record<string, CustomDensityDefinition>;
  disabledDensities: string[];
}

export interface TrustedSourceCitation {
  id: string;
  name: string;
  organization: string;
  scope: string;
  verifiedNotes: string;
  url: string;
}

export const TRUSTED_CONVERSION_SOURCES: TrustedSourceCitation[] = [
  {
    id: "nist-h44",
    name: "NIST Handbook 44 & NIST SP 811 / SP 430",
    organization: "National Institute of Standards and Technology (U.S. Department of Commerce)",
    scope: "Exact US Customary to SI volume and mass conversion factors",
    verifiedNotes:
      "1 tsp = 4.92892 ml, 1 tbsp = 14.78676 ml, 1 fl oz = 29.57353 ml, 1 US cup = 236.58824 ml, 1 pint = 473.17647 ml, 1 quart = 946.35295 ml, 1 gallon = 3785.41178 ml, 1 oz = 28.34952 g, 1 lb = 453.59237 g.",
    url: "https://www.nist.gov/pml/owm/metric-si/unit-conversion"
  },
  {
    id: "fda-21cfr",
    name: "FDA 21 CFR 101.9(b)(5)(viii) Household Measures",
    organization: "U.S. Food and Drug Administration",
    scope: "Metric nutrition-labeling kitchen equivalents",
    verifiedNotes:
      "1 tsp = 5 ml, 1 tbsp = 15 ml, 1 fl oz = 30 ml, 1 cup = 240 ml for simplified metric recipe conversions.",
    url: "https://www.ecfr.gov/current/title-21/chapter-I/subchapter-B/part-101"
  },
  {
    id: "usda-fdc",
    name: "USDA FoodData Central (SR Standard Reference & Survey)",
    organization: "U.S. Department of Agriculture Agricultural Research Service",
    scope: "Official gram-weight to volume density mappings across pantry, dairy, produce, fats, and grains",
    verifiedNotes:
      "Provides measured household cup/tbsp/tsp weights converted to g/ml (e.g., honey 1.42 g/ml, olive oil 0.91 g/ml, table salt 1.22 g/ml, granulated sugar 0.85 g/ml).",
    url: "https://fdc.nal.usda.gov/"
  },
  {
    id: "king-arthur",
    name: "King Arthur Baking Ingredient Weight Chart",
    organization: "King Arthur Baking Company",
    scope: "Culinary test-kitchen weight standards for flours, sweeteners, chocolate, nuts, and dairy",
    verifiedNotes:
      "Standardizes 1 cup US baking weights: brown sugar packed (213 g), butter (227 g), cocoa powder (85 g), rolled oats (89 g), fluffed all-purpose flour (120 g).",
    url: "https://www.kingarthurbaking.com/learn/ingredient-weight-chart"
  },
  {
    id: "fao-infoods",
    name: "FAO/INFOODS Density Database (Version 2.0)",
    organization: "Food and Agriculture Organization of the United Nations",
    scope: "International food specific gravity reference (g/ml)",
    verifiedNotes:
      "Cross-checks specific gravity of broths, milk, syrups, sauces, oils, and dry commodities.",
    url: "https://www.fao.org/infoods/infoods/tables-and-databases/en/"
  }
];

const STORAGE_KEY = "orb_custom_conversions";

const emptyState = (): ConversionOverrideState => ({
  units: {},
  disabledUnits: [],
  densities: {},
  disabledDensities: []
});

export const getConversionConfig = (): ConversionOverrideState => {
  if (typeof localStorage === "undefined") {
    return emptyState();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<ConversionOverrideState>;
    return {
      units: parsed.units && typeof parsed.units === "object" ? parsed.units : {},
      disabledUnits: Array.isArray(parsed.disabledUnits) ? parsed.disabledUnits : [],
      densities: parsed.densities && typeof parsed.densities === "object" ? parsed.densities : {},
      disabledDensities: Array.isArray(parsed.disabledDensities) ? parsed.disabledDensities : []
    };
  } catch {
    return emptyState();
  }
};

export const saveConversionConfig = (state: ConversionOverrideState): void => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
};

export const saveUnitOverride = (unit: CustomUnitDefinition): ConversionOverrideState => {
  const cleanKey = unit.key.toLowerCase().trim();
  const current = getConversionConfig();
  const next: ConversionOverrideState = {
    ...current,
    units: {
      ...current.units,
      [cleanKey]: {
        ...unit,
        key: cleanKey,
        disabled: false
      }
    },
    disabledUnits: current.disabledUnits.filter((k: string): boolean => k !== cleanKey)
  };
  saveConversionConfig(next);
  return next;
};

export const removeUnitConversion = (unitKey: string): ConversionOverrideState => {
  const cleanKey = unitKey.toLowerCase().trim();
  const current = getConversionConfig();
  const nextUnits = { ...current.units };
  delete nextUnits[cleanKey];
  const disabledSet = new Set(current.disabledUnits);
  disabledSet.add(cleanKey);
  const next: ConversionOverrideState = {
    ...current,
    units: nextUnits,
    disabledUnits: Array.from(disabledSet)
  };
  saveConversionConfig(next);
  return next;
};

export const restoreUnitDefault = (unitKey: string): ConversionOverrideState => {
  const cleanKey = unitKey.toLowerCase().trim();
  const current = getConversionConfig();
  const nextUnits = { ...current.units };
  delete nextUnits[cleanKey];
  const next: ConversionOverrideState = {
    ...current,
    units: nextUnits,
    disabledUnits: current.disabledUnits.filter((k: string): boolean => k !== cleanKey)
  };
  saveConversionConfig(next);
  return next;
};

export const saveDensityOverride = (record: CustomDensityDefinition): ConversionOverrideState => {
  const cleanKey = record.key.toLowerCase().trim().replace(/\s+/g, "-");
  const current = getConversionConfig();
  const next: ConversionOverrideState = {
    ...current,
    densities: {
      ...current.densities,
      [cleanKey]: {
        ...record,
        key: cleanKey,
        disabled: false
      }
    },
    disabledDensities: current.disabledDensities.filter((k: string): boolean => k !== cleanKey)
  };
  saveConversionConfig(next);
  return next;
};

export const removeDensityConversion = (densityKey: string): ConversionOverrideState => {
  const cleanKey = densityKey.toLowerCase().trim();
  const current = getConversionConfig();
  const nextDensities = { ...current.densities };
  delete nextDensities[cleanKey];
  const disabledSet = new Set(current.disabledDensities);
  disabledSet.add(cleanKey);
  const next: ConversionOverrideState = {
    ...current,
    densities: nextDensities,
    disabledDensities: Array.from(disabledSet)
  };
  saveConversionConfig(next);
  return next;
};

export const restoreDensityDefault = (densityKey: string): ConversionOverrideState => {
  const cleanKey = densityKey.toLowerCase().trim();
  const current = getConversionConfig();
  const nextDensities = { ...current.densities };
  delete nextDensities[cleanKey];
  const next: ConversionOverrideState = {
    ...current,
    densities: nextDensities,
    disabledDensities: current.disabledDensities.filter((k: string): boolean => k !== cleanKey)
  };
  saveConversionConfig(next);
  return next;
};

export const resetConversionsToDefault = (): ConversionOverrideState => {
  const fresh = emptyState();
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage removal errors
    }
  }
  return fresh;
};
