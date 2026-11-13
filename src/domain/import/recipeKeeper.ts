import { unzipSync, strFromU8 } from "fflate";
import type { Recipe, Step, RecipeRating, IngredientGroup, DirectionGroup } from "../recipe/types";
import { normalizeRecipe } from "../recipe/normalize";
import { parseIsoDuration } from "./jsonld";

export interface ImportedPhotoRecord {
  id: string;
  recipeId: string;
  filename: string;
  blob: Uint8Array;
}

export interface ImportedRecipeKeeperResult {
  recipes: Recipe[];
  photos: ImportedPhotoRecord[];
  warnings: string[];
}

// Check if a line is an ingredient group heading
function isGroupHeading(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.endsWith(":") && trimmed.length < 50) return true;
  if (/^(for the|to serve|topping|filling|crust|glaze|dough|sauce|dressing)/i.test(trimmed) && trimmed.length < 50) {
    return true;
  }
  return false;
}

// Clean group heading by removing trailing colon
function cleanHeading(text: string): string {
  return text.trim().replace(/:$/, "").trim();
}

// Extract image reference from a recipe element or block
function extractImageRef(elementOrBlockText: string): string | null {
  const match = /<[^>]+(?:itemprop=["']image["']|class=["'][^"']*recipe-photo[^"']*["'])[^>]*(?:src|content)=["']([^"']+)["']/i.exec(elementOrBlockText) ||
    /<img[^>]+src=["']([^"']+)["']/i.exec(elementOrBlockText);
  if (!match) return null;

  const rawPath = match[1].trim();
  // Strip leading directory paths (e.g. images/photo.jpg -> photo.jpg)
  const filename = rawPath.replace(/^.*[\\/]/, "");
  return filename || null;
}

// Parse ingredient lines into grouped ingredient structures
function parseIngredientGroups(rawLines: string[]): IngredientGroup[] {
  const groups: IngredientGroup[] = [];
  let currentHeading: string | undefined = undefined;
  let currentItems: { id: string; raw: string; scalable: boolean }[] = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i].trim();
    if (!line) continue;

    if (isGroupHeading(line) && currentItems.length > 0) {
      groups.push({
        heading: currentHeading,
        items: currentItems
      });
      currentHeading = cleanHeading(line);
      currentItems = [];
    } else if (isGroupHeading(line) && currentItems.length === 0) {
      currentHeading = cleanHeading(line);
    } else {
      currentItems.push({
        id: `ing-${groups.length + 1}-${currentItems.length + 1}`,
        raw: line,
        scalable: true
      });
    }
  }

  if (currentItems.length > 0) {
    groups.push({
      heading: currentHeading,
      items: currentItems
    });
  }

  return groups.length > 0 ? groups : [{ items: [] }];
}

// Parse step lines into grouped direction structures
function parseDirectionGroups(rawSteps: string[]): DirectionGroup[] {
  const groups: DirectionGroup[] = [];
  let currentHeading: string | undefined = undefined;
  let currentSteps: Step[] = [];

  for (let i = 0; i < rawSteps.length; i += 1) {
    const text = rawSteps[i].trim();
    if (!text) continue;

    if (isGroupHeading(text) && currentSteps.length > 0) {
      groups.push({
        heading: currentHeading,
        steps: currentSteps
      });
      currentHeading = cleanHeading(text);
      currentSteps = [];
    } else if (isGroupHeading(text) && currentSteps.length === 0) {
      currentHeading = cleanHeading(text);
    } else {
      currentSteps.push({
        id: `step-${groups.length + 1}-${currentSteps.length + 1}`,
        text
      });
    }
  }

  if (currentSteps.length > 0) {
    groups.push({
      heading: currentHeading,
      steps: currentSteps
    });
  }

  return groups.length > 0 ? groups : [{ steps: [] }];
}

// Parse an HTML document or snippet from Recipe Keeper
export function parseRecipeKeeperHtml(
  htmlText: string,
  imageLookup?: Map<string, Uint8Array>,
  outPhotos?: ImportedPhotoRecord[]
): Recipe[] {
  // Browser DOMParser implementation
  if (typeof DOMParser !== "undefined") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const recipes: Recipe[] = [];

    let recipeElements = Array.from(
      doc.querySelectorAll('[itemtype*="schema.org/Recipe"], [itemtype*="schema.org/recipe"]')
    );

    if (recipeElements.length === 0) {
      const possibleBlocks = doc.querySelectorAll(".recipe, .recipe-content, article");
      if (possibleBlocks.length > 0) {
        recipeElements = Array.from(possibleBlocks);
      } else {
        recipeElements = [doc.body];
      }
    }

    for (let index = 0; index < recipeElements.length; index += 1) {
      const el = recipeElements[index];
      const nameEl = el.querySelector('[itemprop="name"], h1, .recipe-title');
      const title = nameEl ? (nameEl.textContent || "").trim() : `Imported Recipe ${index + 1}`;

      const descEl = el.querySelector('[itemprop="description"]');
      const description = descEl ? (descEl.textContent || "").trim() : undefined;

      const yieldEl = el.querySelector('[itemprop="recipeYield"]');
      let servings = 4;
      if (yieldEl) {
        const match = /\d+/.exec(yieldEl.textContent || "");
        if (match) servings = parseInt(match[0], 10);
      }

      const prepEl = el.querySelector('[itemprop="prepTime"]');
      const cookEl = el.querySelector('[itemprop="cookTime"]');
      const totalEl = el.querySelector('[itemprop="totalTime"]');

      const prepMinutes = prepEl ? parseIsoDuration(prepEl.getAttribute("content") || prepEl.textContent || "") : undefined;
      const cookMinutes = cookEl ? parseIsoDuration(cookEl.getAttribute("content") || cookEl.textContent || "") : undefined;
      const totalMinutes = totalEl ? parseIsoDuration(totalEl.getAttribute("content") || totalEl.textContent || "") : undefined;

      const ingElements = el.querySelectorAll('[itemprop="recipeIngredient"], [itemprop="ingredients"], .ingredient, .ingredients li');
      const rawIngredients: string[] = [];
      for (const ingEl of Array.from(ingElements)) {
        const text = (ingEl.textContent || "").trim();
        if (text) rawIngredients.push(text);
      }

      const dirElements = el.querySelectorAll('[itemprop="recipeInstructions"], .instruction, .step, .direction, .instructions li');
      const rawSteps: string[] = [];
      for (const dirEl of Array.from(dirElements)) {
        const text = (dirEl.textContent || "").trim();
        if (text) rawSteps.push(text);
      }

      const ratingEl = el.querySelector('[itemprop="ratingValue"], .rating');
      let rating: RecipeRating = 0;
      if (ratingEl) {
        const parsedRating = parseFloat(ratingEl.getAttribute("content") || ratingEl.textContent || "0");
        if (!isNaN(parsedRating)) {
          rating = Math.min(5, Math.max(0, Math.round(parsedRating))) as RecipeRating;
        }
      }

      const courseEl = el.querySelector('[itemprop="recipeCategory"], .course');
      const courses: string[] = [];
      if (courseEl && courseEl.textContent) {
        const splitCourses = courseEl.textContent.split(/[,/]/).map((c: string): string => c.trim()).filter(Boolean);
        courses.push(...splitCourses);
      }

      const tags: string[] = [];
      const keywordsEl = el.querySelector('[itemprop="keywords"]');
      if (keywordsEl) {
        const val = keywordsEl.getAttribute("content") || keywordsEl.textContent || "";
        const splitTags = val.split(/[,;]/).map((t: string): string => t.trim()).filter(Boolean);
        tags.push(...splitTags);
      }

      const notesEl = el.querySelector('.notes, [itemprop="comment"]');
      const notes = notesEl && notesEl.textContent ? notesEl.textContent.trim() : undefined;

      const recipeId = `rk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const photoIds: string[] = [];

      // Link photo if referenced and matching image exists
      const photoImgEl = el.querySelector('[itemprop="image"], img.recipe-photo, img');
      if (photoImgEl && imageLookup && outPhotos) {
        const src = photoImgEl.getAttribute("src") || photoImgEl.getAttribute("content") || "";
        const filename = src.replace(/^.*[\\/]/, "").toLowerCase();
        if (filename && imageLookup.has(filename)) {
          const photoBlob = imageLookup.get(filename)!;
          const photoId = `photo-${recipeId}-1`;
          photoIds.push(photoId);
          outPhotos.push({
            id: photoId,
            recipeId,
            filename,
            blob: photoBlob
          });
        }
      }

      recipes.push(
        normalizeRecipe({
          id: recipeId,
          title,
          description,
          servings: Math.max(1, servings),
          prepMinutes,
          cookMinutes,
          totalMinutes,
          ingredientGroups: parseIngredientGroups(rawIngredients),
          directionGroups: parseDirectionGroups(rawSteps),
          notes,
          cookLog: [],
          courses,
          categories: [],
          collectionIds: [],
          tags,
          rating,
          favorite: false,
          photoIds,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          schemaVersion: 1
        })
      );
    }

    return recipes;
  }

  // Node.js fallback using regular expressions
  const recipeBlocks = htmlText
    .split(/(?=<div[^>]+itemtype=["'][^"']*schema\.org\/recipe)/i)
    .filter((b: string): boolean => /schema\.org\/recipe/i.test(b));

  const blocksToParse = recipeBlocks.length > 0 ? recipeBlocks : [htmlText];
  const parsedFallbackRecipes: Recipe[] = [];

  for (const block of blocksToParse) {
    const titleMatch = /<[^>]+itemprop=["']name["'][^>]*>([^<]+)<\/[^>]+>/i.exec(block) ||
      /<h1[^>]*>([^<]+)<\/h1>/i.exec(block);
    const title = titleMatch ? titleMatch[1].trim() : "Imported Recipe";

    const descMatch = /<[^>]+itemprop=["']description["'][^>]*>([^<]+)<\/[^>]+>/i.exec(block);
    const description = descMatch ? descMatch[1].trim() : undefined;

    const yieldMatch = /<[^>]+itemprop=["']recipeYield["'][^>]*>([^<]+)<\/[^>]+>/i.exec(block);
    const servings = yieldMatch ? parseInt(/\d+/.exec(yieldMatch[1])?.[0] || "4", 10) : 4;

    const prepMatch = /<[^>]+itemprop=["']prepTime["'][^>]*content=["']([^"']+)["']/i.exec(block);
    const prepMinutes = prepMatch ? parseIsoDuration(prepMatch[1]) : undefined;

    const cookMatch = /<[^>]+itemprop=["']cookTime["'][^>]*content=["']([^"']+)["']/i.exec(block);
    const cookMinutes = cookMatch ? parseIsoDuration(cookMatch[1]) : undefined;

    const categoryMatch = /<[^>]+itemprop=["']recipeCategory["'][^>]*>([^<]+)<\/[^>]+>/i.exec(block);
    const courses = categoryMatch ? [categoryMatch[1].trim()] : [];

    const rawIngredients: string[] = [];
    const ingRegex = /<li[^>]*itemprop=["']recipeIngredient["'][^>]*>([^<]+)<\/li>/gi;
    let ingMatch: RegExpExecArray | null;
    while ((ingMatch = ingRegex.exec(block)) !== null) {
      rawIngredients.push(ingMatch[1].trim());
    }

    const rawSteps: string[] = [];
    const stepRegex = /<li[^>]*itemprop=["']recipeInstructions["'][^>]*>([^<]+)<\/li>/gi;
    let stepMatch: RegExpExecArray | null;
    while ((stepMatch = stepRegex.exec(block)) !== null) {
      rawSteps.push(stepMatch[1].trim());
    }

    const notesMatch = /<div class=["']notes["'][^>]*>([^<]+)<\/div>/i.exec(block);
    const notes = notesMatch ? notesMatch[1].trim() : undefined;

    const recipeId = `rk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const photoIds: string[] = [];

    const imageRef = extractImageRef(block);
    if (imageRef && imageLookup && outPhotos) {
      const lowerFile = imageRef.toLowerCase();
      if (imageLookup.has(lowerFile)) {
        const photoBlob = imageLookup.get(lowerFile)!;
        const photoId = `photo-${recipeId}-1`;
        photoIds.push(photoId);
        outPhotos.push({
          id: photoId,
          recipeId,
          filename: lowerFile,
          blob: photoBlob
        });
      }
    }

    const recipe: Recipe = {
      id: recipeId,
      title,
      description,
      servings: Math.max(1, servings),
      prepMinutes,
      cookMinutes,
      ingredientGroups: parseIngredientGroups(rawIngredients),
      directionGroups: parseDirectionGroups(rawSteps),
      notes,
      cookLog: [],
      courses,
      categories: [],
      collectionIds: [],
      tags: [],
      rating: 5,
      favorite: false,
      photoIds,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      schemaVersion: 1
    };

    parsedFallbackRecipes.push(normalizeRecipe(recipe));
  }

  return parsedFallbackRecipes;
}

// Unpack a Recipe Keeper zip archive containing one or many HTML files and photos
export function parseRecipeKeeperZip(zipBytes: Uint8Array): ImportedRecipeKeeperResult {
  const decompressed = unzipSync(zipBytes);
  const warnings: string[] = [];
  const photos: ImportedPhotoRecord[] = [];

  // Build case-insensitive image lookup map from archive
  const imageLookup = new Map<string, Uint8Array>();
  for (const [filePath, fileBytes] of Object.entries(decompressed)) {
    if (fileBytes.byteLength === 0 || filePath.includes("__MACOSX")) continue;
    const isImage = /\.(jpe?g|png|webp|gif|bmp)$/i.test(filePath);
    if (isImage) {
      const baseName = filePath.replace(/^.*[\\/]/, "").toLowerCase();
      imageLookup.set(baseName, fileBytes);
    }
  }

  // Find all HTML files in archive
  const htmlFiles = Object.keys(decompressed).filter((name: string): boolean => {
    return (
      (name.toLowerCase().endsWith(".html") || name.toLowerCase().endsWith(".htm")) &&
      !name.includes("__MACOSX")
    );
  });

  if (htmlFiles.length === 0) {
    throw new Error("Invalid Recipe Keeper export: no recipes.html or HTML files found");
  }

  const allRecipes: Recipe[] = [];

  for (const htmlFile of htmlFiles) {
    try {
      const htmlText = strFromU8(decompressed[htmlFile]);
      const fileRecipes = parseRecipeKeeperHtml(htmlText, imageLookup, photos);
      allRecipes.push(...fileRecipes);
    } catch {
      warnings.push(`Failed to parse HTML file: ${htmlFile}`);
    }
  }

  // Also include any standalone images not referenced in HTML
  for (const [name, blob] of imageLookup.entries()) {
    const alreadyIncluded = photos.some((p: ImportedPhotoRecord): boolean => p.filename === name);
    if (!alreadyIncluded) {
      photos.push({
        id: `photo-orphaned-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        recipeId: "",
        filename: name,
        blob
      });
    }
  }

  return {
    recipes: allRecipes,
    photos,
    warnings
  };
}
