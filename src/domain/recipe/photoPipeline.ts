import { db } from "../../data/db";
import type { PhotoRecord } from "./types";

export interface ProcessedPhotoResult {
  photoId: string;
  heroBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
}

export interface ImportedBinaryPhoto {
  id: string;
  recipeId?: string;
  filename?: string;
  blob: Uint8Array;
}

const hydratedPhotoUrls = new Map<string, string>();

export function registerResolvedPhotoUrl(photoId: string, url: string): void {
  hydratedPhotoUrls.set(photoId, url);
}

export async function hydratePhotoUrlCache(): Promise<void> {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
    return;
  }
  try {
    const records = await db.photos.toArray();
    for (const rec of records) {
      if (!hydratedPhotoUrls.has(rec.id)) {
        const blob = rec.hero || rec.thumb;
        if (blob instanceof Blob) {
          hydratedPhotoUrls.set(rec.id, URL.createObjectURL(blob));
        }
      }
    }
  } catch {
    // IndexedDB unavailable in Node test runtime
  }
}

export async function saveImportedPhotosToDb(photos: ImportedBinaryPhoto[]): Promise<void> {
  if (photos.length === 0 || typeof Blob === "undefined") return;
  for (const item of photos) {
    const ext = (item.filename || item.id || "").toLowerCase();
    const mime = ext.endsWith(".png")
      ? "image/png"
      : ext.endsWith(".webp")
        ? "image/webp"
        : ext.endsWith(".gif")
          ? "image/gif"
          : "image/jpeg";
    const copy = new Uint8Array(item.blob.byteLength);
    copy.set(item.blob);
    const blob = new Blob([copy], { type: mime });
    try {
      await db.photos.put({
        id: item.id,
        recipeId: item.recipeId || "",
        hero: blob,
        thumb: blob,
        width: 0,
        height: 0
      });
    } catch {
      // Skip IndexedDB write if unavailable in unit tests
    }
    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      registerResolvedPhotoUrl(item.id, URL.createObjectURL(blob));
    }
  }
}

export async function processAndSavePhoto(
  file: Blob,
  recipeId: string,
  caption?: string
): Promise<ProcessedPhotoResult> {
  const photoId = `photo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const bitmap = await createImageBitmap(file);

  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;

  const maxHeroEdge = 1600;
  const scaleRatio = Math.min(1, maxHeroEdge / Math.max(originalWidth, originalHeight));
  const heroWidth = Math.round(originalWidth * scaleRatio);
  const heroHeight = Math.round(originalHeight * scaleRatio);

  const heroCanvas = document.createElement("canvas");
  heroCanvas.width = heroWidth;
  heroCanvas.height = heroHeight;
  const heroContext = heroCanvas.getContext("2d");
  if (!heroContext) {
    throw new Error("Canvas context initialization failed");
  }
  heroContext.drawImage(bitmap, 0, 0, heroWidth, heroHeight);
  const heroBlob = await new Promise<Blob>((resolve, reject) => {
    heroCanvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Hero encoding failed"))),
      "image/webp",
      0.82
    );
  });

  const thumbSize = 480;
  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbSize;
  thumbCanvas.height = thumbSize;
  const thumbContext = thumbCanvas.getContext("2d");
  if (!thumbContext) {
    throw new Error("Canvas context initialization failed");
  }

  const squareDimension = Math.min(originalWidth, originalHeight);
  const sourceX = (originalWidth - squareDimension) / 2;
  const sourceY = (originalHeight - squareDimension) / 2;
  thumbContext.drawImage(
    bitmap,
    sourceX,
    sourceY,
    squareDimension,
    squareDimension,
    0,
    0,
    thumbSize,
    thumbSize
  );

  const thumbBlob = await new Promise<Blob>((resolve, reject) => {
    thumbCanvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("Thumb encoding failed"))),
      "image/webp",
      0.8
    );
  });

  const photoRecord: PhotoRecord = {
    id: photoId,
    recipeId,
    hero: heroBlob,
    thumb: thumbBlob,
    width: heroWidth,
    height: heroHeight,
    caption
  };

  await db.photos.put(photoRecord);
  if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
    registerResolvedPhotoUrl(photoId, URL.createObjectURL(heroBlob));
  }

  return {
    photoId,
    heroBlob,
    thumbBlob,
    width: heroWidth,
    height: heroHeight
  };
}

export function resolvePhotoUrl(photoId?: string): string | undefined {
  if (!photoId) return undefined;
  const hydrated = hydratedPhotoUrls.get(photoId);
  if (hydrated) return hydrated;

  if (
    photoId.startsWith("http://") ||
    photoId.startsWith("https://") ||
    photoId.startsWith("data:") ||
    photoId.startsWith("blob:")
  ) {
    return photoId;
  }

  if (photoId.startsWith("/recipe-photos/") || photoId.startsWith("./recipe-photos/") || photoId.startsWith("recipe-photos/")) {
    const clean = photoId.replace(/^\.?\//, "");
    return `./${clean}`;
  }

  if (photoId.endsWith(".png") || photoId.endsWith(".jpg") || photoId.endsWith(".jpeg") || photoId.endsWith(".webp")) {
    const filename = photoId.replace(/^[/\\]+/, "");
    return `./recipe-photos/${filename}`;
  }

  return undefined;
}
