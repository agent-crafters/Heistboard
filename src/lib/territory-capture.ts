import {
  OPENFREEMAP_LIBERTY_STYLE,
  STANDARD_MAP_BASE_HEIGHT,
  STANDARD_MAP_BASE_WIDTH,
  type TerritoryCameraState,
} from "@/domain/territory";

export type CapturePhase =
  | "initializing"
  | "loading-tiles"
  | "rendering"
  | "encoding"
  | "verifying";

export interface TerritoryCaptureOptions {
  styleUrl?: string;
  width?: number;
  height?: number;
  timeoutMs?: number;
  onProgress?: (phase: CapturePhase) => void;
}

export interface TerritoryCaptureResult {
  blob: Blob;
  width: number;
  height: number;
  camera: TerritoryCameraState;
}

export const DEFAULT_CAPTURE_WIDTH = STANDARD_MAP_BASE_WIDTH;
export const DEFAULT_CAPTURE_HEIGHT = STANDARD_MAP_BASE_HEIGHT;
export const DEFAULT_CAPTURE_TIMEOUT_MS = 15_000;

export async function captureTerritoryShot(
  camera: TerritoryCameraState,
  options: TerritoryCaptureOptions = {},
): Promise<TerritoryCaptureResult> {
  const width = options.width ?? DEFAULT_CAPTURE_WIDTH;
  const height = options.height ?? DEFAULT_CAPTURE_HEIGHT;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CAPTURE_TIMEOUT_MS;
  const styleUrl = options.styleUrl ?? OPENFREEMAP_LIBERTY_STYLE;
  const onProgress = options.onProgress ?? (() => {});

  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Territory capture can only be executed in a browser environment.");
  }

  onProgress("initializing");

  // Dynamically import maplibre-gl to avoid SSR issues
  const maplibregl = await import("maplibre-gl");
  maplibregl.config.WORKER_URL = "/maplibre/maplibre-gl-worker.mjs";

  // Create offscreen container matching exact dimensions
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.overflow = "hidden";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  let mapInstance: InstanceType<typeof maplibregl.Map> | null = null;

  try {
    const map = new maplibregl.Map({
      container,
      style: styleUrl,
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      interactive: false,
      attributionControl: false,
      fadeDuration: 0,
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
        antialias: true,
      },
    });
    mapInstance = map;

    onProgress("loading-tiles");
    await waitForMapIdle(map, timeoutMs);

    onProgress("rendering");
    const canvas = map.getCanvas();
    if (!canvas) {
      throw new Error("Failed to acquire WebGL canvas from MapLibre capture instance.");
    }

    onProgress("encoding");
    const blob = await canvasToBlob(canvas);
    if (!blob || blob.size === 0) {
      throw new Error("The capture renderer produced an empty image blob.");
    }

    onProgress("verifying");
    if (blob.size < 512) {
      throw new Error("The capture renderer produced a blank or invalid image.");
    }

    return {
      blob,
      width,
      height,
      camera,
    };
  } finally {
    if (mapInstance) {
      try {
        mapInstance.remove();
      } catch {
        // Suppress teardown errors
      }
    }
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  }
}

function waitForMapIdle(
  map: {
    loaded(): boolean;
    areTilesLoaded(): boolean;
    once(event: string, listener: () => void): void;
    on(event: string, listener: (e: { error?: unknown }) => void): void;
  },
  timeoutMs: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        // If tiles are already loaded or map loaded, accept current state rather than hanging
        if (map.loaded()) {
          resolve();
        } else {
          reject(
            new Error(
              `Territory capture timed out after ${timeoutMs}ms waiting for map tiles.`,
            ),
          );
        }
      }
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
    };

    const checkReady = () => {
      if (!settled && map.loaded() && map.areTilesLoaded()) {
        settled = true;
        cleanup();
        resolve();
      }
    };

    map.on("error", (e) => {
      // Non-fatal tile 404s shouldn't fail capture if map is otherwise loaded
      console.warn("MapLibre capture warning:", e?.error);
    });

    map.once("idle", () => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve();
      }
    });

    // In case idle fired before listeners attached
    checkReady();
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}
