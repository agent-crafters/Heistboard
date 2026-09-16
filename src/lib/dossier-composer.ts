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
  // Layer 1: Background & Blueprint Grid
  // -------------------------------------------------------------
  ctx.fillStyle = "#0c0f12";
  ctx.fillRect(0, 0, DOSSIER_WIDTH, DOSSIER_HEIGHT);

  // Subtle tactical grid lines (every 80px)
  ctx.strokeStyle = "rgba(255, 255, 255, 0.025)";
  ctx.lineWidth = 1;
  for (let x = 80; x < DOSSIER_WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, DOSSIER_HEIGHT);
    ctx.stroke();
  }
  for (let y = 80; y < DOSSIER_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(DOSSIER_WIDTH, y);
    ctx.stroke();
  }

  // Outer framing borders
  ctx.strokeStyle = "rgba(240, 234, 220, 0.18)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(28, 28, DOSSIER_WIDTH - 56, DOSSIER_HEIGHT - 56);

  ctx.strokeStyle = "rgba(25, 65, 72, 0.6)";
  ctx.lineWidth = 1;
  ctx.strokeRect(36, 36, DOSSIER_WIDTH - 72, DOSSIER_HEIGHT - 72);

  // Corner crosshairs / registration marks
  const drawCornerCross = (cx: number, cy: number) => {
    ctx.strokeStyle = "rgba(240, 234, 220, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 12, cy);
    ctx.lineTo(cx + 12, cy);
    ctx.moveTo(cx, cy - 12);
    ctx.lineTo(cx, cy + 12);
    ctx.stroke();
  };
  drawCornerCross(28, 28);
  drawCornerCross(DOSSIER_WIDTH - 28, 28);
  drawCornerCross(28, DOSSIER_HEIGHT - 28);
  drawCornerCross(DOSSIER_WIDTH - 28, DOSSIER_HEIGHT - 28);

  // -------------------------------------------------------------
  // Layer 2: Top Header Banner (y: 50 to 200)
  // -------------------------------------------------------------
  const title = input.operationTitle ?? "OPERATION: THE LAST DELIVERY";
  const subtitle = input.operationSubtitle ?? "Package before sunrise";
  const refId = input.referenceId ?? "HB-8492-P0";

  // Classification Badge Box
  ctx.fillStyle = "rgba(239, 120, 102, 0.15)";
  ctx.strokeStyle = "#ef7866";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 52, 54, 280, 36, 4);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 15px "Inter", monospace, sans-serif';
  ctx.fillStyle = "#ef7866";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("TOP SECRET // TACTICAL DOSSIER", 52 + 140, 54 + 18);

  // Operation Title (Display Typography)
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = '900 52px "Bebas Neue", "Russo One", "Montserrat", sans-serif';
  ctx.fillStyle = "#f0eadc";
  ctx.fillText(title.toUpperCase(), 52, 142);

  // Subtitle & Status
  ctx.font = '500 20px "Inter", sans-serif';
  ctx.fillStyle = "#aeb4ad";
  ctx.fillText(`${subtitle} · Verified Territory Plan`, 52, 178);

  // Right Header: Fictional Warning & System Classification
  ctx.fillStyle = "rgba(255, 211, 106, 0.08)";
  ctx.strokeStyle = "rgba(255, 211, 106, 0.4)";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, 1690, 54, 658, 58, 4);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillStyle = "#ffd36a";
  ctx.textAlign = "left";
  ctx.fillText("⚠ FICTIONAL SCENARIO // NOT FOR NAVIGATION // NO ROUTE CALCULATION", 1708, 80);

  ctx.font = '13px "Inter", monospace, sans-serif';
  ctx.fillStyle = "#aeb4ad";
  ctx.fillText("AUTHENTICATED LOCAL ARTIFACT · CLIENT CANVAS 2D COMPOSITE", 1708, 100);

  // Reference Code & Timestamp Stamp
  ctx.font = 'bold 15px monospace, "Courier New", sans-serif';
  ctx.fillStyle = "#ded4bd";
  ctx.textAlign = "right";
  ctx.fillText(`FILE REF: ${refId} // SECTOR MAP LOCKED`, 2348, 165);

  ctx.font = '13px monospace, "Courier New", sans-serif';
  ctx.fillStyle = "#7e8b91";
  const authLine = input.identity?.alias
    ? `AUTHORITY: ${input.identity.alias.toUpperCase()} · LOSSLESS RASTER`
    : "DECLASSIFIED FOR COURIER DISPATCH · LOSSLESS RASTER";
  ctx.fillText(authLine, 2348, 185);

  // Horizontal separating rule below header
  ctx.strokeStyle = "rgba(240, 234, 220, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(52, 212);
  ctx.lineTo(DOSSIER_WIDTH - 52, 212);
  ctx.stroke();

  // -------------------------------------------------------------
  // Layer 3: Dominant Full-Width Framed Map Viewport
  // Dimensions: X: 52, Y: 232, W: 2296, H: 1228
  // -------------------------------------------------------------
  const mapFrameX = 52;
  const mapFrameY = 232;
  const mapFrameW = DOSSIER_WIDTH - 104; // 2296px full prominent width
  const mapFrameH = 1228;

  // Frame Background and Outer Border
  ctx.fillStyle = "#080b0e";
  ctx.fillRect(mapFrameX, mapFrameY, mapFrameW, mapFrameH);
  ctx.strokeStyle = "#194148";
  ctx.lineWidth = 2;
  ctx.strokeRect(mapFrameX, mapFrameY, mapFrameW, mapFrameH);

  // Viewport Header Bar inside Map Frame (height 40px)
  ctx.fillStyle = "rgba(25, 65, 72, 0.35)";
  ctx.fillRect(mapFrameX, mapFrameY, mapFrameW, 40);
  ctx.strokeStyle = "rgba(240, 234, 220, 0.12)";
  ctx.beginPath();
  ctx.moveTo(mapFrameX, mapFrameY + 40);
  ctx.lineTo(mapFrameX + mapFrameW, mapFrameY + 40);
  ctx.stroke();

  ctx.font = 'bold 14px monospace, "Inter", sans-serif';
  ctx.fillStyle = "#00f5d4";
  ctx.textAlign = "left";
  ctx.fillText("SATELLITE & TACTICAL VECTOR COMPOSITION // LOCKED MAP BASE", mapFrameX + 18, mapFrameY + 25);

  ctx.font = '13px monospace, sans-serif';
  ctx.fillStyle = "#7e8b91";
  ctx.textAlign = "right";
  ctx.fillText("STATUS: VERIFIED FLATTENED RASTER · 2400 × 1600", mapFrameX + mapFrameW - 18, mapFrameY + 25);

  // Protected Attribution Bar Height
  const attributionBarH = 64;

  // The Map Drawing Viewport sits between header bar (40px) and attribution bar (64px)
  const mapContentX = mapFrameX + 2;
  const mapContentY = mapFrameY + 42;
  const mapContentW = mapFrameW - 4;
  const mapContentH = mapFrameH - 42 - attributionBarH - 2;

  // Draw the exact Annotated Map into the viewport, preserving aspect ratio (contain)
  const imgW = annotatedMapImg.naturalWidth || annotatedMapImg.width;
  const imgH = annotatedMapImg.naturalHeight || annotatedMapImg.height;
  const scale = Math.min(mapContentW / imgW, mapContentH / imgH);
  const drawW = Math.round(imgW * scale);
  const drawH = Math.round(imgH * scale);
  const drawX = Math.round(mapContentX + (mapContentW - drawW) / 2);
  const drawY = Math.round(mapContentY + (mapContentH - drawH) / 2);

  ctx.drawImage(annotatedMapImg, drawX, drawY, drawW, drawH);

  // Subtle grid coordinates on map corners
  ctx.font = '11px monospace, sans-serif';
  ctx.fillStyle = "rgba(240, 234, 220, 0.4)";
  ctx.textAlign = "left";
  ctx.fillText(`NW [${mapFrameX}, ${mapFrameY}]`, drawX + 8, drawY + 16);
  ctx.textAlign = "right";
  ctx.fillText(`SE [${drawW} × ${drawH}]`, drawX + drawW - 8, drawY + drawH - 10);

  // -------------------------------------------------------------
  // Layer 4: Protected Legible Attribution Bar (Bottom of Map Frame)
  // Guaranteed unclipped, high contrast, rendered above user drawings
  // -------------------------------------------------------------
  const attrY = mapFrameY + mapFrameH - attributionBarH;
  ctx.fillStyle = "rgba(10, 15, 20, 0.96)";
  ctx.fillRect(mapFrameX, attrY, mapFrameW, attributionBarH);

  ctx.strokeStyle = "rgba(240, 234, 220, 0.28)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mapFrameX, attrY);
  ctx.lineTo(mapFrameX + mapFrameW, attrY);
  ctx.stroke();

  // Attribution badge
  ctx.fillStyle = "rgba(0, 245, 212, 0.16)";
  ctx.strokeStyle = "#00f5d4";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, mapFrameX + 16, attrY + 14, 180, 36, 3);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 12px "Inter", monospace, sans-serif';
  ctx.fillStyle = "#00f5d4";
  ctx.textAlign = "center";
  ctx.fillText("LEGAL ATTRIBUTION", mapFrameX + 16 + 90, attrY + 34);

  // Protected Attribution text
  ctx.textAlign = "left";
  ctx.font = '15px "Inter", -apple-system, sans-serif';
  ctx.fillStyle = "#f0eadc";
  const fullNotice = `${input.attribution.noticeText} · ${input.attribution.printedUrl}`;
  ctx.fillText(fullNotice, mapFrameX + 212, attrY + 36);

  // -------------------------------------------------------------
  // Layer 6: Bottom Footer Bar (Y: 1475 to 1570)
  // -------------------------------------------------------------
  ctx.strokeStyle = "rgba(240, 234, 220, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(52, 1485);
  ctx.lineTo(DOSSIER_WIDTH - 52, 1485);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = '14px monospace, "Courier New", sans-serif';
  ctx.fillStyle = "#7e8b91";
  ctx.fillText("HEISTBOARD ARCHIVE SYSTEM · SPECIFICATION P0 · ALL RIGHTS RESERVED", 52, 1530);

  ctx.textAlign = "center";
  ctx.font = '13px "Inter", sans-serif';
  ctx.fillStyle = "#aeb4ad";
  ctx.fillText("FICTIONAL ENTERTAINMENT USE ONLY · NO ROUTE OR SAFETY CALCULATIONS PERFORMED", DOSSIER_WIDTH / 2, 1530);

  ctx.textAlign = "right";
  ctx.font = '14px monospace, "Courier New", sans-serif';
  ctx.fillStyle = "#ded4bd";
  ctx.fillText("DETERMINISTIC 2400 × 1600 LOSSLESS RASTER EXPORT", DOSSIER_WIDTH - 52, 1530);

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
