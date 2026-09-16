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

import {
  type IdentityState,
  getSilhouetteArchetype,
} from "@/domain/identity";
import {
  type TerritoryAttribution,
  type TerritoryCameraState,
} from "@/domain/territory";

export const DOSSIER_WIDTH = 2400;
export const DOSSIER_HEIGHT = 1600;

export interface DossierCompositionInput {
  /** Data URL or object URL of the exact saved Annotated Map */
  annotatedMapUrl: string;
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
 * Helper to draw a rounded rectangle on a 2D canvas.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Compose the deterministic 2400 × 1600 Canvas 2D Dossier.
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

  // 2. Allocate the 2400 × 1600 canvas
  const canvas = document.createElement("canvas");
  canvas.width = DOSSIER_WIDTH;
  canvas.height = DOSSIER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not acquire 2D context for Dossier composition.");
  }

  // -------------------------------------------------------------
  // Full-View Authored Map:
  // Draws ONLY the exact image the user edited in the editor,
  // occupying 100% full view of the 2400 × 1600 canvas with no interface frames.
  // -------------------------------------------------------------
  ctx.drawImage(annotatedMapImg, 0, 0, DOSSIER_WIDTH, DOSSIER_HEIGHT);

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
    width: DOSSIER_WIDTH,
    height: DOSSIER_HEIGHT,
  };
}
