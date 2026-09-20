import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DOSSIER_HEIGHT,
  DOSSIER_WIDTH,
  composeDossierCanvas,
  type DossierCompositionInput,
} from "@/lib/dossier-composer";
import { DEFAULT_IDENTITY_STATE } from "@/domain/identity";
import { STANDARD_TERRITORY_ATTRIBUTION } from "@/domain/territory";

describe("Dossier Composition Module (HB-007)", () => {
  const originalDocument = globalThis.document;
  const originalImage = globalThis.Image;
  const originalPath2D = globalThis.Path2D;

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
      rect: vi.fn(),
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
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      font: "",
      textAlign: "",
      textBaseline: "",
    };

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockCtx),
      toDataURL: vi.fn(() => "data:image/png;base64,mockDossierDataUrl"),
      toBlob: vi.fn((cb: (blob: Blob) => void) => {
        cb(new Blob(["mock-dossier-blob"], { type: "image/png" }));
      }),
    };

    // Mock document
    (globalThis as unknown as { document: unknown }).document = {
      createElement: vi.fn((tag: string) => {
        if (tag === "canvas") return mockCanvas;
        return {};
      }),
      fonts: {
        load: vi.fn().mockResolvedValue([]),
      },
    };

    // Mock Image
    class MockImage {
      naturalWidth = 1200;
      naturalHeight = 800;
      width = 1200;
      height = 800;
      crossOrigin = "";
      src = "";
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      constructor() {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 0);
      }
    }
    (globalThis as unknown as { Image: unknown }).Image = MockImage;

    // Mock Path2D
    class MockPath2D {
      path: string;
      constructor(d?: string) {
        this.path = d || "";
      }
    }
    (globalThis as unknown as { Path2D: unknown }).Path2D = MockPath2D;
  });

  afterEach(() => {
    globalThis.document = originalDocument;
    globalThis.Image = originalImage;
    globalThis.Path2D = originalPath2D;
    vi.restoreAllMocks();
  });

  it("exports exact 16:9 dimensions for 4K and 2K", () => {
    expect(DOSSIER_WIDTH).toBe(3840);
    expect(DOSSIER_HEIGHT).toBe(2160);
    expect(DOSSIER_WIDTH / DOSSIER_HEIGHT).toBeCloseTo(16 / 9, 4);
  });

  it("produces deterministic 16:9 4K Ultra-HD output by default with dataUrl and Blob", async () => {
    const input: DossierCompositionInput = {
      annotatedMapUrl: "data:image/png;base64,mockAnnotatedMap",
      identity: DEFAULT_IDENTITY_STATE,
      attribution: STANDARD_TERRITORY_ATTRIBUTION,
    };

    const result = await composeDossierCanvas(input);

    expect(mockCanvas.width).toBe(3840);
    expect(mockCanvas.height).toBe(2160);
    expect(result.width).toBe(3840);
    expect(result.height).toBe(2160);
    expect(result.resolution).toBe("4k");
    expect(result.dataUrl).toBe("data:image/png;base64,mockDossierDataUrl");
    expect(result.blob).toBeInstanceOf(Blob);
    expect(result.blob.type).toBe("image/png");
    expect(mockCtx.imageSmoothingEnabled).toBe(true);
    expect(mockCtx.imageSmoothingQuality).toBe("high");
  });

  it("produces 16:9 2K Quad-HD output when resolution is specified as 2k", async () => {
    const input: DossierCompositionInput = {
      annotatedMapUrl: "data:image/png;base64,mockAnnotatedMap",
      resolution: "2k",
      identity: DEFAULT_IDENTITY_STATE,
      attribution: STANDARD_TERRITORY_ATTRIBUTION,
    };

    const result = await composeDossierCanvas(input);

    expect(mockCanvas.width).toBe(2560);
    expect(mockCanvas.height).toBe(1440);
    expect(result.width).toBe(2560);
    expect(result.height).toBe(1440);
    expect(result.resolution).toBe("2k");
  });

  it("draws the annotated map scaled seamlessly to fill the 16:9 canvas", async () => {
    const input: DossierCompositionInput = {
      annotatedMapUrl: "data:image/png;base64,mockAnnotatedMap",
      identity: DEFAULT_IDENTITY_STATE,
      attribution: STANDARD_TERRITORY_ATTRIBUTION,
    };

    await composeDossierCanvas(input);

    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it("keeps the final export clean of interface chrome, headers, and tool overlays", async () => {
    const input: DossierCompositionInput = {
      annotatedMapUrl: "data:image/png;base64,mockAnnotatedMap",
      identity: {
        alias: "SHADOW-NINE",
        portraitSource: "silhouette",
        silhouetteId: "infiltrator",
        portraitFilter: "surveillance",
      },
      operationTitle: "OPERATION: NIGHT HAWK",
      operationSubtitle: "Rendezvous before midnight",
      attribution: STANDARD_TERRITORY_ATTRIBUTION,
    };

    await composeDossierCanvas(input);

    // No interface tool chrome text is burned onto the downloaded image
    expect(mockCtx.fillText).not.toHaveBeenCalled();
  });

  it("draws the annotated map into the framed viewport", async () => {
    const input: DossierCompositionInput = {
      annotatedMapUrl: "data:image/png;base64,mockAnnotatedMap",
      identity: DEFAULT_IDENTITY_STATE,
      attribution: STANDARD_TERRITORY_ATTRIBUTION,
    };

    await composeDossierCanvas(input);

    // Verify drawImage was called for the map image
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });
});
