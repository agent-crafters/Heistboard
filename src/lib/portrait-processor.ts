/**
 * Portrait Processing Engine
 *
 * Client-side Canvas 2D image processor that handles square aspect ratio
 * cropping, zoom/pan framing, and restrained intelligence / crime-thriller
 * duotone and surveillance filters.
 */

import { MAX_PORTRAIT_DIMENSION_PX, type PortraitFilter } from "@/domain/identity";

export interface PortraitCropOptions {
  zoom?: number; // 1.0 to 3.0 (default: 1.0)
  offsetX?: number; // -100 to 100 (percentage offset from center)
  offsetY?: number; // -100 to 100 (percentage offset from center)
  filter?: PortraitFilter;
  targetSize?: number; // Default 512px square
}

export interface ProcessedPortraitResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

/**
 * Loads and decodes an image File cleanly into an HTMLImageElement.
 * Automatically cleans up temporary object URLs.
 */
export async function decodeImageFromFile(file: File): Promise<HTMLImageElement> {
  const blobUrl = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image could not be decoded. The file may be corrupt."));
      img.src = blobUrl;
    });

    if (typeof img.decode === "function") {
      await img.decode();
    }

    if (
      (img.naturalWidth && img.naturalWidth > MAX_PORTRAIT_DIMENSION_PX) ||
      (img.naturalHeight && img.naturalHeight > MAX_PORTRAIT_DIMENSION_PX)
    ) {
      throw new Error(
        `Image dimensions (${img.naturalWidth}×${img.naturalHeight}) exceed the ${MAX_PORTRAIT_DIMENSION_PX}×${MAX_PORTRAIT_DIMENSION_PX} maximum resolution limit.`,
      );
    }

    return img;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Crops and filters an operative portrait onto an offscreen canvas.
 * Produces a deterministic 1:1 square output.
 */
export async function cropAndFilterPortrait(
  image: HTMLImageElement,
  options: PortraitCropOptions = {},
): Promise<ProcessedPortraitResult> {
  const {
    zoom = 1.0,
    offsetX = 0,
    offsetY = 0,
    filter = "surveillance",
    targetSize = 512,
  } = options;

  const canvas = document.createElement("canvas");
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("Could not initialize 2D canvas context for portrait processing.");
  }

  // 1. Calculate source crop dimensions based on aspect ratio & zoom
  const imgW = image.naturalWidth || image.width;
  const imgH = image.naturalHeight || image.height;
  const minDim = Math.min(imgW, imgH);

  // Scaled crop dimension (higher zoom = smaller source window)
  const clampedZoom = Math.max(1.0, Math.min(3.0, zoom));
  const cropSize = minDim / clampedZoom;

  // Center coordinates with offsets
  const maxShiftX = (imgW - cropSize) / 2;
  const maxShiftY = (imgH - cropSize) / 2;

  const normalizedOffsetX = (offsetX / 100) * maxShiftX;
  const normalizedOffsetY = (offsetY / 100) * maxShiftY;

  const srcX = Math.max(0, Math.min(imgW - cropSize, (imgW - cropSize) / 2 + normalizedOffsetX));
  const srcY = Math.max(0, Math.min(imgH - cropSize, (imgH - cropSize) / 2 + normalizedOffsetY));

  // 2. Draw cropped image onto square canvas
  ctx.drawImage(image, srcX, srcY, cropSize, cropSize, 0, 0, targetSize, targetSize);

  // 3. Apply the requested filter treatment
  applyPortraitFilter(ctx, targetSize, targetSize, filter);

  // 4. Export to Blob and DataURL
  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed for portrait export."));
    }, "image/png");
  });

  return {
    dataUrl,
    blob,
    width: targetSize,
    height: targetSize,
  };
}

/**
 * Applies pixel-level or composite aesthetic filters to the portrait canvas.
 */
export function applyPortraitFilter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filter: PortraitFilter,
): void {
  if (filter === "raw") {
    // Clean raw: subtle contrast adjustment
    return;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  if (filter === "surveillance") {
    // CCTV surveillance duotone: greenish-cyan tint, boosted contrast, scanlines
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      // Perceptual luminance
      let lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // S-curve contrast boost
      lum = lum < 128 ? (lum * lum) / 128 : 255 - ((255 - lum) * (255 - lum)) / 128;

      // Pale cyan-green tint: R * 0.75, G * 1.05, B * 0.95
      data[i] = Math.min(255, lum * 0.75);
      data[i + 1] = Math.min(255, lum * 1.05);
      data[i + 2] = Math.min(255, lum * 0.95);
    }
    ctx.putImageData(imageData, 0, 0);

    // Overlay subtle scanlines every 4px
    ctx.fillStyle = "rgba(0, 20, 15, 0.18)";
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1.5);
    }

    // Vignette shadow
    applyRadialVignette(ctx, width, height, "rgba(0, 0, 0, 0.45)");
  } else if (filter === "film-noir") {
    // Dramatic monochrome film noir with rich deep blacks
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      let lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Aggressive contrast curve
      lum = Math.min(255, Math.max(0, (lum - 128) * 1.45 + 128));

      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
    }
    ctx.putImageData(imageData, 0, 0);

    // Deep edge vignette
    applyRadialVignette(ctx, width, height, "rgba(0, 0, 0, 0.75)");
  } else if (filter === "duotone-petrol") {
    // Signature Heistboard duotone: Dark Petrol (#0a2228) to Warm Paper (#f0eadc)
    // Dark: R 10, G 34, B 40
    // Light: R 240, G 234, B 220
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;

      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      data[i] = Math.round(10 + lum * (240 - 10));
      data[i + 1] = Math.round(34 + lum * (234 - 34));
      data[i + 2] = Math.round(40 + lum * (220 - 40));
    }
    ctx.putImageData(imageData, 0, 0);

    applyRadialVignette(ctx, width, height, "rgba(5, 15, 18, 0.4)");
  }
}

/**
 * Draws a radial vignette shadow darkening the corners of the canvas.
 */
function applyRadialVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  outerColor: string,
): void {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.35,
    width / 2,
    height / 2,
    width * 0.75,
  );
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(1, outerColor);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
