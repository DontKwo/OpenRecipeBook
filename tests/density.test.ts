import { describe, it, expect } from "vitest";
import {
  convertVolumeToGrams,
  convertGramsToVolumeMl,
  convertFahrenheitToCelsius,
  convertCelsiusToFahrenheit,
  DENSITY_TABLE
} from "../src/domain/scaling/density";

describe("Density and Temperature Conversions", (): void => {
  it("converts 1 cup (236.6 ml) flour to grams accurately", (): void => {
    const density = DENSITY_TABLE["all-purpose-flour"].gramsPerMl;
    const grams = convertVolumeToGrams(236.6, density);
    // 236.6 * 0.53 ≈ 125g
    expect(grams).toBe(125);
  });

  it("converts 1 cup sugar to grams accurately", (): void => {
    const density = DENSITY_TABLE["granulated-sugar"].gramsPerMl;
    const grams = convertVolumeToGrams(236.6, density);
    // 236.6 * 0.85 ≈ 201g
    expect(grams).toBe(201);
  });

  it("converts grams back to volume ml", (): void => {
    const density = DENSITY_TABLE["all-purpose-flour"].gramsPerMl;
    const ml = convertGramsToVolumeMl(125, density);
    expect(ml).toBe(236);
  });

  it("converts oven temperatures accurately", (): void => {
    expect(convertFahrenheitToCelsius(350)).toBe(177);
    expect(convertFahrenheitToCelsius(400)).toBe(204);
    expect(convertCelsiusToFahrenheit(180)).toBe(356);
  });
});
