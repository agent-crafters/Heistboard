import { describe, expect, it, vi } from "vitest";
import {
  findFabricCanvas,
  importStickerToCanvas,
  type FabricCanvasLike,
  type FabricObjectLike,
} from "@/lib/sticker-canvas-importer";

class MockFabricImage implements FabricObjectLike {
  left = 0;
  top = 0;
  originX = "left";
  originY = "top";
  scaleVal = 1;

  constructor(
    public element: HTMLImageElement,
    public options: Record<string, unknown>,
  ) {
    Object.assign(this, options);
  }

  scale(val: number): void {
    this.scaleVal = val;
  }
}

describe("Sticker Canvas Importer", () => {
  it("returns null if canvas element is missing", () => {
    const canvas = findFabricCanvas(null);
    expect(canvas).toBeNull();
  });

  it("adds and scales sticker image onto a valid Fabric canvas", async () => {
    const addedObjects: FabricObjectLike[] = [];
    let activeObj: FabricObjectLike | null = null;
    let renderCalled = false;

    const baseImage = new MockFabricImage({} as HTMLImageElement, {});

    const mockCanvas: FabricCanvasLike = {
      getWidth: () => 800,
      getHeight: () => 600,
      getObjects: () => [baseImage, ...addedObjects],
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

    // Create a mock canvas element with fiber hook
    const mockCanvasEl: Record<string, unknown> = {
      __reactFiber$test: {
        memoizedState: {
          memoizedState: {
            current: mockCanvas,
          },
        },
      },
    };

    // Mock root element that returns mockCanvasEl on querySelector
    const mockContainer = {
      querySelector: vi.fn((selector: string) => {
        if (selector.includes("canvas")) {
          return mockCanvasEl;
        }
        return null;
      }),
    } as unknown as HTMLElement;

    // Mock Image global in node test environment
    const OriginalImage = globalThis.Image;
    class TestMockImage {
      naturalWidth = 100;
      naturalHeight = 100;
      crossOrigin = "";
      src = "";
      onload: ((e: Event) => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        setTimeout(() => {
          this.onload?.({} as Event);
        }, 5);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Image = TestMockImage as any;

    try {
      const success = await importStickerToCanvas("/gta-stickers/Car.png", {
        rootElement: mockContainer,
        position: { x: 300, y: 200 },
      });

      expect(success).toBe(true);
      expect(mockCanvas.add).toHaveBeenCalledTimes(1);
      expect(mockCanvas.setActiveObject).toHaveBeenCalledTimes(1);
      expect(renderCalled).toBe(true);
      expect(addedObjects).toHaveLength(1);
      expect(addedObjects[0].left).toBe(300);
      expect(addedObjects[0].top).toBe(200);
      expect(activeObj).toBe(addedObjects[0]);
    } finally {
      globalThis.Image = OriginalImage;
    }
  });
});
