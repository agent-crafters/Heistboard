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

export type GtaBadgeStyle = "vice-sunset" | "glossy-noir" | "cyber-hud";

export interface GtaBadgeOptions {
  alias: string;
  role: string;
  silhouetteId?: SilhouetteId;
  portraitUrl?: string;
  theme?: GtaBadgeTheme;
  badgeStyle?: GtaBadgeStyle;
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
  badgeStyle: "vice-sunset",
  wantedStars: 5,
  bounty: "$1,250,000",
  crewCut: "40%",
  clearance: "LEVEL 4 // SPECIAL ACCESS",
};

export interface BadgeStyleMeta {
  id: GtaBadgeStyle;
  name: string;
  tagline: string;
  accent: string;
  previewGradient: string;
  description: string;
}

export const BADGE_STYLES: readonly BadgeStyleMeta[] = [
  {
    id: "vice-sunset",
    name: "Vice Sunset VIP",
    tagline: "GTA VI Collectible Voucher",
    accent: "#f72585",
    previewGradient: "linear-gradient(135deg, #1b0736 0%, #831843 45%, #ea580c 80%, #facc15 100%)",
    description: "Iconic dusk skyline, palm silhouettes, Rockstar R★ badge, giant VI emblem & barcode strip",
  },
  {
    id: "glossy-noir",
    name: "Syndicate Redline",
    tagline: "Glossy Crimson Dossier",
    accent: "#ef4444",
    previewGradient: "linear-gradient(135deg, #450a0a 0%, #7f1d1d 60%, #1c0303 100%)",
    description: "Deep blood-red textured noir background, glassy curved acrylic glare, framed side profile & structured lines",
  },
  {
    id: "cyber-hud",
    name: "Cyber Neon HUD",
    tagline: "Edge-Lit Translucent Glass",
    accent: "#ff6600",
    previewGradient: "linear-gradient(135deg, #090d12 0%, #1e293b 70%, #ff6600 100%)",
    description: "Glowing neon amber edge-lit double border, illuminated circular reticle avatar, cyber typography & tactical QR",
  },
];

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
 * Universal rounded rectangle helper compatible with canvas mock environments.
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
 * Procedural palm tree silhouette for Vice City sunset backgrounds.
 */
function drawPalmTreeSilhouette(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  leanAngle = 0.2,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#0c0414";

  // Curved Trunk
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.quadraticCurveTo(leanAngle * 40, -60, leanAngle * 60, -120);
  ctx.lineTo(leanAngle * 60 + 5, -120);
  ctx.quadraticCurveTo(leanAngle * 40 + 7, -60, 4, 0);
  ctx.closePath();
  ctx.fill();

  // Palm Fronds fanning out
  const topX = leanAngle * 60;
  const topY = -120;
  const frondAngles = [-2.2, -1.7, -1.2, -0.6, 0, 0.6, 1.2, 1.7, 2.2];

  frondAngles.forEach((angle) => {
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    const endX = topX + Math.cos(angle - Math.PI / 2) * 55;
    const endY = topY + Math.sin(angle - Math.PI / 2) * 45 + 15;
    const ctrlX = topX + Math.cos(angle - Math.PI / 2) * 35;
    const ctrlY = topY - 20;
    ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
    ctx.quadraticCurveTo(ctrlX + 3, ctrlY + 5, topX, topY);
    ctx.fill();
  });

  ctx.restore();
}

/**
 * Draws the iconic Rockstar Games logo badge (Gold square, bold black R, white star).
 */
function drawRockstarBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 38,
): void {
  ctx.save();
  // Golden yellow rounded badge
  drawRoundedRect(ctx, x, y, size, size, 7);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Bold black R
  ctx.fillStyle = "#111827";
  ctx.font = `900 ${Math.round(size * 0.72)}px "Arial Black", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("R", x + size * 0.44, y + size * 0.52);

  // White star at the bottom right of R
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.round(size * 0.35)}px sans-serif`;
  ctx.fillText("★", x + size * 0.72, y + size * 0.66);
  ctx.restore();
}

/**
 * Draws the voucher download code icon [↓] matching Image 1.
 */
function drawVoucherDownloadIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 36,
): void {
  ctx.save();
  drawRoundedRect(ctx, x, y, size, size, 6);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Arrow shaft & tip
  const cx = x + size / 2;
  const cy = y + size / 2;
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2.5;

  ctx.beginPath();
  ctx.moveTo(cx, cy - 8);
  ctx.lineTo(cx, cy + 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 5, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx + 5, cy);
  ctx.stroke();

  // Tray bar
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 9);
  ctx.lineTo(cx + 7, cy + 9);
  ctx.stroke();

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

/**
 * STYLE 1: "Vice Sunset VIP" — shows Name, Bounty, Role only.
 */
function renderViceSunsetStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  merged: GtaBadgeOptions,
  portraitImg: HTMLImageElement | null,
): void {
  // 1. Rounded Card Body — Sunset Sky Gradient
  drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 24);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height - 50);
  skyGrad.addColorStop(0.0, "#1b0736");
  skyGrad.addColorStop(0.35, "#831843");
  skyGrad.addColorStop(0.7, "#ea580c");
  skyGrad.addColorStop(0.95, "#facc15");
  ctx.fillStyle = skyGrad;
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 2. Sunset Glow
  ctx.save();
  const sunGrad = ctx.createRadialGradient(width * 0.62, height - 70, 10, width * 0.62, height - 70, 180);
  sunGrad.addColorStop(0, "rgba(255, 250, 220, 0.6)");
  sunGrad.addColorStop(0.5, "rgba(251, 146, 60, 0.3)");
  sunGrad.addColorStop(1, "rgba(234, 88, 12, 0)");
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, width, height - 50);
  ctx.restore();

  // 3. Palm Trees & Skyline
  drawPalmTreeSilhouette(ctx, 28, height - 50, 1.15, 0.15);
  drawPalmTreeSilhouette(ctx, width - 40, height - 50, 1.25, -0.2);
  drawPalmTreeSilhouette(ctx, width - 110, height - 50, 0.9, -0.1);
  ctx.save();
  ctx.fillStyle = "rgba(18, 5, 30, 0.85)";
  const buildings = [
    [width * 0.28, 60, 35], [width * 0.35, 85, 45], [width * 0.43, 110, 30],
    [width * 0.52, 95, 40], [width * 0.61, 125, 55], [width * 0.72, 75, 35],
    [width * 0.79, 90, 42],
  ];
  buildings.forEach(([bx, bh, bw]) => ctx.fillRect(bx, height - 50 - bh, bw, bh));
  ctx.restore();

  // 4. Giant "VI" Watermark
  ctx.save();
  ctx.font = '900 190px "Arial Black", sans-serif';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const viX = width * 0.74;
  const viY = height * 0.44;
  const viGrad = ctx.createLinearGradient(viX - 100, viY - 80, viX + 100, viY + 80);
  viGrad.addColorStop(0, "rgba(56, 189, 248, 0.85)");
  viGrad.addColorStop(0.5, "rgba(236, 72, 153, 0.9)");
  viGrad.addColorStop(1, "rgba(245, 158, 11, 0.85)");
  ctx.fillStyle = viGrad;
  ctx.fillText("VI", viX, viY);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 3;
  ctx.strokeText("VI", viX, viY);
  ctx.restore();

  // 5. Icons
  drawVoucherDownloadIcon(ctx, 24, 22, 38);
  drawRockstarBadge(ctx, width - 62, 22, 38);

  // 6. Avatar Frame
  const avatarX = 26;
  const avatarY = 74;
  const avatarSize = 130;
  ctx.save();
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 14);
  ctx.fillStyle = "#0c0414";
  ctx.fill();
  if (portraitImg) {
    ctx.save();
    drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 14);
    ctx.clip();
    ctx.drawImage(portraitImg, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();
  } else {
    drawFallbackSilhouette(ctx, avatarX, avatarY, avatarSize, merged.silhouetteId);
  }
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 14);
  ctx.strokeStyle = "#ff007f";
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // 7. ── Three fields: Name · Role · Bounty ──
  const metaX = avatarX + avatarSize + 22;
  const topY = avatarY + 10;
  ctx.save();
  ctx.textAlign = "left";

  // Label
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = '700 9px "SFMono-Regular", Consolas, monospace';
  ctx.textBaseline = "top";
  ctx.fillText("NAME", metaX, topY);

  // Name in Pricedown
  ctx.font = 'bold 46px "Pricedown", "Impact", "Arial Black", sans-serif';
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(merged.alias.toUpperCase(), metaX, topY + 14, 260);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 3;
  ctx.strokeText(merged.alias.toUpperCase(), metaX, topY + 14, 260);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(merged.alias.toUpperCase(), metaX, topY + 14, 260);

  // Role / Category
  ctx.font = '700 11.5px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = "#ffd000";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 4;
  ctx.fillText(merged.role.toUpperCase(), metaX, topY + 72, 260);
  ctx.shadowBlur = 0;

  // Bounty pill
  const pillY = topY + 92;
  drawRoundedRect(ctx, metaX, pillY, 260, 28, 6);
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fill();
  ctx.strokeStyle = "#facc15";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#ffd000";
  ctx.font = '800 12px "SFMono-Regular", Consolas, monospace';
  ctx.textBaseline = "middle";
  ctx.fillText(`BOUNTY: ${merged.bounty ?? "$1,250,000"}`, metaX + 12, pillY + 14);
  ctx.restore();

  // 9. Bottom Carbon Strip: "No Disc - Download Code : XXXXX" (Direct from Image 1)
  ctx.save();
  const bottomH = 48;
  const bottomY = height - bottomH - 4;
  ctx.fillStyle = "#0c0a12";
  ctx.fillRect(4, bottomY, width - 8, bottomH);

  // PlayStation / Console Logo Mark on Left
  const logoX = 36;
  const logoY = bottomY + bottomH / 2;
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("▲", logoX, logoY - 2);

  // Download Code Bar Text
  ctx.fillStyle = "#ffffff";
  ctx.font = '700 12.5px "SFMono-Regular", Consolas, monospace';
  ctx.textAlign = "center";
  const starsStr = "★".repeat(Math.max(1, Math.min(5, merged.wantedStars ?? 5)));
  ctx.fillText(
    `No Disc - Download Code : VC-${merged.alias.toUpperCase()}-${starsStr}`,
    width / 2 + 10,
    bottomY + bottomH / 2,
  );
  ctx.restore();
}

/**
 * STYLE 2: "Syndicate Redline" — shows Name, Bounty, Role only.
 */
function renderGlossyNoirStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  merged: GtaBadgeOptions,
  portraitImg: HTMLImageElement | null,
): void {
  // 1. Deep Blood-Red Card
  drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 22);
  const redGrad = ctx.createLinearGradient(0, 0, width, height);
  redGrad.addColorStop(0.0, "#6b0b0b");
  redGrad.addColorStop(0.5, "#450a0a");
  redGrad.addColorStop(1.0, "#1f0303");
  ctx.fillStyle = redGrad;
  ctx.fill();

  // Grunge speckles
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  for (let i = 0; i < 40; i++) {
    const gx = 20 + ((i * 37) % (width - 40));
    const gy = 20 + ((i * 29) % (height - 40));
    ctx.fillRect(gx, gy, (i % 3) + 1, (i % 2) + 1);
  }
  ctx.restore();

  // 2. Specular Acrylic Glare
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(width * 0.45, 4);
  ctx.quadraticCurveTo(width * 0.85, height * 0.15, width - 4, height * 0.65);
  ctx.lineTo(width - 4, 4);
  ctx.closePath();
  const glareGrad = ctx.createLinearGradient(width * 0.5, 4, width, height * 0.5);
  glareGrad.addColorStop(0, "rgba(255,255,255,0.22)");
  glareGrad.addColorStop(0.6, "rgba(255,255,255,0.06)");
  glareGrad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glareGrad;
  ctx.fill();
  ctx.restore();

  // Chrome rim
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;
  drawRoundedRect(ctx, 4, 4, width - 8, height - 8, 22);
  ctx.stroke();
  ctx.restore();

  // 3. Portrait Frame (left side)
  const portX = 24;
  const portY = 24;
  const portW = 230;
  const portH = height - 48;
  ctx.save();
  drawRoundedRect(ctx, portX, portY, portW, portH, 18);
  ctx.fillStyle = "#1a0404";
  ctx.fill();
  if (portraitImg) {
    ctx.save();
    drawRoundedRect(ctx, portX, portY, portW, portH, 18);
    ctx.clip();
    ctx.drawImage(portraitImg, portX, portY, portW, portH);
    ctx.restore();
  } else {
    drawFallbackSilhouette(ctx, portX + 15, portY + 25, portW - 30, merged.silhouetteId);
  }
  drawRoundedRect(ctx, portX, portY, portW, portH, 18);
  ctx.strokeStyle = "rgba(239,68,68,0.4)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // 4. ── Three fields: Name · Role · Bounty ──
  const contentX = portX + portW + 28;
  const midY = height / 2;
  ctx.save();
  ctx.textAlign = "left";

  // HEIST brand tab
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(contentX, 32, 56, 16);
  ctx.fillStyle = "#ffffff";
  ctx.font = '900 8px "SFMono-Regular", Consolas, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HEIST", contentX + 28, 40);

  // Name
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = '900 42px "Arial Narrow", "Impact", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.fillText(merged.alias.toUpperCase(), contentX, 54);

  // Divider
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(contentX, 108);
  ctx.lineTo(width - 32, 108);
  ctx.stroke();

  // Role label + value
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '700 9px "SFMono-Regular", monospace';
  ctx.fillText("ROLE", contentX, midY - 32);
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 12px "SFMono-Regular", Consolas, monospace';
  ctx.fillText(merged.role.toUpperCase(), contentX, midY - 16);

  // Bounty label + value
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = '700 9px "SFMono-Regular", monospace';
  ctx.fillText("BOUNTY", contentX, midY + 12);
  ctx.fillStyle = "#ef4444";
  ctx.font = '800 18px "SFMono-Regular", Consolas, monospace';
  ctx.fillText(merged.bounty ?? "$1,250,000", contentX, midY + 28);

  ctx.restore();
}

/**
 * STYLE 3: "Cyber Neon HUD" — shows Name, Bounty, Role only.
 */
function renderCyberHudStyle(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  merged: GtaBadgeOptions,
  portraitImg: HTMLImageElement | null,
): void {
  const cardW = width;
  const cardH = height;

  // 1. Dark Acrylic Glass base
  drawRoundedRect(ctx, 6, 6, cardW - 12, cardH - 12, 22);
  ctx.fillStyle = "rgba(10, 14, 18, 0.94)";
  ctx.fill();

  // Micro Scanlines
  ctx.save();
  ctx.strokeStyle = "rgba(255, 102, 0, 0.05)";
  ctx.lineWidth = 1;
  for (let y = 14; y < cardH - 14; y += 10) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(cardW - 14, y);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Glowing Neon Amber Border
  ctx.save();
  ctx.shadowColor = "rgba(255, 102, 0, 0.85)";
  ctx.shadowBlur = 18;
  ctx.strokeStyle = "#ff6600";
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, 8, 8, cardW - 16, cardH - 16, 20);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 170, 0, 0.4)";
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 14, 14, cardW - 28, cardH - 28, 16);
  ctx.stroke();
  ctx.restore();

  // 3. Circular Avatar Reticle
  const cx = cardW / 2;
  const cy = 100;
  const ringR = 60;

  ctx.save();
  ctx.shadowColor = "#ff6600";
  ctx.shadowBlur = 14;
  ctx.strokeStyle = "#ff6600";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, ringR - 4, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = "#06090e";
  ctx.fill();
  if (portraitImg) {
    ctx.drawImage(portraitImg, cx - ringR, cy - ringR, ringR * 2, ringR * 2);
  } else {
    drawFallbackSilhouette(ctx, cx - ringR * 0.7, cy - ringR * 0.7, ringR * 1.4, merged.silhouetteId);
  }
  ctx.restore();

  // Crosshair ticks
  ctx.strokeStyle = "#ffa500";
  ctx.lineWidth = 2;
  const tickLen = 6;
  [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((ang) => {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ang) * (ringR - 2), cy + Math.sin(ang) * (ringR - 2));
    ctx.lineTo(cx + Math.cos(ang) * (ringR + tickLen), cy + Math.sin(ang) * (ringR + tickLen));
    ctx.stroke();
  });
  ctx.restore();

  // 4. ── Three fields: Name · Role · Bounty ──
  ctx.save();
  ctx.textAlign = "center";

  // Name
  ctx.font = '900 30px "Arial Black", sans-serif';
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(255, 102, 0, 0.6)";
  ctx.shadowBlur = 10;
  ctx.textBaseline = "top";
  ctx.fillText(merged.alias.toUpperCase(), cx, cy + ringR + 18);
  ctx.shadowBlur = 0;

  // Divider
  ctx.strokeStyle = "rgba(255, 102, 0, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(32, cy + ringR + 60);
  ctx.lineTo(cardW - 32, cy + ringR + 60);
  ctx.stroke();

  // Role
  ctx.font = '700 11px "SFMono-Regular", Consolas, monospace';
  ctx.fillStyle = "rgba(255, 170, 0, 0.9)";
  ctx.fillText(merged.role.toUpperCase(), cx, cy + ringR + 70);

  // Divider
  ctx.strokeStyle = "rgba(255, 102, 0, 0.3)";
  ctx.beginPath();
  ctx.moveTo(32, cy + ringR + 100);
  ctx.lineTo(cardW - 32, cy + ringR + 100);
  ctx.stroke();

  // Bounty
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = '600 9px "SFMono-Regular", Consolas, monospace';
  ctx.fillText("BOUNTY", cx, cy + ringR + 108);
  ctx.fillStyle = "#ff6600";
  ctx.shadowColor = "rgba(255,102,0,0.5)";
  ctx.shadowBlur = 8;
  ctx.font = '800 22px "SFMono-Regular", Consolas, monospace';
  ctx.fillText(merged.bounty ?? "$1,250,000", cx, cy + ringR + 124);
  ctx.shadowBlur = 0;

  ctx.restore();
}

/**
 * Renders the GTA VI Heist Record ID badge onto an offscreen Canvas 2D surface.
 */
export async function renderGtaIdentityBadgeToCanvas(
  options: GtaBadgeOptions,
): Promise<HTMLCanvasElement> {
  const merged: GtaBadgeOptions = { ...DEFAULT_GTA_BADGE_OPTIONS, ...options };
  const badgeStyle: GtaBadgeStyle = merged.badgeStyle ?? "vice-sunset";

  // Determine canvas dimensions based on style (Vertical vs Horizontal)
  const width = badgeStyle === "cyber-hud" ? 440 : 760;
  const height = badgeStyle === "cyber-hud" ? 640 : 380;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not initialize 2D context for GTA badge.");

  // Preload portrait image if available
  let portraitImg: HTMLImageElement | null = null;
  if (merged.portraitUrl) {
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject();
        img.src = merged.portraitUrl!;
      });
      portraitImg = img;
    } catch {
      portraitImg = null;
    }
  }

  // Branch into the 3 authentic styles inspired by user reference images
  if (badgeStyle === "glossy-noir") {
    renderGlossyNoirStyle(ctx, width, height, merged, portraitImg);
  } else if (badgeStyle === "cyber-hud") {
    renderCyberHudStyle(ctx, width, height, merged, portraitImg);
  } else {
    renderViceSunsetStyle(ctx, width, height, merged, portraitImg);
  }

  return canvas;
}

export const FABRIC_IDENTITY_BADGE_TAG = "__heistboardGtaIdentityBadge";

/**
 * Checks whether an identity badge already exists on the Fabric canvas.
 */
export function hasBadgeOnFabricCanvas(
  fabricCanvas: FabricCanvasLike | null | undefined,
): boolean {
  if (!fabricCanvas) return false;
  const objects = fabricCanvas.getObjects();
  return objects.some(
    (obj) => (obj as unknown as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true,
  );
}

/**
 * Places or live-updates the GTA VI Heist Record Identity Badge on the Fabric canvas.
 * Can be called multiple times without creating duplicate badges.
 * If an existing badge is on the canvas and pinCorner is not specified, it updates in place.
 */
export async function placeOrUpdateBadgeOnFabricCanvas(
  fabricCanvas: FabricCanvasLike | null | undefined,
  options: GtaBadgeOptions,
  pinCorner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center",
  customPosition?: { x: number; y: number },
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
          const defaultScale = targetWidth / badgeCanvas.width;

          let left = 24 + targetWidth / 2;
          let top = 24 + (badgeCanvas.height * defaultScale) / 2;
          let scale = defaultScale;

          if (existingBadgeIndex >= 0) {
            const existing = objects[existingBadgeIndex]!;
            left = existing.left ?? left;
            top = existing.top ?? top;
            if (typeof existing.scaleX === "number" && existing.scaleX > 0) {
              scale = existing.scaleX;
            }

            if (customPosition) {
              left = customPosition.x;
              top = customPosition.y;
            } else if (pinCorner === "top-right") {
              left = canvasW - 24 - targetWidth / 2;
              top = 24 + (badgeCanvas.height * scale) / 2;
            } else if (pinCorner === "bottom-left") {
              left = 24 + targetWidth / 2;
              top = canvasH - 24 - (badgeCanvas.height * scale) / 2;
            } else if (pinCorner === "bottom-right") {
              left = canvasW - 24 - targetWidth / 2;
              top = canvasH - 24 - (badgeCanvas.height * scale) / 2;
            } else if (pinCorner === "top-left") {
              left = 24 + targetWidth / 2;
              top = 24 + (badgeCanvas.height * scale) / 2;
            } else if (pinCorner === "center") {
              left = canvasW / 2;
              top = canvasH / 2;
            }

            // Remove old instance before placing the freshly rendered replacement
            (fabricCanvas as unknown as { remove?(o: FabricObjectLike): void }).remove?.(existing);
          } else {
            if (customPosition) {
              left = customPosition.x;
              top = customPosition.y;
            } else {
              const corner = pinCorner ?? "top-left";
              if (corner === "top-right") {
                left = canvasW - 24 - targetWidth / 2;
              } else if (corner === "bottom-left") {
                top = canvasH - 24 - (badgeCanvas.height * scale) / 2;
              } else if (corner === "bottom-right") {
                left = canvasW - 24 - targetWidth / 2;
                top = canvasH - 24 - (badgeCanvas.height * scale) / 2;
              } else if (corner === "center") {
                left = canvasW / 2;
                top = canvasH / 2;
              }
            }
          }

          const badgeObject = new ImageClass(img, {
            left,
            top,
            originX: "center",
            originY: "center",
            selectable: true,
            hasControls: true,
            hasBorders: true,
            lockMovementX: false,
            lockMovementY: false,
            hoverCursor: "move",
            moveCursor: "grabbing",
          });

          badgeObject.scale(scale);
          (badgeObject as unknown as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] = true;

          // Dispatch event to open identity editing drawer whenever badge is clicked or selected on canvas
          const triggerOpenIdentityDrawer = () => {
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("heistboard:open-identity-tool"));
            }
          };

          (badgeObject as unknown as { on?(e: string, fn: () => void): void }).on?.("mousedown", triggerOpenIdentityDrawer);
          (badgeObject as unknown as { on?(e: string, fn: () => void): void }).on?.("selected", triggerOpenIdentityDrawer);
          (badgeObject as unknown as { on?(e: string, fn: () => void): void }).on?.("mouseup", triggerOpenIdentityDrawer);

          if (typeof badgeObject.setCoords === "function") {
            badgeObject.setCoords();
          }

          fabricCanvas.add(badgeObject);
          fabricCanvas.setActiveObject(badgeObject);

          // Attach canvas-level selection/click handler to ensure identity badge clicks always open identity tool
          if (!fabricCanvas.__heistboardBadgeListenerAttached) {
            fabricCanvas.__heistboardBadgeListenerAttached = true;
            fabricCanvas.on?.("mouse:down", (e: Record<string, unknown>) => {
              const target = e?.target;
              if (target && (target as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true) {
                triggerOpenIdentityDrawer();
              }
            });
            fabricCanvas.on?.("selection:created", (e: Record<string, unknown>) => {
              const target = e?.target ?? (e?.selected as unknown[])?.[0];
              if (target && (target as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true) {
                triggerOpenIdentityDrawer();
              }
            });
            fabricCanvas.on?.("selection:updated", (e: Record<string, unknown>) => {
              const target = e?.target ?? (e?.selected as unknown[])?.[0];
              if (target && (target as Record<string, unknown>)[FABRIC_IDENTITY_BADGE_TAG] === true) {
                triggerOpenIdentityDrawer();
              }
            });
          }

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
