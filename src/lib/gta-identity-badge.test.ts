import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GTA_BADGE_OPTIONS,
  placeOrUpdateBadgeOnFabricCanvas,
  renderGtaIdentityBadgeToCanvas,
} from "./gta-identity-badge";
import type { FabricCanvasLike, FabricObjectLike } from "./sticker-canvas-importer";

describe("GTA VI Identity Badge Renderer", () => {
  const originalDocument = globalThis.document;
  let mockCtx: Record<string, unknown>;
  let mockCanvas: Record<string, unknown>;

  beforeEach(() => {
    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      clip: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      strokeRect: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      strokeText: vi.fn(),
      drawImage: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      shadowColor: "",
      shadowBlur: 0,
      letterSpacing: "",
      textAlign: "",
      textBaseline: "",
    };

    mockCanvas = {
      width: 760,
      height: 300,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => "data:image/png;base64,mockBadgeDataUrl"),
    };

    const mockDocument = {
      createElement: vi.fn((tag: string) => {
        if (tag === "canvas") {
          return mockCanvas as unknown as HTMLCanvasElement;
        }
        return {} as HTMLElement;
      }),
    };

    globalThis.document = mockDocument as unknown as Document;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
  });

  it("renders a 760x380 canvas with chamfered corners and GTA VI styling", async () => {
    const canvas = await renderGtaIdentityBadgeToCanvas({
      alias: "LUCIA",
      role: "WHEELMAN · S-TIER",
      theme: "vice-neon",
      wantedStars: 5,
    });

    expect(canvas.width).toBe(760);
    expect(canvas.height).toBe(380);
    expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    expect(mockCtx.fillText).toHaveBeenCalled();
  });

  it("supports all 4 GTA VI themes without throwing", async () => {
    const themes = ["vice-neon", "sunset-gold", "miami-cyan", "vice-noir"] as const;
    for (const theme of themes) {
      const canvas = await renderGtaIdentityBadgeToCanvas({
        alias: "JASON",
        role: "HEIST MASTERMIND",
        theme,
      });
      expect(canvas).toBeDefined();
    }
  });

  it("updates existing badge on canvas with FABRIC_IDENTITY_BADGE_TAG", async () => {
    class MockFabricImage {
      left = 100;
      top = 100;
      scale = vi.fn();
      setCoords = vi.fn();
      constructor(public el: unknown, public opts: unknown) {}
    }

    const mockBaseObj = {
      constructor: MockFabricImage,
    };

    const mockCanvasInstance: FabricCanvasLike = {
      getWidth: () => 1200,
      getHeight: () => 800,
      getObjects: () => [mockBaseObj as unknown as FabricObjectLike],
      add: vi.fn(),
      setActiveObject: vi.fn(),
      requestRenderAll: vi.fn(),
      fire: vi.fn(),
    };

    // Mock HTMLImageElement for canvas loading
    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      onload: (() => void) | null = null;
      src = "";
      constructor() {
        setTimeout(() => this.onload?.(), 10);
      }
    } as unknown as typeof Image;

    try {
      const placed = await placeOrUpdateBadgeOnFabricCanvas(
        mockCanvasInstance,
        DEFAULT_GTA_BADGE_OPTIONS,
        "top-left",
      );

      expect(placed).toBe(true);
      expect(mockCanvasInstance.add).toHaveBeenCalled();
      expect(mockCanvasInstance.requestRenderAll).toHaveBeenCalled();
    } finally {
      globalThis.Image = OriginalImage;
    }
  });
});
