import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  STYLISH_FONTS,
  GTA_TEXT_STYLES,
  GTA_PRESET_PHRASES,
  renderStyledTextToCanvas,
  addStyledTextToFabricCanvas,
  changeFabricTextFont,
} from "@/lib/gta-fonts";
import type { FabricCanvasLike, FabricObjectLike } from "@/lib/sticker-canvas-importer";

describe("GTA Fonts & Typography", () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(() => ({ width: 240 })),
      font: "",
      textBaseline: "",
      textAlign: "",
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };

    const mockDocument = {
      createElement: vi.fn((tag: string) => {
        if (tag === "canvas") {
          return {
            width: 300,
            height: 100,
            getContext: vi.fn(() => mockCtx),
            toDataURL: vi.fn(() => "data:image/png;base64,mock"),
          } as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      }),
      fonts: {
        load: vi.fn(() => Promise.resolve()),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.document = mockDocument as any;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it("includes Pricedown Rockstar font and stylish heist typography", () => {
    const fontIds = STYLISH_FONTS.map((f) => f.id);
    expect(fontIds).toContain("pricedown");
    expect(fontIds).toContain("bebas-neue");
    expect(fontIds).toContain("russo-one");
    expect(fontIds).toContain("montserrat");
    expect(fontIds).toContain("permanent-marker");
    expect(fontIds).toContain("press-start");

    const pricedown = STYLISH_FONTS.find((f) => f.id === "pricedown")!;
    expect(pricedown.name).toBe("Pricedown");
    expect(pricedown.fontFamily).toBe("Pricedown");
    expect(pricedown.category).toBe("gta");
  });

  it("includes authentic GTA text styles and preset phrases", () => {
    const styleIds = GTA_TEXT_STYLES.map((s) => s.id);
    expect(styleIds).toContain("gta-gold");
    expect(styleIds).toContain("vice-pink");
    expect(styleIds).toContain("vice-cyan");

    expect(GTA_PRESET_PHRASES).toContain("MISSION PASSED");
    expect(GTA_PRESET_PHRASES).toContain("RESPECT +");
    expect(GTA_PRESET_PHRASES).toContain("WASTED");
    expect(GTA_PRESET_PHRASES).toContain("VICE CITY 2026");
  });

  it("renders styled text canvas with font, shadow, and stroke", () => {
    const canvas = renderStyledTextToCanvas({
      text: "MISSION PASSED",
      fontFamily: "Pricedown",
      fontSize: 54,
      style: GTA_TEXT_STYLES[0],
    });

    expect(canvas).toBeDefined();
    expect(canvas?.width).toBeGreaterThan(0);
    expect(canvas?.height).toBeGreaterThan(0);
  });

  it("adds styled text as Fabric object to canvas", async () => {
    class MockFabricImage implements FabricObjectLike {
      constructor(
        public element: HTMLCanvasElement | HTMLImageElement,
        public options: Record<string, unknown>,
      ) {}
      scale(): void {}
    }

    const addedObjects: FabricObjectLike[] = [];
    let activeObj: FabricObjectLike | null = null;
    let renderCalled = false;

    const mockCanvas: FabricCanvasLike = {
      getWidth: () => 800,
      getHeight: () => 600,
      getObjects: () => [new MockFabricImage({} as HTMLCanvasElement, {})],
      add: vi.fn((obj: FabricObjectLike) => {
        addedObjects.push(obj);
      }),
      setActiveObject: vi.fn((obj: FabricObjectLike) => {
        activeObj = obj;
      }),
      requestRenderAll: vi.fn(() => {
        renderCalled = true;
      }),
      fire: vi.fn(),
    };

    const success = await addStyledTextToFabricCanvas(mockCanvas, {
      text: "RESPECT +",
      fontFamily: "Pricedown",
    });

    expect(success).toBe(true);
    expect(addedObjects).toHaveLength(1);
    expect(activeObj).toBe(addedObjects[0]);
    expect(renderCalled).toBe(true);
  });

  it("changes font family on active canvas text object", () => {
    const setMock = vi.fn();
    const activeText = {
      set: setMock,
      fontFamily: "Open Sans",
    };

    let renderCalled = false;
    const mockCanvas = {
      getActiveObject: vi.fn(() => activeText),
      requestRenderAll: vi.fn(() => {
        renderCalled = true;
      }),
      fire: vi.fn(),
    } as unknown as FabricCanvasLike;

    const success = changeFabricTextFont(mockCanvas, "Pricedown");
    expect(success).toBe(true);
    expect(setMock).toHaveBeenCalledWith({ fontFamily: "Pricedown" });
    expect(renderCalled).toBe(true);
  });
});
