/**
 * GTA VI Operative Identity Badge Renderer & Canvas Synchronizer
 *
 * Generates an authentic, high-octane GTA VI / Vice City Heist Record ID Badge
 * on a high-DPI Canvas 2D surface, and places/updates it as an interactive,
 * movable, and resizable element on the Unlayer Fabric.js canvas.
 */

import { getSilhouetteArchetype, type SilhouetteId } from "@/domain/identity";
import type {
  FabricCanvasLike,
  FabricImageConstructor,
  FabricObjectLike,
} from "./sticker-canvas-importer";

export type GtaBadgeTheme = "vice-neon" | "sunset-gold" | "miami-cyan" | "vice-noir";

export interface GtaBadgeOptions {
  alias: string;
  role: string;
  silhouetteId?: SilhouetteId;
  portraitUrl?: string;
  theme?: GtaBadgeTheme;
  wantedStars?: number; // 1 to 5
  bounty?: string; // e.g. "$1,250,000"
  crewCut?: string; // e.g. "35%"
  clearance?: string; // e.g. "S-TIER HEIST OPERATIVE"
}

export const DEFAULT_GTA_BADGE_OPTIONS: GtaBadgeOptions = {
  alias: "CIPHER",
  role: "THE INFILTRATOR · TACTICAL RECON",
  silhouetteId: "infiltrator",
  theme: "vice-neon",
  wantedStars: 5,
  bounty: "$1,250,000",
  crewCut: "40%",
  clearance: "LEVEL 4 // SPECIAL ACCESS",
};

interface ThemeColors {
  primary: string;
  secondary: string;
  bgStart: string;
  bgEnd: string;
  accent: string;
  textGlow: string;
}

const THEME_MAP: Record<GtaBadgeTheme, ThemeColors> = {
  "vice-neon": {
    primary: "#ff007f", // Vice Hot Pink
    secondary: "#00f5d4", // Electric Cyan
    bgStart: "#0e0818",
    bgEnd: "#1a0f2e",
    accent: "#ffd000",
    textGlow: "rgba(255, 0, 127, 0.4)",
  },
  "sunset-gold": {
    primary: "#ffd000", // Rockstar Gold
    secondary: "#ff6b35", // Sunset Orange
    bgStart: "#140e05",
    bgEnd: "#261706",
    accent: "#00f5d4",
    textGlow: "rgba(255, 208, 0, 0.45)",
  },
  "miami-cyan": {
    primary: "#00f5d4", // Cyan
    secondary: "#9d4edd", // Neon Violet
    bgStart: "#051316",
    bgEnd: "#0e1e24",
    accent: "#ff007f",
    textGlow: "rgba(0, 245, 212, 0.4)",
  },
  "vice-noir": {
    primary: "#ffffff", // Silver
    secondary: "#ffd000", // Gold
    bgStart: "#0a0d0e",
    bgEnd: "#15191b",
    accent: "#ff4d4d",
    textGlow: "rgba(255, 255, 255, 0.3)",
  },
};

/**
 * Draws a polygon with chamfered / angled corners.
 */
function drawChamferedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  ctx.lineTo(x + w, y + cut);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x + cut, y + h);
  ctx.lineTo(x, y + h - cut);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

/**
 * Renders the GTA VI Heist Record ID badge onto an offscreen Canvas 2D surface.
 */
export async function renderGtaIdentityBadgeToCanvas(
  options: GtaBadgeOptions,
): Promise<HTMLCanvasElement> {
  const merged: GtaBadgeOptions = { ...DEFAULT_GTA_BADGE_OPTIONS, ...options };
  const theme = THEME_MAP[merged.theme ?? "vice-neon"];

  const width = 760;
  const height = 300;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D context for GTA badge.");

  // 1. Draw Badge Background with Chamfered Corners
  const cut = 20;
  drawChamferedRect(ctx, 4, 4, width - 8, height - 8, cut);

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgStart);
  bgGrad.addColorStop(1, theme.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // 2. Dual Neon Gradient Border
  ctx.save();
  const borderGrad = ctx.createLinearGradient(0, 0, width, height);
  borderGrad.addColorStop(0, theme.primary);
  borderGrad.addColorStop(0.5, theme.secondary);
  borderGrad.addColorStop(1, theme.primary);
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();

  // 3. Subtle Cybernetic Grid / Scanlines Overlay
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
  ctx.lineWidth = 1;
  for (let y = 10; y < height; y += 12) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(width - 10, y);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Header Bar: "★ VICE CITY // HEIST CREW DOSSIER" + Wanted Level Stars
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(8, 8, width - 16, 42);

  // Bottom border of header
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 50);
  ctx.lineTo(width - 8, 50);
  ctx.stroke();

  // Header Title
  ctx.fillStyle = theme.accent;
  ctx.font = '900 13px "SFMono-Regular", Consolas, monospace';
  ctx.letterSpacing = "0.08em";
  ctx.textBaseline = "middle";
  ctx.fillText("★ VICE CITY // HEIST RECORD DOSSIER", 24, 28);

  // Wanted Stars: ★★★★★
  const stars = Math.max(1, Math.min(5, merged.wantedStars ?? 5));
  let starStr = "";
  for (let s = 0; s < 5; s++) {
    starStr += s < stars ? "★ " : "☆ ";
  }
  ctx.font = "bold 16px sans-serif";
  ctx.fillStyle = theme.primary;
  ctx.textAlign = "right";
  ctx.fillText(starStr.trim(), width - 24, 28);
  ctx.restore();

  // 5. Left Avatar Box (Mugshot frame)
  const avatarX = 26;
  const avatarY = 66;
  const avatarSize = 200;

  // Background of avatar
  ctx.save();
  ctx.fillStyle = "#070e10";
  ctx.fillRect(avatarX, avatarY, avatarSize, avatarSize);

  // Mugshot Height Lines in avatar background
  ctx.strokeStyle = "rgba(0, 245, 212, 0.15)";
  ctx.lineWidth = 1;
  const heights = ["6'3\"", "6'0\"", "5'9\"", "5'6\"", "5'3\""];
  heights.forEach((h, idx) => {
    const hy = avatarY + 25 + idx * 35;
    ctx.beginPath();
    ctx.moveTo(avatarX + 5, hy);
    ctx.lineTo(avatarX + avatarSize - 5, hy);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 245, 212, 0.35)";
    ctx.font = '8px "SFMono-Regular", monospace';
    ctx.textAlign = "left";
    ctx.fillText(h, avatarX + 8, hy - 3);
  });
  ctx.restore();

  // Render Image or Silhouette in avatar frame
  if (merged.portraitUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = merged.portraitUrl!;
      });
      ctx.drawImage(img, avatarX, avatarY, avatarSize, avatarSize);
    } catch {
      drawFallbackSilhouette(ctx, avatarX, avatarY, avatarSize, merged.silhouetteId);
    }
  } else {
    drawFallbackSilhouette(ctx, avatarX, avatarY, avatarSize, merged.silhouetteId);
  }

  // Neon Avatar Reticle Border
  ctx.save();
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 2;
  ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);

  // Corner brackets
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 3;
  const bLen = 12;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(avatarX, avatarY + bLen);
  ctx.lineTo(avatarX, avatarY);
  ctx.lineTo(avatarX + bLen, avatarY);
  // Top-right
  ctx.moveTo(avatarX + avatarSize - bLen, avatarY);
  ctx.lineTo(avatarX + avatarSize, avatarY);
  ctx.lineTo(avatarX + avatarSize, avatarY + bLen);
  // Bottom-left
  ctx.moveTo(avatarX, avatarY + avatarSize - bLen);
  ctx.lineTo(avatarX, avatarY + avatarSize);
  ctx.lineTo(avatarX + bLen, avatarY + avatarSize);
  // Bottom-right
  ctx.moveTo(avatarX + avatarSize - bLen, avatarY + avatarSize);
  ctx.lineTo(avatarX + avatarSize, avatarY + avatarSize);
  ctx.lineTo(avatarX + avatarSize, avatarY + avatarSize - bLen);
  ctx.stroke();

  // "WANTED // ACTIVE" Tag under avatar
  ctx.fillStyle = theme.primary;
  ctx.fillRect(avatarX, avatarY + avatarSize - 22, avatarSize, 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 10px "SFMono-Regular", Consolas, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("● STATUS: WANTED // ACTIVE", avatarX + avatarSize / 2, avatarY + avatarSize - 11);
  ctx.restore();

  // 6. Right Details Section
  const detailsX = avatarX + avatarSize + 26;

  // Operative Callsign Label
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = '700 11px "SFMono-Regular", Consolas, monospace';
  ctx.fillText("OPERATIVE CALLSIGN / STREET ALIAS", detailsX, 66);

  // Callsign in Pricedown Font
  ctx.font = 'bold 54px "Pricedown", "Impact", "Arial Black", sans-serif';
  ctx.letterSpacing = "0.04em";

  // Shadow glow
  ctx.shadowColor = theme.textGlow;
  ctx.shadowBlur = 16;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(merged.alias.toUpperCase(), detailsX, 86);

  // Outline stroke in theme primary
  ctx.shadowBlur = 0;
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 2;
  ctx.strokeText(merged.alias.toUpperCase(), detailsX, 86);

  // Role / Specialization
  ctx.font = '800 13px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = theme.secondary;
  ctx.fillText(merged.role.toUpperCase(), detailsX, 150);

  // Heist Stats Pill Bar: [ BOUNTY: $1,250,000 ] [ CUT: 40% ] [ LEVEL 4 ]
  const pillY = 178;

  // Pill 1: Bounty
  drawPill(ctx, detailsX, pillY, `BOUNTY: ${merged.bounty ?? "$1,250,000"}`, theme.accent);

  // Pill 2: Cut
  drawPill(ctx, detailsX + 175, pillY, `CREW CUT: ${merged.crewCut ?? "40%"}`, theme.primary);

  // Pill 3: Clearance
  drawPill(ctx, detailsX + 315, pillY, "ACCESS: S-TIER", theme.secondary);

  // Barcode & Serial Line
  const barcodeY = 222;
  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  drawBarcode(ctx, detailsX, barcodeY, 140, 28);

  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = '9px "SFMono-Regular", Consolas, monospace';
  ctx.fillText("SERIAL NO. VC-2026-LEONIDA-9042", detailsX + 155, barcodeY + 8);
  ctx.fillText(merged.clearance ?? "LEONIDA METRO POLICE DEPT - SUBJECT FILE", detailsX + 155, barcodeY + 22);

  // Holographic Rockstar Emblem at Bottom Right
  drawHoloEmblem(ctx, width - 75, height - 55, theme);

  ctx.restore();

  return canvas;
}

/**
 * Draws a tactical stat pill tag.
 */
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x, y, 160, 26);

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 160, 26);

  ctx.fillStyle = color;
  ctx.font = '800 10.5px "SFMono-Regular", Consolas, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 80, y + 13);
  ctx.restore();
}

/**
 * Draws realistic barcode lines.
 */
function drawBarcode(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  let currX = x;
  const pattern = [2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 4, 1, 3, 2, 1, 2, 3, 1, 4, 2, 1, 3, 2];
  ctx.fillStyle = "#ffffff";
  pattern.forEach((pw) => {
    ctx.fillRect(currX, y, pw, h);
    currX += pw + 2;
    if (currX > x + w) return;
  });
  ctx.restore();
}

/**
 * Draws an authentic circular holographic seal at the bottom-right.
 */
function drawHoloEmblem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  theme: ThemeColors,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  const holoGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 26);
  holoGrad.addColorStop(0, "rgba(255, 255, 255, 0.25)");
  holoGrad.addColorStop(0.7, "rgba(255, 208, 0, 0.2)");
  holoGrad.addColorStop(1, "rgba(255, 0, 127, 0.15)");
  ctx.fillStyle = holoGrad;
  ctx.fill();

  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Central Star
  ctx.fillStyle = theme.accent;
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("★", cx, cy + 1);
  ctx.restore();
}

/**
 * Fallback vector silhouette drawer if no custom image is loaded.
 */
function drawFallbackSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  silhouetteId?: SilhouetteId,
): void {
  const arch = getSilhouetteArchetype(silhouetteId ?? "infiltrator");
  ctx.save();

  // Circular halo
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 245, 212, 0.08)";
  ctx.fill();

  // Draw scaled SVG path
  try {
    const path = new Path2D(arch.svgPath);
    ctx.translate(x + size * 0.15, y + size * 0.15);
    ctx.scale((size * 0.7) / 24, (size * 0.7) / 24);
    ctx.fillStyle = "#f0eadc";
    ctx.fill(path);
  } catch {
    ctx.fillStyle = "#f0eadc";
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.35, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size * 0.8, size * 0.35, Math.PI, 0);
    ctx.fill();
  }

  ctx.restore();
}

export const FABRIC_IDENTITY_BADGE_TAG = "__heistboardGtaIdentityBadge";

/**
 * Places or live-updates the GTA VI Heist Record Identity Badge on the Fabric canvas.
 * Can be called multiple times without creating duplicate badges.
 */
export async function placeOrUpdateBadgeOnFabricCanvas(
  fabricCanvas: FabricCanvasLike | null | undefined,
  options: GtaBadgeOptions,
  pinCorner: "top-left" | "top-right" | "bottom-left" | "bottom-right" = "top-left",
): Promise<boolean> {
  if (!fabricCanvas) return false;

  try {
    const badgeCanvas = await renderGtaIdentityBadgeToCanvas(options);
    const dataUrl = badgeCanvas.toDataURL("image/png");

    const objects = fabricCanvas.getObjects();
    const baseObject = objects[0];
    const ImageClass = baseObject?.constructor as FabricImageConstructor | undefined;

    if (!ImageClass) {
      console.warn("Fabric Image constructor not found on canvas base object.");
      return false;
    }

    // Check if identity badge already exists on canvas
    const existingBadgeIndex = objects.findIndex(
      (obj) => (obj as unknown as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true,
    );

    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvasW = fabricCanvas.getWidth();
          const canvasH = fabricCanvas.getHeight();

          // Scale: badge width should be ~28% of canvas width
          const targetWidth = Math.min(canvasW * 0.3, 380);
          const scale = targetWidth / badgeCanvas.width;

          let left = 24 + (targetWidth / 2);
          let top = 24 + ((badgeCanvas.height * scale) / 2);

          if (existingBadgeIndex > 0) {
            const existing = objects[existingBadgeIndex]!;
            left = existing.left ?? left;
            top = existing.top ?? top;
            // Remove old instance
            (fabricCanvas as unknown as { remove?(o: FabricObjectLike): void }).remove?.(existing);
          } else if (pinCorner === "top-right") {
            left = canvasW - 24 - (targetWidth / 2);
          } else if (pinCorner === "bottom-left") {
            top = canvasH - 24 - ((badgeCanvas.height * scale) / 2);
          }

          const badgeObject = new ImageClass(img, {
            left,
            top,
            originX: "center",
            originY: "center",
            selectable: true,
            hasControls: true,
            hasBorders: true,
          });

          badgeObject.scale(scale);
          (badgeObject as unknown as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] = true;

          if (typeof badgeObject.setCoords === "function") {
            badgeObject.setCoords();
          }

          fabricCanvas.add(badgeObject);
          fabricCanvas.setActiveObject(badgeObject);

          fabricCanvas.fire?.("object:added", { target: badgeObject });
          fabricCanvas.fire?.("object:modified", { target: badgeObject });
          fabricCanvas.requestRenderAll();

          resolve(true);
        } catch (err) {
          console.error("Failed to place GTA badge on canvas:", err);
          resolve(false);
        }
      };

      img.onerror = () => resolve(false);
      img.src = dataUrl;
    });
  } catch (err) {
    console.error("Could not render GTA badge for canvas placement:", err);
    return false;
  }
}
