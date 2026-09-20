import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_BG_LAYER_CONFIG,
  GTA_VI_STYLES,
  GRADIENT_PRESETS,
  getGtaStyleDefinition,
  getGradientPresetDefinition,
  renderBgLayerToCanvas,
  applyBgLayerToFabricCanvas,
  type BgLayerConfig,
} from "@/lib/bg-layer-processor";
import type { FabricCanvasLike, FabricObjectLike } from "@/lib/sticker-canvas-importer";

describe("BG Layer Processor", () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      globalAlpha: 1,
      filter: "none",
      globalCompositeOperation: "source-over",
      fillStyle: "",
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
    };

    const mockDocument = {
      createElement: vi.fn((tag: string) => {
        if (tag === "canvas") {
          return {
            width: 800,
            height: 600,
            getContext: vi.fn(() => mockCtx),
            toDataURL: vi.fn(() => "data:image/png;base64,mock"),
          } as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.document = mockDocument as any;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it("defines authentic GTA VI style presets including Retro, Classic, and Vice Neon", () => {
    const styleIds = GTA_VI_STYLES.map((s) => s.id);
    expect(styleIds).toContain("none");
    expect(styleIds).toContain("retro-86");
    expect(styleIds).toContain("classic-blueprint");
    expect(styleIds).toContain("vice-neon");
    expect(styleIds).toContain("leonida-sunset");
    expect(styleIds).toContain("vice-noir");
    expect(styleIds).toContain("vice-heatwave");
    expect(styleIds).toContain("sunset-strip");

    const retro = getGtaStyleDefinition("retro-86");
    expect(retro.name).toBe("Retro '86 Vice");
    expect(retro.previewColors).toHaveLength(2);

    const classic = getGtaStyleDefinition("classic-blueprint");
    expect(classic.name).toBe("Classic Blueprint");

    const neon = getGtaStyleDefinition("vice-neon");
    expect(neon.name).toBe("Vice Neon");
    expect(neon.gradientStops.length).toBeGreaterThan(0);
  });

  it("defines GTA VI gradient presets with vibrant color stops", () => {
    const presetIds = GRADIENT_PRESETS.map((p) => p.id);
    expect(presetIds).toContain("vice-sunset");
    expect(presetIds).toContain("miami-neon");
    expect(presetIds).toContain("tropical-heat");
    expect(presetIds).toContain("midnight-noir");
    expect(presetIds).toContain("cyber-cyan");
    expect(presetIds).toContain("custom");

    const sunset = getGradientPresetDefinition("vice-sunset");
    expect(sunset.stops.length).toBeGreaterThanOrEqual(2);
  });

  it("renders background layer with blur and gradient on canvas", () => {
    const mockImage = {
      width: 800,
      height: 600,
      naturalWidth: 800,
      naturalHeight: 600,
    } as HTMLImageElement;

    const config: BgLayerConfig = {
      ...DEFAULT_BG_LAYER_CONFIG,
      blurEnabled: true,
      blurRadius: 12,
      gradientEnabled: true,
      gradientPreset: "miami-neon",
      gradientOpacity: 0.6,
      style: "vice-neon",
    };

    const canvas = renderBgLayerToCanvas(mockImage, config);
    expect(canvas).toBeDefined();
    expect(canvas?.width).toBe(800);
    expect(canvas?.height).toBe(600);
  });

  it("updates Fabric canvas base object element directly and requests render", () => {
    const setElementMock = vi.fn();
    let renderRequested = false;
    let modifiedFired = false;

    const mockBaseObj: FabricObjectLike & { setElement: typeof setElementMock } = {
      scale: vi.fn(),
      constructor: Object,
      setElement: setElementMock,
    };

    const mockCanvas: FabricCanvasLike = {
      getWidth: () => 800,
      getHeight: () => 600,
      getObjects: () => [mockBaseObj],
      add: vi.fn(),
      setActiveObject: vi.fn(),
      requestRenderAll: vi.fn(() => {
        renderRequested = true;
      }),
      fire: vi.fn((event: string) => {
        if (event === "object:modified") modifiedFired = true;
      }),
    };

    const mockImage = {
      width: 800,
      height: 600,
      naturalWidth: 800,
      naturalHeight: 600,
    } as HTMLImageElement;

    const success = applyBgLayerToFabricCanvas(
      mockCanvas,
      {
        ...DEFAULT_BG_LAYER_CONFIG,
        blurEnabled: true,
        blurRadius: 15,
        style: "retro-86",
      },
      mockImage,
    );

    expect(success).toBe(true);
    expect(setElementMock).toHaveBeenCalledTimes(1);
    expect(renderRequested).toBe(true);
    expect(modifiedFired).toBe(true);
  });

  it("returns false if fabric canvas or base object is missing", () => {
    const mockImage = {} as HTMLImageElement;
    expect(applyBgLayerToFabricCanvas(null, DEFAULT_BG_LAYER_CONFIG, mockImage)).toBe(false);

    const emptyCanvas: FabricCanvasLike = {
      getWidth: () => 800,
      getHeight: () => 600,
      getObjects: () => [],
      add: vi.fn(),
      setActiveObject: vi.fn(),
      requestRenderAll: vi.fn(),
    };
    expect(applyBgLayerToFabricCanvas(emptyCanvas, DEFAULT_BG_LAYER_CONFIG, mockImage)).toBe(false);
  });
});
