import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GTA_BADGE_OPTIONS,
  FABRIC_IDENTITY_BADGE_TAG,
  hasBadgeOnFabricCanvas,
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

  it("detects existing badge on canvas and preserves position when updating in-place", async () => {
    class MockFabricImage {
      left = 250;
      top = 180;
      scaleX = 0.5;
      scale = vi.fn();
      setCoords = vi.fn();
      constructor(public el: unknown, public opts: unknown) {}
    }

    const existingBadge = {
      constructor: MockFabricImage,
      left: 250,
      top: 180,
      scaleX: 0.5,
      scale: vi.fn(),
      setCoords: vi.fn(),
      [FABRIC_IDENTITY_BADGE_TAG]: true,
    };

    const removeFn = vi.fn();
    const mockCanvasInstance: FabricCanvasLike & { remove: typeof removeFn } = {
      getWidth: () => 1200,
      getHeight: () => 800,
      getObjects: () => [existingBadge as unknown as FabricObjectLike],
      add: vi.fn(),
      remove: removeFn,
      setActiveObject: vi.fn(),
      requestRenderAll: vi.fn(),
      fire: vi.fn(),
    };

    expect(hasBadgeOnFabricCanvas(mockCanvasInstance)).toBe(true);

    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      onload: (() => void) | null = null;
      src = "";
      constructor() {
        setTimeout(() => this.onload?.(), 10);
      }
    } as unknown as typeof Image;

    try {
      const updated = await placeOrUpdateBadgeOnFabricCanvas(
        mockCanvasInstance,
        { ...DEFAULT_GTA_BADGE_OPTIONS, alias: "LUCIA", bounty: "$2,000,000" },
      );

      expect(updated).toBe(true);
      expect(removeFn).toHaveBeenCalledWith(existingBadge);
      expect(mockCanvasInstance.add).toHaveBeenCalled();
    } finally {
      globalThis.Image = OriginalImage;
    }
  });

  it("attaches click and selection event handlers to open identity edit section when badge is clicked", async () => {
    class MockFabricImageWithEvents {
      left = 250;
      top = 180;
      scale = vi.fn();
      setCoords = vi.fn();
      on = vi.fn();
      constructor(public el: unknown, public opts: unknown) {}
    }

    const mockBaseObj = {
      constructor: MockFabricImageWithEvents,
    };

    const canvasHandlers: Record<string, (e: Record<string, unknown>) => void> = {};
    const mockCanvasInstance: FabricCanvasLike = {
      getWidth: () => 1200,
      getHeight: () => 800,
      getObjects: () => [mockBaseObj as unknown as FabricObjectLike],
      add: vi.fn(),
      setActiveObject: vi.fn(),
      requestRenderAll: vi.fn(),
      on: vi.fn((event: string, handler: (e: Record<string, unknown>) => void) => {
        canvasHandlers[event] = handler;
      }),
    };

    const OriginalImage = globalThis.Image;
    globalThis.Image = class {
      onload: (() => void) | null = null;
      src = "";
      constructor() {
        setTimeout(() => this.onload?.(), 10);
      }
    } as unknown as typeof Image;

    const eventListener = vi.fn();
    const origWindow = (globalThis as unknown as { window?: unknown }).window;
    const mockWindow = {
      addEventListener: vi.fn((event: string, fn: () => void) => {
        if (event === "heistboard:open-identity-tool") {
          eventListener();
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event: CustomEvent) => {
        if (event.type === "heistboard:open-identity-tool") {
          eventListener();
        }
        return true;
      }),
    };
    (globalThis as unknown as { window: unknown }).window = mockWindow;

    try {
      const placed = await placeOrUpdateBadgeOnFabricCanvas(
        mockCanvasInstance,
        DEFAULT_GTA_BADGE_OPTIONS,
      );

      expect(placed).toBe(true);
      expect(mockCanvasInstance.on).toHaveBeenCalledWith("mouse:down", expect.any(Function));

      // Simulate clicking on the identity badge on canvas
      canvasHandlers["mouse:down"]?.({
        target: { [FABRIC_IDENTITY_BADGE_TAG]: true },
      });

      expect(eventListener).toHaveBeenCalled();
    } finally {
      (globalThis as unknown as { window?: unknown }).window = origWindow;
      globalThis.Image = OriginalImage;
    }
  });
});
