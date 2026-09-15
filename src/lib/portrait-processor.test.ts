import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyPortraitFilter,
  cropAndFilterPortrait,
  type PortraitCropOptions,
} from "./portrait-processor";

describe("Portrait Processor Engine", () => {
  const originalDocument = globalThis.document;

  let mockCtx: any;
  let mockCanvas: any;

  beforeEach(() => {
    // 512x512 dummy RGBA image data
    const dummyImageData = {
      data: new Uint8ClampedArray(512 * 512 * 4).fill(128),
      width: 512,
      height: 512,
    };

    mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(() => dummyImageData),
      putImageData: vi.fn(),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: "",
    };

    mockCanvas = {
      width: 512,
      height: 512,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => "data:image/png;base64,mockPortrait"),
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
        callback(new Blob(["mock-portrait-bytes"], { type: "image/png" }));
      }),
    };

    const mockDocument = {
      createElement: vi.fn((tag: string) => {
        if (tag === "canvas") {
          return mockCanvas;
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

  it("crops source image to square dimensions and exports dataUrl and Blob", async () => {
    const mockImage = {
      naturalWidth: 1000,
      naturalHeight: 800,
      width: 1000,
      height: 800,
    } as unknown as HTMLImageElement;

    const options: PortraitCropOptions = {
      zoom: 1.5,
      offsetX: 0,
      offsetY: 0,
      filter: "raw",
      targetSize: 512,
    };

    const result = await cropAndFilterPortrait(mockImage, options);

    expect(mockCanvas.getContext).toHaveBeenCalledWith("2d", { willReadFrequently: true });
    expect(mockCtx.drawImage).toHaveBeenCalled();
    expect(result.dataUrl).toBe("data:image/png;base64,mockPortrait");
    expect(result.blob).toBeDefined();
    expect(result.width).toBe(512);
    expect(result.height).toBe(512);
  });

  it("applies surveillance filter with scanlines and cyan-green tint", () => {
    applyPortraitFilter(mockCtx, 512, 512, "surveillance");
    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(mockCtx.putImageData).toHaveBeenCalled();
    // Scanlines and vignette call fillRect
    expect(mockCtx.fillRect).toHaveBeenCalled();
  });

  it("applies film-noir filter with high-contrast grayscale", () => {
    applyPortraitFilter(mockCtx, 512, 512, "film-noir");
    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(mockCtx.putImageData).toHaveBeenCalled();
    expect(mockCtx.createRadialGradient).toHaveBeenCalled();
  });

  it("applies petrol duotone mapping to Heistboard palette", () => {
    applyPortraitFilter(mockCtx, 512, 512, "duotone-petrol");
    expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 512, 512);
    expect(mockCtx.putImageData).toHaveBeenCalled();
  });

  it("bypasses pixel manipulation for raw filter", () => {
    applyPortraitFilter(mockCtx, 512, 512, "raw");
    expect(mockCtx.getImageData).not.toHaveBeenCalled();
    expect(mockCtx.putImageData).not.toHaveBeenCalled();
  });
});
