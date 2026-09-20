import type { FabricCanvasLike, FabricObjectLike } from "@/lib/sticker-canvas-importer";

export interface StylishFont {
  id: string;
  name: string;
  fontFamily: string;
  category: "gta" | "tactical" | "retro" | "modern";
  tagline: string;
  previewText: string;
  badge?: string;
}

export interface GtaTextStyle {
  id: string;
  name: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadow: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

export const STYLISH_FONTS: StylishFont[] = [
  {
    id: "pricedown",
    name: "Pricedown",
    fontFamily: "Pricedown",
    category: "gta",
    tagline: "The Legendary Rockstar GTA Font",
    previewText: "MISSION PASSED",
    badge: "GTA Original",
  },
  {
    id: "bebas-neue",
    name: "Bebas Neue",
    fontFamily: "Bebas Neue",
    category: "tactical",
    tagline: "Cinematic Condensed Heist All-Caps",
    previewText: "THE BIG SCORE",
    badge: "Heist Action",
  },
  {
    id: "russo-one",
    name: "Russo One",
    fontFamily: "Russo One",
    category: "tactical",
    tagline: "Heavy Tactical Military Stencil",
    previewText: "EXTRACTION POINT",
    badge: "Military",
  },
  {
    id: "montserrat",
    name: "Montserrat",
    fontFamily: "Montserrat",
    category: "modern",
    tagline: "GTA VI Modern In-Game HUD & Clean UI",
    previewText: "VICE CITY 2026",
    badge: "HUD Modern",
  },
  {
    id: "permanent-marker",
    name: "Permanent Marker",
    fontFamily: "Permanent Marker",
    category: "retro",
    tagline: "Vice Street Gang Graffiti Marker",
    previewText: "RESPECT +",
    badge: "Street Tag",
  },
  {
    id: "press-start",
    name: "Press Start 2P",
    fontFamily: "Press Start 2P",
    category: "retro",
    tagline: "Retro 80s Arcade Heist Tracker",
    previewText: "INSERT COIN",
    badge: "80s Arcade",
  },
];

export const GTA_TEXT_STYLES: GtaTextStyle[] = [
  {
    id: "gta-gold",
    name: "GTA Classic Gold",
    fill: "#ffd000",
    stroke: "#000000",
    strokeWidth: 4,
    shadow: { color: "rgba(0,0,0,0.9)", blur: 4, offsetX: 3, offsetY: 3 },
  },
  {
    id: "vice-pink",
    name: "Vice Neon Pink",
    fill: "#f72585",
    stroke: "#00f5d4",
    strokeWidth: 2,
    shadow: { color: "rgba(247, 37, 133, 0.8)", blur: 8, offsetX: 0, offsetY: 0 },
  },
  {
    id: "vice-cyan",
    name: "Vice Electric Cyan",
    fill: "#00f5d4",
    stroke: "#7209b7",
    strokeWidth: 2,
    shadow: { color: "rgba(0, 245, 212, 0.8)", blur: 8, offsetX: 0, offsetY: 0 },
  },
  {
    id: "mission-red",
    name: "Alert Red",
    fill: "#ef4444",
    stroke: "#ffffff",
    strokeWidth: 2,
    shadow: { color: "rgba(0,0,0,0.9)", blur: 4, offsetX: 2, offsetY: 2 },
  },
  {
    id: "tactical-white",
    name: "Tactical Monolith",
    fill: "#ffffff",
    stroke: "#000000",
    strokeWidth: 4,
    shadow: { color: "rgba(0,0,0,0.8)", blur: 6, offsetX: 2, offsetY: 2 },
  },
  {
    id: "sunset-amber",
    name: "Leonida Sunset",
    fill: "#ff9f43",
    stroke: "#10002b",
    strokeWidth: 3,
    shadow: { color: "rgba(114, 9, 183, 0.7)", blur: 6, offsetX: 2, offsetY: 2 },
  },
];

export const GTA_PRESET_PHRASES = [
  "MISSION PASSED",
  "RESPECT +",
  "WASTED",
  "VICE CITY 2026",
  "THE BIG SCORE",
  "EXTRACTION POINT",
  "GETAWAY VEHICLE",
  "SAFEHOUSE",
  "PRIMARY RENDEZVOUS",
  "POLICE RADAR",
];

export interface AddTextOptions {
  text: string;
  fontFamily: string;
  fontSize?: number;
  style?: GtaTextStyle;
  position?: { x: number; y: number };
}

/**
 * Ensures Pricedown and stylish web fonts are loaded into document.fonts.
 */
export async function ensureFontsLoaded(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  const fontsToLoad = [
    '48px "Pricedown"',
    '48px "Bebas Neue"',
    '48px "Russo One"',
    '48px "Montserrat"',
    '48px "Permanent Marker"',
    '32px "Press Start 2P"',
  ];

  await Promise.allSettled(
    fontsToLoad.map((f) => document.fonts.load(f)),
  );
}

/**
 * Renders styled text onto an offscreen canvas.
 */
export function renderStyledTextToCanvas(
  options: AddTextOptions,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const {
    text,
    fontFamily,
    fontSize = 54,
    style = GTA_TEXT_STYLES[0],
  } = options;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const fontString = `bold ${fontSize}px "${fontFamily}", sans-serif`;
  ctx.font = fontString;

  const metrics = ctx.measureText(text);
  const textWidth = Math.ceil(metrics.width);
  const textHeight = Math.ceil(fontSize * 1.3);

  const padding = Math.max(style.strokeWidth * 2 + 20, 30);
  canvas.width = textWidth + padding * 2;
  canvas.height = textHeight + padding * 2;

  // Re-apply font after resizing canvas
  ctx.font = fontString;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Draw shadow
  if (style.shadow && style.shadow.blur > 0) {
    ctx.save();
    ctx.shadowColor = style.shadow.color;
    ctx.shadowBlur = style.shadow.blur;
    ctx.shadowOffsetX = style.shadow.offsetX;
    ctx.shadowOffsetY = style.shadow.offsetY;
    ctx.fillStyle = style.fill;
    ctx.fillText(text, centerX, centerY);
    ctx.restore();
  }

  // Draw stroke outline
  if (style.strokeWidth > 0 && style.stroke) {
    ctx.save();
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth * 2;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    ctx.strokeText(text, centerX, centerY);
    ctx.restore();
  }

  // Draw main fill
  ctx.fillStyle = style.fill;
  ctx.fillText(text, centerX, centerY);

  return canvas;
}

/**
 * Adds styled text to the active Fabric canvas as an interactive object.
 */
export async function addStyledTextToFabricCanvas(
  fabricCanvas: FabricCanvasLike | null | undefined,
  options: AddTextOptions,
): Promise<boolean> {
  if (!fabricCanvas) return false;

  await ensureFontsLoaded();

  const canvas = renderStyledTextToCanvas(options);
  if (!canvas) return false;

  const objects = fabricCanvas.getObjects();
  const baseObject = objects[0];
  const ImageClass = baseObject?.constructor as
    | (new (element: HTMLCanvasElement | HTMLImageElement, opts: Record<string, unknown>) => FabricObjectLike)
    | undefined;

  if (!ImageClass) return false;

  try {
    const canvasW = fabricCanvas.getWidth();
    const canvasH = fabricCanvas.getHeight();

    const left = options.position?.x ?? canvasW / 2;
    const top = options.position?.y ?? canvasH / 2;

    const textObject = new ImageClass(canvas, {
      left,
      top,
      originX: "center",
      originY: "center",
      selectable: true,
      hasControls: true,
      hasBorders: true,
    });

    if (typeof textObject.setCoords === "function") {
      textObject.setCoords();
    }

    fabricCanvas.add(textObject);
    fabricCanvas.setActiveObject(textObject);
    fabricCanvas.fire?.("object:added", { target: textObject });
    fabricCanvas.fire?.("object:modified", { target: textObject });
    fabricCanvas.requestRenderAll();
    return true;
  } catch (err) {
    console.error("Failed to add styled text to canvas:", err);
    return false;
  }
}

/**
 * Changes the font family of currently selected text on Fabric canvas.
 */
export function changeFabricTextFont(
  fabricCanvas: FabricCanvasLike | null | undefined,
  fontFamily: string,
): boolean {
  if (!fabricCanvas) return false;

  const active = (fabricCanvas as unknown as { getActiveObject?(): (FabricObjectLike & { set?(props: Record<string, unknown>): void; fontFamily?: string }) | null }).getActiveObject?.();

  if (!active) return false;

  try {
    if (typeof active.set === "function") {
      active.set({ fontFamily });
      fabricCanvas.fire?.("object:modified", { target: active });
      fabricCanvas.requestRenderAll();
      return true;
    }
  } catch (e) {
    console.warn("Could not set fontFamily on active canvas object:", e);
  }

  return false;
}

/**
 * Sets up a MutationObserver to inject Pricedown and stylish fonts into Unlayer's
 * native text font menu dropdown when it opens in the DOM.
 */
export function setupNativeFontMenuObserver(rootElement?: HTMLElement | null): () => void {
  if (typeof window === "undefined" || typeof MutationObserver === "undefined") {
    return () => { };
  }

  const container = rootElement ?? document.body;

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const el = node as HTMLElement;

        const fontMenu =
          el.getAttribute("data-testid") === "native-text-font-menu"
            ? el
            : el.querySelector<HTMLElement>('[data-testid="native-text-font-menu"]');

        if (fontMenu && !fontMenu.getAttribute("data-heistboard-custom-fonts")) {
          fontMenu.setAttribute("data-heistboard-custom-fonts", "true");

          const header = document.createElement("div");
          header.className = "px-3 py-1.5 bg-mustard/15 border-b border-mustard/30 font-mono text-[11px] font-extrabold text-mustard tracking-wider uppercase";
          header.innerHTML = `<span>👑 ROCKSTAR &amp; GTA FONTS</span>`;
          fontMenu.prepend(header);

          // Prepend buttons for each stylish font
          const customFontsToInject = [
            { name: "Pricedown (GTA)", family: "Pricedown" },
            { name: "Bebas Neue (Heist)", family: "Bebas Neue" },
            { name: "Russo One (Military)", family: "Russo One" },
            { name: "Montserrat (HUD)", family: "Montserrat" },
            { name: "Permanent Marker", family: "Permanent Marker" },
            { name: "Press Start 2P", family: "Press Start 2P" },
          ];

          customFontsToInject.reverse().forEach((f) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.setAttribute("role", "option");
            btn.className = "flex w-full items-center gap-2.5 px-3 py-1.5 cursor-pointer text-sm whitespace-nowrap text-left transition-colors duration-150 ease-in-out text-white hover:bg-mustard/20 hover:text-mustard border-b border-white/5";
            btn.style.fontFamily = `"${f.family}", sans-serif`;
            btn.textContent = f.name;

            btn.onclick = (e) => {
              e.stopPropagation();
              e.preventDefault();

              // 1. Change font on the active Fabric text object
              const canvas = (window as unknown as { __heistboardFabricCanvas?: FabricCanvasLike }).__heistboardFabricCanvas;
              if (canvas) {
                changeFabricTextFont(canvas, f.family);
              }

              // 2. Close dropdown if open
              fontMenu.style.display = "none";
            };

            header.after(btn);
          });
        }
      }
    }
  });

  observer.observe(container, { childList: true, subtree: true });

  return () => observer.disconnect();
}
