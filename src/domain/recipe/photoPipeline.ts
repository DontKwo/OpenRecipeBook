import { db } from "../../data/db";
import type { PhotoRecord } from "./types";

export interface ProcessedPhotoResult {
  photoId: string;
  heroBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
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

  // 1. Create 1600px max edge hero
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

  // 2. Create 480px square thumbnail
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

  return {
    photoId,
    heroBlob,
    thumbBlob,
    width: heroWidth,
    height: heroHeight
  };
}
