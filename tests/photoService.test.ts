import { describe, it, expect } from "vitest";
import {
  computeCropRectangle,
  computeResizeDimensions,
  generateCoursePlaceholderSvg,
  processImageFileToBlobs
} from "../src/domain/photos/photoService";

describe("Photo Processing Service", (): void => {
  it("computes centered crop rectangle for wide images (16:9 hero)", (): void => {
    // 2000x1000 is wider than 16:9 (which would be 1778x1000)
    const crop = computeCropRectangle(2000, 1000, 16 / 9);
    expect(crop.height).toBe(1000);
    expect(crop.width).toBe(1778);
    expect(crop.x).toBe(111);
    expect(crop.y).toBe(0);
  });

  it("computes centered crop rectangle for tall images (16:9 hero)", (): void => {
    // 1600x1200 is taller than 16:9 (which would be 1600x900)
    const crop = computeCropRectangle(1600, 1200, 16 / 9);
    expect(crop.width).toBe(1600);
    expect(crop.height).toBe(900);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(150);
  });

  it("computes 1:1 square crop for square thumbnails", (): void => {
    const crop = computeCropRectangle(1200, 800, 1.0);
    expect(crop.width).toBe(800);
    expect(crop.height).toBe(800);
    expect(crop.x).toBe(200);
    expect(crop.y).toBe(0);
  });

  it("scales down large images maintaining aspect ratio", (): void => {
    const resized = computeResizeDimensions(3200, 1800, 1600);
    expect(resized.width).toBe(1600);
    expect(resized.height).toBe(900);

    const resizedPortrait = computeResizeDimensions(1800, 3200, 1600);
    expect(resizedPortrait.height).toBe(1600);
    expect(resizedPortrait.width).toBe(900);
  });

  it("leaves images smaller than max edge unchanged", (): void => {
    const dimensions = computeResizeDimensions(800, 600, 1600);
    expect(dimensions.width).toBe(800);
    expect(dimensions.height).toBe(600);
  });

  it("generates valid course placeholder SVGs with title and course labels", (): void => {
    const breakfastSvg = generateCoursePlaceholderSvg("Breakfast", "Blueberry Pancakes");
    expect(breakfastSvg).toContain("<svg");
    expect(breakfastSvg).toContain("Blueberry Pancakes");
    expect(breakfastSvg).toContain("Breakfast");

    const soupSvg = generateCoursePlaceholderSvg("Soup", "Tomato Basil Bisque");
    expect(soupSvg).toContain("Tomato Basil Bisque");
    expect(soupSvg).toContain("Soup");

    const dessertSvg = generateCoursePlaceholderSvg("Dessert", "Chocolate Mousse");
    expect(dessertSvg).toContain("Chocolate Mousse");
    expect(dessertSvg).toContain("Dessert");
  });

  it("sanitizes HTML special characters in recipe title", (): void => {
    const svg = generateCoursePlaceholderSvg("Dinner", "Mac & Cheese <Special>");
    expect(svg).not.toContain("<Special>");
    expect(svg).toContain("Mac  Cheese Special");
  });

  it("processes image blob into photo records with hero and thumbnail", async (): Promise<void> => {
    const dummyBlob = new Blob(["test-image-binary"], { type: "image/jpeg" });
    const result = await processImageFileToBlobs(dummyBlob, "rec-123");
    expect(result.id).toContain("photo-rec-123");
    expect(result.heroBlob).toBeDefined();
    expect(result.thumbBlob).toBeDefined();
  });
});
