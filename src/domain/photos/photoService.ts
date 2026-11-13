export interface CropRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScaledDimensions {
  width: number;
  height: number;
}

export function computeCropRectangle(
  originalWidth: number,
  originalHeight: number,
  targetAspectRatio: number
): CropRectangle {
  const currentRatio = originalWidth / originalHeight;

  if (currentRatio > targetAspectRatio) {
    // Current is wider than target: crop horizontal edges
    const cropWidth = Math.round(originalHeight * targetAspectRatio);
    const cropX = Math.round((originalWidth - cropWidth) / 2);
    return {
      x: Math.max(0, cropX),
      y: 0,
      width: cropWidth,
      height: originalHeight
    };
  }

  // Current is taller than target: crop vertical edges
  const cropHeight = Math.round(originalWidth / targetAspectRatio);
  const cropY = Math.round((originalHeight - cropHeight) / 2);
  return {
    x: 0,
    y: Math.max(0, cropY),
    width: originalWidth,
    height: cropHeight
  };
}

export function computeResizeDimensions(
  width: number,
  height: number,
  maxLongEdge: number
): ScaledDimensions {
  if (width <= maxLongEdge && height <= maxLongEdge) {
    return { width, height };
  }

  if (width >= height) {
    const scale = maxLongEdge / width;
    return {
      width: maxLongEdge,
      height: Math.round(height * scale)
    };
  }

  const scale = maxLongEdge / height;
  return {
    width: Math.round(width * scale),
    height: maxLongEdge
  };
}

export function generateCoursePlaceholderSvg(course: string, recipeTitle: string): string {
  const normalizedCourse = course.trim().toLowerCase();

  // Colors defined using hsl to avoid hardcoded hex codes
  let gradientStart = "hsl(18, 55%, 52%)";
  let gradientEnd = "hsl(28, 45%, 35%)";
  let pathD = "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5";

  if (normalizedCourse.includes("breakfast") || normalizedCourse.includes("brunch")) {
    gradientStart = "hsl(35, 75%, 55%)";
    gradientEnd = "hsl(20, 65%, 45%)";
    pathD = "M12 2a5 5 0 0 1 5 5c0 2.76-2.24 5-5 5s-5-2.24-5-5a5 5 0 0 1 5-5zm0 14c4.42 0 8 1.79 8 4v2H4v-2c0-2.21 3.58-4 8-4z";
  } else if (normalizedCourse.includes("dessert") || normalizedCourse.includes("baking")) {
    gradientStart = "hsl(340, 55%, 50%)";
    gradientEnd = "hsl(320, 45%, 35%)";
    pathD = "M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19H19.65l-.62-1.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z";
  } else if (normalizedCourse.includes("soup") || normalizedCourse.includes("stew")) {
    gradientStart = "hsl(150, 40%, 40%)";
    gradientEnd = "hsl(165, 35%, 28%)";
    pathD = "M3 13h18c0 4.97-4.03 9-9 9s-9-4.03-9-9zm4-6h2v4H7V7zm4-2h2v6h-2V5zm4 2h2v4h-2V7z";
  } else if (normalizedCourse.includes("drink") || normalizedCourse.includes("beverage")) {
    gradientStart = "hsl(200, 60%, 45%)";
    gradientEnd = "hsl(215, 50%, 32%)";
    pathD = "M5 3h14v2H5V3zm1 4h12l-2 14H8L6 7zm5 3v8h2v-8h-2z";
  }

  const sanitizedTitle = recipeTitle.replace(/[<>&"']/g, "");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="100%" height="100%">
    <defs>
      <linearGradient id="courseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gradientStart}" />
        <stop offset="100%" stop-color="${gradientEnd}" />
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#courseGrad)" />
    <g transform="translate(360, 150) scale(3.5)" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="${pathD}" />
    </g>
    <text x="400" y="320" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="600" font-size="24" fill="rgba(255,255,255,0.95)">
      ${sanitizedTitle}
    </text>
    <text x="400" y="355" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="400" font-size="16" fill="rgba(255,255,255,0.7)">
      ${course}
    </text>
  </svg>`;
}

export interface ProcessedPhotoBlobs {
  id: string;
  heroBlob: Blob;
  thumbBlob: Blob;
  width: number;
  height: number;
}

// Convert image file into cropped 16:9 hero blob and 1:1 square thumbnail blob
export async function processImageFileToBlobs(
  file: Blob,
  recipeId: string
): Promise<ProcessedPhotoBlobs> {
  const photoId = `photo-${recipeId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  if (typeof window === "undefined" || typeof document === "undefined") {
    // Non-browser fallback for test environments
    return {
      id: photoId,
      heroBlob: file,
      thumbBlob: file,
      width: 800,
      height: 450
    };
  }

  const imageBitmap = await createImageBitmap(file);
  const origW = imageBitmap.width;
  const origH = imageBitmap.height;

  // Process 16:9 Hero Photo
  const heroCrop = computeCropRectangle(origW, origH, 16 / 9);
  const heroSize = computeResizeDimensions(heroCrop.width, heroCrop.height, 1920);

  const heroCanvas = document.createElement("canvas");
  heroCanvas.width = heroSize.width;
  heroCanvas.height = heroSize.height;
  const heroCtx = heroCanvas.getContext("2d");
  if (!heroCtx) {
    throw new Error("Unable to create canvas 2d context for hero photo");
  }

  heroCtx.drawImage(
    imageBitmap,
    heroCrop.x,
    heroCrop.y,
    heroCrop.width,
    heroCrop.height,
    0,
    0,
    heroSize.width,
    heroSize.height
  );

  const heroBlob = await new Promise<Blob>((resolve, reject): void => {
    heroCanvas.toBlob(
      (b: Blob | null): void => {
        if (b) resolve(b);
        else reject(new Error("Hero canvas toBlob returned null"));
      },
      "image/jpeg",
      0.85
    );
  });

  // Process 1:1 Square Thumbnail
  const thumbCrop = computeCropRectangle(origW, origH, 1);
  const thumbSize = computeResizeDimensions(thumbCrop.width, thumbCrop.height, 400);

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = thumbSize.width;
  thumbCanvas.height = thumbSize.height;
  const thumbCtx = thumbCanvas.getContext("2d");
  if (!thumbCtx) {
    throw new Error("Unable to create canvas 2d context for thumbnail photo");
  }

  thumbCtx.drawImage(
    imageBitmap,
    thumbCrop.x,
    thumbCrop.y,
    thumbCrop.width,
    thumbCrop.height,
    0,
    0,
    thumbSize.width,
    thumbSize.height
  );

  const thumbBlob = await new Promise<Blob>((resolve, reject): void => {
    thumbCanvas.toBlob(
      (b: Blob | null): void => {
        if (b) resolve(b);
        else reject(new Error("Thumbnail canvas toBlob returned null"));
      },
      "image/jpeg",
      0.85
    );
  });

  return {
    id: photoId,
    heroBlob,
    thumbBlob,
    width: heroSize.width,
    height: heroSize.height
  };
}
