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
  ctx.fillText("DECLASSIFIED FOR COURIER DISPATCH · LOSSLESS RASTER", 2348, 185);

  // Horizontal separating rule below header
  ctx.strokeStyle = "rgba(240, 234, 220, 0.14)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(52, 212);
  ctx.lineTo(DOSSIER_WIDTH - 52, 212);
  ctx.stroke();

  // -------------------------------------------------------------
  // Layer 3: Dominant Framed Map Viewport (Left / Center)
  // Dimensions: X: 52, Y: 232, W: 1618, H: 1228
  // -------------------------------------------------------------
  const mapFrameX = 52;
  const mapFrameY = 232;
  const mapFrameW = 1618;
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

  ctx.font = 'bold 13px monospace, "Inter", sans-serif';
  ctx.fillStyle = "#00f5d4";
  ctx.textAlign = "left";
  ctx.fillText("SATELLITE & TACTICAL VECTOR COMPOSITION // LOCKED MAP BASE", mapFrameX + 16, mapFrameY + 25);

  ctx.font = '13px monospace, sans-serif';
  ctx.fillStyle = "#7e8b91";
  ctx.textAlign = "right";
  ctx.fillText("STATUS: VERIFIED FLATTENED RASTER", mapFrameX + mapFrameW - 16, mapFrameY + 25);

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
  // Layer 5: Right Column: Tactical Mission Briefing Panel
  // Dimensions: X: 1690, Y: 232, W: 658, H: 1228
  // -------------------------------------------------------------
  const sideX = 1690;
  const sideY = 232;
  const sideW = 658;
  const sideH = 1228;

  ctx.fillStyle = "rgba(17, 22, 26, 0.85)";
  ctx.fillRect(sideX, sideY, sideW, sideH);
  ctx.strokeStyle = "rgba(240, 234, 220, 0.16)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sideX, sideY, sideW, sideH);

  // Sidebar Header
  ctx.fillStyle = "rgba(25, 65, 72, 0.35)";
  ctx.fillRect(sideX, sideY, sideW, 40);
  ctx.strokeStyle = "rgba(240, 234, 220, 0.12)";
  ctx.beginPath();
  ctx.moveTo(sideX, sideY + 40);
  ctx.lineTo(sideX + sideW, sideY + 40);
  ctx.stroke();

  ctx.font = 'bold 14px "Inter", sans-serif';
  ctx.fillStyle = "#ffd36a";
  ctx.textAlign = "left";
  ctx.fillText("TACTICAL MISSION BRIEF // SPECIFICATION", sideX + 18, sideY + 25);

  ctx.font = '13px monospace, sans-serif';
  ctx.fillStyle = "#aeb4ad";
  ctx.textAlign = "right";
  ctx.fillText("STATUS: VERIFIED", sideX + sideW - 18, sideY + 25);

  // Section 1: Mission Objectives & Action Audit (Checklist)
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillStyle = "#f0eadc";
  ctx.fillText("TACTICAL OBJECTIVES // COMPLETED", sideX + 24, sideY + 70);

  const steps = [
    { num: "01", name: "DRAW ROUTE", desc: "Trace primary courier transit across locked neighborhood streets" },
    { num: "02", name: "MARK LOCATIONS", desc: "Identify safe pickup point and emergency getaway rendezvous" },
    { num: "03", name: "COURIER NOTE", desc: "Record crucial tactical briefing note before dawn departure" },
    { num: "04", name: "VERIFY & LOCK", desc: "Confirm composite raster, attribution lock, and dossier export" },
  ];

  let stepY = sideY + 92;
  for (const step of steps) {
    ctx.fillStyle = "rgba(25, 65, 72, 0.25)";
    ctx.strokeStyle = "rgba(240, 234, 220, 0.15)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, sideX + 24, stepY, sideW - 48, 76, 4);
    ctx.fill();
    ctx.stroke();

    // Check badge
    ctx.fillStyle = "#22c55e";
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.fillText("✓", sideX + 40, stepY + 34);

    ctx.font = 'bold 15px "Inter", monospace, sans-serif';
    ctx.fillStyle = "#ffd36a";
    ctx.fillText(`${step.num} // ${step.name}`, sideX + 66, stepY + 32);

    ctx.font = '13px "Inter", sans-serif';
    ctx.fillStyle = "#aeb4ad";
    ctx.fillText(step.desc, sideX + 66, stepY + 54);

    stepY += 88;
  }

  // Divider before Telemetry
  ctx.strokeStyle = "rgba(240, 234, 220, 0.12)";
  ctx.beginPath();
  ctx.moveTo(sideX + 24, sideY + 460);
  ctx.lineTo(sideX + sideW - 24, sideY + 460);
  ctx.stroke();

  // Section 2: Territory Telemetry Box
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillStyle = "#f0eadc";
  ctx.fillText("TERRITORY TELEMETRY // CAMERA LOCK", sideX + 24, sideY + 494);

  ctx.fillStyle = "#080c0e";
  ctx.strokeStyle = "rgba(25, 65, 72, 0.5)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, sideX + 24, sideY + 514, sideW - 48, 172, 4);
  ctx.fill();
  ctx.stroke();

  ctx.font = '14px monospace, "Courier New", sans-serif';
  ctx.fillStyle = "#aeb4ad";

  if (input.cameraState) {
    const lng = input.cameraState.center[0].toFixed(5);
    const lat = input.cameraState.center[1].toFixed(5);
    ctx.fillText(`CENTER COORDS: ${lat}° N, ${lng}° E`, sideX + 44, sideY + 548);
    ctx.fillText(`ZOOM LEVEL:    ${input.cameraState.zoom.toFixed(2)}`, sideX + 44, sideY + 578);
    ctx.fillText(`PITCH / BEARING: ${input.cameraState.pitch.toFixed(1)}° / ${input.cameraState.bearing.toFixed(1)}°`, sideX + 44, sideY + 608);
    ctx.fillText(`STYLE TREATMENT: STYLIZED 3D VECTOR`, sideX + 44, sideY + 638);
  } else {
    ctx.fillText(`CENTER SECTOR: FICTIONAL DISTRICT // SECTOR 01`, sideX + 44, sideY + 548);
    ctx.fillText(`PROJECTION:    MERCATOR SPHERICAL 3D`, sideX + 44, sideY + 578);
    ctx.fillText(`CAMERA STATE:  LOCKED ORTHOGRAPHIC BASE`, sideX + 44, sideY + 608);
    ctx.fillText(`MAP RESOLUTION: LOSSLESS 2400 × 1600 RASTER`, sideX + 44, sideY + 638);
  }

  // Divider before Directives
  ctx.strokeStyle = "rgba(240, 234, 220, 0.12)";
  ctx.beginPath();
  ctx.moveTo(sideX + 24, sideY + 704);
  ctx.lineTo(sideX + sideW - 24, sideY + 704);
  ctx.stroke();

  // Section 3: Operational Directives & Security Protocol
  ctx.font = 'bold 16px "Inter", sans-serif';
  ctx.fillStyle = "#f0eadc";
  ctx.fillText("OPERATIONAL DIRECTIVES // PROTOCOL", sideX + 24, sideY + 738);

  ctx.fillStyle = "rgba(25, 65, 72, 0.2)";
  ctx.strokeStyle = "rgba(240, 234, 220, 0.15)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, sideX + 24, sideY + 758, sideW - 48, 160, 4);
  ctx.fill();
  ctx.stroke();

  ctx.font = '14px monospace, "Courier New", sans-serif';
  ctx.fillStyle = "#aeb4ad";
  ctx.fillText("SECURITY PROTOCOL: SECTOR LOCKED FOR FIELD COURIER", sideX + 44, sideY + 790);
  ctx.fillText("DATA INTEGRITY:    CLIENT-SIDE LOSSLESS RASTER 2400x1600", sideX + 44, sideY + 820);
  ctx.fillText("PRIVACY DIRECTIVE: ZERO TELEMETRY // EPHEMERAL IN-MEMORY", sideX + 44, sideY + 850);

  const operativeAlias = input.identity?.alias || "CIPHER";
  const operativeRole =
    input.identity?.portraitSource === "silhouette" && input.identity.silhouetteId
      ? getSilhouetteArchetype(input.identity.silhouetteId).role
      : "Field Operative";

  ctx.fillStyle = "#ffd36a";
  ctx.fillText(`DISPATCH AUTHORITY: ${operativeAlias.toUpperCase()} // ${operativeRole.toUpperCase()}`, sideX + 44, sideY + 882);

  // Decorative Barcode & Seal in bottom of sidebar
  ctx.strokeStyle = "rgba(240, 234, 220, 0.35)";
  ctx.lineWidth = 1.5;
  const barcodeX = sideX + 24;
  const barcodeY = sideY + 940;
  const barcodeW = sideW - 48;
  const barcodeH = 48;

  // Render a clean procedural barcode
  for (let bx = 0; bx < barcodeW; bx += 6) {
    const barWidth = (bx % 12 === 0 || bx % 18 === 0) ? 3 : 1.5;
    ctx.fillStyle = (bx % 24 === 0) ? "rgba(240, 234, 220, 0.7)" : "rgba(240, 234, 220, 0.35)";
    ctx.fillRect(barcodeX + bx, barcodeY, barWidth, barcodeH);
  }

  ctx.font = '12px monospace, sans-serif';
  ctx.fillStyle = "#7e8b91";
  ctx.textAlign = "center";
  ctx.fillText(`* ${refId}-AUTH-VERIFIED-DOSSIER *`, sideX + sideW / 2, barcodeY + barcodeH + 20);

  // Authentication Stamp Box
  ctx.fillStyle = "rgba(239, 120, 102, 0.12)";
  ctx.strokeStyle = "#ef7866";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, sideX + 24, sideY + 1040, sideW - 48, 140, 4);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 22px "Inter", sans-serif';
  ctx.fillStyle = "#ef7866";
  ctx.textAlign = "center";
  ctx.fillText("CONFIRMED OPERATIONAL DOSSIER", sideX + sideW / 2, sideY + 1090);

  ctx.font = '14px "Inter", sans-serif';
  ctx.fillStyle = "#f0eadc";
  ctx.fillText("READY FOR MISSION EXECUTION // SUNRISE DEADLINE", sideX + sideW / 2, sideY + 1130);

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
