export type FabricImageConstructor = new (
  element: HTMLImageElement,
  options: Record<string, unknown>,
) => FabricObjectLike;

export interface FabricObjectLike {
  left?: number;
  top?: number;
  scaleX?: number;
  scaleY?: number;
  originX?: string;
  originY?: string;
  selectable?: boolean;
  hasControls?: boolean;
  hasBorders?: boolean;
  scale(val: number): void;
  getScaledWidth?(): number;
  getScaledHeight?(): number;
  setCoords?(): void;
  constructor: unknown;
}

export interface FabricCanvasLike {
  getWidth(): number;
  getHeight(): number;
  getObjects(): FabricObjectLike[];
  add(obj: FabricObjectLike): void;
  setActiveObject(obj: FabricObjectLike): void;
  requestRenderAll(): void;
  calcOffset?(): void;
  fire?(eventName: string, options?: Record<string, unknown>): void;
  getPointer?(event: MouseEvent | DragEvent): { x: number; y: number };
}

interface ReactFiberNode {
  memoizedState?: {
    memoizedState?: {
      current?: unknown;
    };
    next?: ReactFiberNode["memoizedState"];
  };
  return?: ReactFiberNode;
}

/**
 * Traverses React Fiber from the canvas element to find the underlying Fabric canvas instance.
 */
export function findFabricCanvas(
  rootElement?: HTMLElement | null,
): FabricCanvasLike | null {
  const root =
    rootElement ?? (typeof document !== "undefined" ? document : null);
  if (!root) return null;

  const canvas =
    root.querySelector<HTMLCanvasElement>('canvas[data-fabric="main"]') ??
    root.querySelector<HTMLCanvasElement>("canvas.lower-canvas");

  if (!canvas) return null;

  const fiberKey = Object.keys(canvas).find((k) => k.startsWith("__reactFiber"));
  if (!fiberKey) return null;

  let curr: ReactFiberNode | undefined = (
    canvas as unknown as Record<string, ReactFiberNode>
  )[fiberKey];

  let depth = 0;
  while (curr && depth < 40) {
    depth++;
    let hook = curr.memoizedState;
    while (hook) {
      const candidate = hook.memoizedState?.current as
        | Partial<FabricCanvasLike>
        | undefined;
      if (
        candidate &&
        typeof candidate.add === "function" &&
        typeof candidate.requestRenderAll === "function" &&
        typeof candidate.getObjects === "function"
      ) {
        return candidate as FabricCanvasLike;
      }
      hook = hook.next;
    }
    curr = curr.return;
  }

  return null;
}

export interface ImportStickerOptions {
  position?: { x: number; y: number };
  scale?: number;
  rootElement?: HTMLElement | null;
}

/**
 * Imports a sticker image onto the active Unlayer Fabric canvas.
 */
export async function importStickerToCanvas(
  stickerUrl: string,
  options?: ImportStickerOptions,
): Promise<boolean> {
  const fabricCanvas = findFabricCanvas(options?.rootElement);
  if (!fabricCanvas) {
    console.warn("Unlayer Fabric canvas could not be found.");
    return false;
  }

  const objects = fabricCanvas.getObjects();
  const baseObject = objects[0];
  const ImageClass = baseObject?.constructor as
    | FabricImageConstructor
    | undefined;

  if (!ImageClass) {
    console.warn("Fabric Image constructor is unavailable from canvas base object.");
    return false;
  }

  return new Promise<boolean>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvasW = fabricCanvas.getWidth();
        const canvasH = fabricCanvas.getHeight();

        const left = options?.position?.x ?? canvasW / 2;
        const top = options?.position?.y ?? canvasH / 2;

        const sticker = new ImageClass(img, {
          left,
          top,
          originX: "center",
          originY: "center",
          selectable: true,
          hasControls: true,
          hasBorders: true,
        });

        // Compute proportional scale (~25% of visible canvas dimension)
        const naturalMax = Math.max(img.naturalWidth || 1, img.naturalHeight || 1);
        const targetDim = Math.min(canvasW, canvasH) * 0.25;
        const scaleFactor = options?.scale ?? targetDim / naturalMax;

        sticker.scale(scaleFactor);
        if (typeof sticker.setCoords === "function") {
          sticker.setCoords();
        }

        fabricCanvas.add(sticker);
        fabricCanvas.setActiveObject(sticker);

        // Notify fabric change listeners so Unlayer history is preserved
        fabricCanvas.fire?.("object:added", { target: sticker });
        fabricCanvas.fire?.("object:modified", { target: sticker });
        fabricCanvas.requestRenderAll();

        resolve(true);
      } catch (err) {
        console.error("Failed to add sticker to canvas:", err);
        resolve(false);
      }
    };

    img.onerror = () => {
      console.error(`Failed to load sticker image from ${stickerUrl}`);
      resolve(false);
    };

    img.src = stickerUrl;
  });
}
