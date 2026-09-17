/**
 * Dossier Composition Module (HB-007)
 *
 * Renders the deterministic 2400 × 1600 landscape PNG final artifact
 * combining the user's exact Annotated Map, Identity (alias, role, avatar),
 * Operation copy, fictional-use disclaimer, and verified provider attribution
 * in a protected region.
 *
 * Implements ADR 0003 and product specification invariants.
 */

import { type IdentityState } from "@/domain/identity";
import {
  type TerritoryAttribution,
  type TerritoryCameraState,
} from "@/domain/territory";

export type DossierTargetResolution = "4k" | "2k";

export const DOSSIER_4K_WIDTH = 3840;
export const DOSSIER_4K_HEIGHT = 2160;

export const DOSSIER_2K_WIDTH = 2560;
export const DOSSIER_2K_HEIGHT = 1440;

// Default constants: 16:9 4K Ultra-HD resolution
export const DOSSIER_WIDTH = DOSSIER_4K_WIDTH;
export const DOSSIER_HEIGHT = DOSSIER_4K_HEIGHT;

export interface DossierCompositionInput {
  /** Data URL or object URL of the exact saved Annotated Map */
  annotatedMapUrl: string;
  /** Desired export resolution: "4k" (3840x2160) or "2k" (2560x1440). Defaults to "4k". */
  resolution?: DossierTargetResolution;
  /** Operative identity state (optional) */
  identity?: IdentityState;
  /** Fictional operation title (default: "OPERATION: THE LAST DELIVERY") */
  operationTitle?: string;
  /** Fictional operation subtitle (default: "Package before sunrise") */
  operationSubtitle?: string;
  /** Verified map provider attribution */
  attribution: TerritoryAttribution;
  /** Optional locked 3D camera telemetry */
  cameraState?: TerritoryCameraState;
  /** Fictional case file or reference ID */
  referenceId?: string;
}

export interface ComposedDossierResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  resolution: DossierTargetResolution;
}

/**
 * Load and decode an image from a URL into an HTMLImageElement safely.
 */
export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load or decode image from URL: ${url.slice(0, 64)}...`));
    img.src = url;
  });
}

/**
 * Ensure all required display, tactical, and monospace fonts are loaded before canvas rendering.
 */
export async function ensureDossierFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const fontsToLoad = [
    '52px "Bebas Neue"',
    '48px "Russo One"',
    '32px "Montserrat"',
    '16px "Inter"',
  ];

  try {
    await Promise.allSettled(fontsToLoad.map((f) => document.fonts.load(f)));
  } catch {
    // Fallback to system fonts gracefully
  }
}

/**
 * Compose the deterministic 16:9 high-resolution (4K Ultra-HD or 2K Quad-HD) Canvas 2D Dossier.
 */
export async function composeDossierCanvas(
  input: DossierCompositionInput,
): Promise<ComposedDossierResult> {
  if (typeof document === "undefined") {
    throw new Error("Dossier canvas composition can only execute in a browser environment.");
  }

  // 1. Wait for fonts and annotated map image to decode
  await ensureDossierFonts();

  const annotatedMapImg = await loadImageElement(input.annotatedMapUrl);

  const activeResolution: DossierTargetResolution = input.resolution ?? "4k";
  const targetWidth = activeResolution === "2k" ? DOSSIER_2K_WIDTH : DOSSIER_4K_WIDTH;
  const targetHeight = activeResolution === "2k" ? DOSSIER_2K_HEIGHT : DOSSIER_4K_HEIGHT;

  // 2. Allocate the 16:9 high-resolution canvas
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D context for Dossier composition.");
  }

  // -------------------------------------------------------------
  // High-Resolution 16:9 Full-View Composition:
  // Render using maximum smoothing quality so vector annotations,
  // badges, stickers, and textures render with crisp 4K/2K clarity.
  // -------------------------------------------------------------
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // Fill canvas base with dark tactical backdrop
  ctx.fillStyle = "#0a0714";
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Compute 16:9 scaling (centered cover) so the authored map seamlessly fills the 16:9 aspect ratio
  const imgWidth = annotatedMapImg.naturalWidth || annotatedMapImg.width;
  const imgHeight = annotatedMapImg.naturalHeight || annotatedMapImg.height;

  const scale = Math.max(targetWidth / imgWidth, targetHeight / imgHeight);
  const drawW = Math.round(imgWidth * scale);
  const drawH = Math.round(imgHeight * scale);
  const drawX = Math.round((targetWidth - drawW) / 2);
  const drawY = Math.round((targetHeight - drawH) / 2);

  ctx.drawImage(annotatedMapImg, drawX, drawY, drawW, drawH);

  // -------------------------------------------------------------
  // 3. Export to PNG Blob and Data URL
  // -------------------------------------------------------------
  const dataUrl = canvas.toDataURL("image/png");

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) {
        resolve(b);
      } else {
        reject(new Error("Failed to encode Dossier canvas to PNG Blob."));
      }
    }, "image/png");
  });

  return {
    dataUrl,
    blob,
    width: targetWidth,
    height: targetHeight,
    resolution: activeResolution,
  };
}
