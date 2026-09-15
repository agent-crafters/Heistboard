import type { FabricCanvasLike, FabricObjectLike } from "@/lib/sticker-canvas-importer";

export type GtaStyleId =
  | "none"
  | "retro-86"
  | "classic-blueprint"
  | "vice-neon"
  | "leonida-sunset"
  | "vice-noir"
  | "vice-heatwave"
  | "sunset-strip";

export type GradientPresetId =
  | "none"
  | "vice-sunset"
  | "miami-neon"
  | "tropical-heat"
  | "midnight-noir"
  | "cyber-cyan"
  | "custom";

export type GradientDirection =
  | "to-bottom"
  | "to-top"
  | "to-bottom-right"
  | "to-top-right"
  | "radial-vignette";

export type GradientBlendMode =
  | "overlay"
  | "soft-light"
  | "multiply"
  | "screen"
  | "source-over";

export interface GtaStyleDefinition {
  id: GtaStyleId;
  name: string;
  tagline: string;
  filterString: string;
  gradientStops: string[];
  gradientBlend: GradientBlendMode;
  gradientOpacity: number;
  previewColors: [string, string];
}

export interface GradientPresetDefinition {
  id: GradientPresetId;
  name: string;
  stops: string[];
  previewColors: [string, string];
}

export const GTA_VI_STYLES: GtaStyleDefinition[] = [
  {
    id: "none",
    name: "Original Map",
    tagline: "Raw, unstyled original satellite or vector map base",
    filterString: "none",
    gradientStops: [],
    gradientBlend: "source-over",
    gradientOpacity: 0,
    previewColors: ["#4a5568", "#2d3748"],
  },
  {
    id: "vice-neon",
    name: "Vice Neon",
    tagline: "Signature GTA VI hot magenta & electric cyan neon contrast",
    filterString: "contrast(1.25) saturate(1.6) brightness(0.95) hue-rotate(-5deg)",
    gradientStops: ["#f72585", "#7209b7", "#00f5d4"],
    gradientBlend: "overlay",
    gradientOpacity: 0.45,
    previewColors: ["#f72585", "#00f5d4"],
  },
  {
    id: "leonida-sunset",
    name: "Leonida Sunset",
    tagline: "Golden hour amber sun with warm tropical dusk haze",
    filterString: "contrast(1.2) saturate(1.5) brightness(1.05) sepia(0.25) hue-rotate(-20deg)",
    gradientStops: ["#ff2a85", "#ff9f43", "#7209b7"],
    gradientBlend: "soft-light",
    gradientOpacity: 0.5,
    previewColors: ["#ff9f43", "#7209b7"],
  },
  {
    id: "retro-86",
    name: "Retro '86 Vice",
    tagline: "Pastel turquoise & coral nostalgia with vintage warmth",
    filterString: "contrast(1.15) saturate(1.3) sepia(0.2) brightness(1.02)",
    gradientStops: ["#00b4d8", "#ff758f"],
    gradientBlend: "overlay",
    gradientOpacity: 0.4,
    previewColors: ["#00b4d8", "#ff758f"],
  },
  {
    id: "classic-blueprint",
    name: "Classic Blueprint",
    tagline: "Tactical heist planning blueprint in dark petrol cyan",
    filterString: "contrast(1.35) saturate(0.5) brightness(0.85) hue-rotate(170deg)",
    gradientStops: ["#0f2027", "#203a43", "#00f5d4"],
    gradientBlend: "overlay",
    gradientOpacity: 0.5,
    previewColors: ["#0f2027", "#00f5d4"],
  },
  {
    id: "vice-noir",
    name: "Vice Noir",
    tagline: "Gritty nocturnal thriller with deep shadows & neon rims",
    filterString: "contrast(1.45) saturate(0.85) brightness(0.8)",
    gradientStops: ["#10002b", "#3c096c", "#240046"],
    gradientBlend: "multiply",
    gradientOpacity: 0.45,
    previewColors: ["#10002b", "#7b2cbf"],
  },
  {
    id: "vice-heatwave",
    name: "Vice Heatwave",
    tagline: "Sun-drenched tropical saturation & intense golden energy",
    filterString: "contrast(1.25) saturate(1.7) brightness(1.08) sepia(0.2) hue-rotate(-15deg)",
    gradientStops: ["#ffb703", "#fb8500", "#d90429"],
    gradientBlend: "overlay",
    gradientOpacity: 0.45,
    previewColors: ["#ffb703", "#d90429"],
  },
  {
    id: "sunset-strip",
    name: "Sunset Strip",
    tagline: "Electric purple & neon orange sunset horizon",
    filterString: "contrast(1.2) saturate(1.55) brightness(1.0) hue-rotate(10deg)",
    gradientStops: ["#7209b7", "#f72585", "#ffb703"],
    gradientBlend: "soft-light",
    gradientOpacity: 0.5,
    previewColors: ["#f72585", "#ffb703"],
  },
];

export const GRADIENT_PRESETS: GradientPresetDefinition[] = [
  {
    id: "vice-sunset",
    name: "Vice Sunset",
    stops: ["#ff2a85", "#ff9f43", "#7209b7"],
    previewColors: ["#ff2a85", "#ff9f43"],
  },
  {
    id: "miami-neon",
    name: "Miami Neon",
    stops: ["#f72585", "#00f5d4"],
    previewColors: ["#f72585", "#00f5d4"],
  },
  {
    id: "tropical-heat",
    name: "Tropical Heat",
    stops: ["#ffb703", "#fb8500", "#d90429"],
    previewColors: ["#ffb703", "#d90429"],
  },
  {
    id: "midnight-noir",
    name: "Midnight Noir",
    stops: ["#0f0c29", "#302b63", "#24243e"],
    previewColors: ["#0f0c29", "#302b63"],
  },
  {
    id: "cyber-cyan",
    name: "Cyber Cyan",
    stops: ["#00f5d4", "#0077b6", "#03045e"],
    previewColors: ["#00f5d4", "#03045e"],
  },
  {
    id: "custom",
    name: "Custom Duo",
    stops: ["#f72585", "#00f5d4"],
    previewColors: ["#f72585", "#00f5d4"],
  },
];

export interface BgLayerConfig {
  opacity: number; // 0 to 1
  blurEnabled: boolean;
  blurRadius: number; // 0 to 30px
  gradientEnabled: boolean;
  gradientPreset: GradientPresetId;
  gradientDirection: GradientDirection;
  gradientOpacity: number; // 0 to 1
  gradientBlendMode: GradientBlendMode;
  customColor1: string;
  customColor2: string;
  style: GtaStyleId;
  styleIntensity: number; // 0 to 1
}

export const DEFAULT_BG_LAYER_CONFIG: BgLayerConfig = {
  opacity: 1.0,
  blurEnabled: false,
  blurRadius: 8,
  gradientEnabled: false,
  gradientPreset: "vice-sunset",
  gradientDirection: "to-bottom",
  gradientOpacity: 0.45,
  gradientBlendMode: "overlay",
  customColor1: "#f72585",
  customColor2: "#00f5d4",
  style: "none",
  styleIntensity: 1.0,
};

export function getGtaStyleDefinition(styleId: GtaStyleId): GtaStyleDefinition {
  return (
    GTA_VI_STYLES.find((s) => s.id === styleId) ?? GTA_VI_STYLES[0]
  );
}

export function getGradientPresetDefinition(presetId: GradientPresetId): GradientPresetDefinition {
  return (
    GRADIENT_PRESETS.find((p) => p.id === presetId) ?? GRADIENT_PRESETS[0]
  );
}

/**
 * Creates a canvas linear or radial gradient based on direction and color stops.
 */
export function createConfiguredGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  direction: GradientDirection,
  stops: string[],
): CanvasGradient {
  let gradient: CanvasGradient;

  if (direction === "radial-vignette") {
    const cx = width / 2;
    const cy = height / 2;
    const outerRadius = Math.sqrt(cx * cx + cy * cy);
    gradient = ctx.createRadialGradient(cx, cy, outerRadius * 0.2, cx, cy, outerRadius);
  } else if (direction === "to-top") {
    gradient = ctx.createLinearGradient(0, height, 0, 0);
  } else if (direction === "to-bottom-right") {
    gradient = ctx.createLinearGradient(0, 0, width, height);
  } else if (direction === "to-top-right") {
    gradient = ctx.createLinearGradient(0, height, width, 0);
  } else {
    // "to-bottom" default
    gradient = ctx.createLinearGradient(0, 0, 0, height);
  }

  if (stops.length === 0) {
    gradient.addColorStop(0, "transparent");
    gradient.addColorStop(1, "transparent");
  } else if (stops.length === 1) {
    gradient.addColorStop(0, stops[0]);
    gradient.addColorStop(1, stops[0]);
  } else {
    const step = 1 / (stops.length - 1);
    stops.forEach((color, i) => {
      const offset = Math.min(Math.max(i * step, 0), 1);
      gradient.addColorStop(offset, color);
    });
  }

  return gradient;
}

/**
 * Renders the background image with configured blur, GTA VI style, and gradient overlay
 * onto an offscreen canvas.
 */
export function renderBgLayerToCanvas(
  source: HTMLImageElement | HTMLCanvasElement,
  config: BgLayerConfig,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;

  const width =
    "naturalWidth" in source
      ? source.naturalWidth || source.width || 800
      : source.width || 800;
  const height =
    "naturalHeight" in source
      ? source.naturalHeight || source.height || 600
      : source.height || 600;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. Build composite CSS filter string
  const filterParts: string[] = [];

  // Blur
  if (config.blurEnabled && config.blurRadius > 0) {
    filterParts.push(`blur(${config.blurRadius}px)`);
  }

  // GTA VI Style Color Grading
  if (config.style !== "none") {
    const styleDef = getGtaStyleDefinition(config.style);
    if (styleDef.filterString !== "none") {
      filterParts.push(styleDef.filterString);
    }
  }

  ctx.save();
  ctx.globalAlpha = Math.min(Math.max(config.opacity, 0), 1);

  if (filterParts.length > 0 && typeof ctx.filter !== "undefined") {
    ctx.filter = filterParts.join(" ");
  }

  // Draw source image with blur & filter
  ctx.drawImage(source, 0, 0, width, height);
  ctx.restore();

  // 2. Apply GTA VI Style built-in gradient tint if style has one
  if (config.style !== "none") {
    const styleDef = getGtaStyleDefinition(config.style);
    if (styleDef.gradientStops.length > 0 && styleDef.gradientOpacity > 0) {
      ctx.save();
      const styleGradient = createConfiguredGradient(
        ctx,
        width,
        height,
        "to-bottom",
        styleDef.gradientStops,
      );
      ctx.globalCompositeOperation = styleDef.gradientBlend;
      ctx.globalAlpha = styleDef.gradientOpacity * config.styleIntensity;
      ctx.fillStyle = styleGradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  // 3. Apply custom or preset Gradient overlay if enabled
  if (config.gradientEnabled && config.gradientOpacity > 0) {
    let stops: string[];
    if (config.gradientPreset === "custom") {
      stops = [config.customColor1, config.customColor2];
    } else {
      const presetDef = getGradientPresetDefinition(config.gradientPreset);
      stops = presetDef.stops;
    }

    ctx.save();
    const overlayGradient = createConfiguredGradient(
      ctx,
      width,
      height,
      config.gradientDirection,
      stops,
    );
    ctx.globalCompositeOperation = config.gradientBlendMode;
    ctx.globalAlpha = Math.min(Math.max(config.gradientOpacity, 0), 1);
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  return canvas;
}

/**
 * Applies background layer settings to an image URL, returning a data URL.
 */
export async function applyBgLayerEffects(
  sourceUrl: string,
  config: BgLayerConfig,
): Promise<string> {
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = renderBgLayerToCanvas(img, config);
        resolve(canvas ? canvas.toDataURL("image/png") : sourceUrl);
      } catch {
        resolve(sourceUrl);
      }
    };
    img.onerror = () => resolve(sourceUrl);
    img.src = sourceUrl;
  });
}

/**
 * Directly updates the base image object (objects[0]) on the active Fabric canvas
 * with the new blur, gradient, and GTA VI style without reloading the editor.
 */
export function applyBgLayerToFabricCanvas(
  fabricCanvas: FabricCanvasLike | null | undefined,
  config: BgLayerConfig,
  originalImage: HTMLImageElement | HTMLCanvasElement,
): boolean {
  if (!fabricCanvas) return false;

  const objects = fabricCanvas.getObjects();
  if (objects.length === 0) return false;

  const baseObject = objects[0] as FabricObjectLike & {
    setElement?(element: HTMLCanvasElement | HTMLImageElement): void;
    _element?: HTMLImageElement | HTMLCanvasElement;
    width?: number;
    height?: number;
    scaleX?: number;
    scaleY?: number;
  };

  if (!baseObject || typeof baseObject.setElement !== "function") {
    return false;
  }

  try {
    const processedCanvas = renderBgLayerToCanvas(originalImage, config);
    if (!processedCanvas) return false;
    baseObject.setElement(processedCanvas);
    fabricCanvas.fire?.("object:modified", { target: baseObject });
    fabricCanvas.requestRenderAll();
    return true;
  } catch (err) {
    console.error("Failed to update Fabric canvas background layer:", err);
    return false;
  }
}
