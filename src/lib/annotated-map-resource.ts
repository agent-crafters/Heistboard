export const ANNOTATED_MAP_FILE_NAME = "heistboard-mission-plan.png";

export interface EditorSavePayload {
  dataUrl: string;
  blob: Blob;
}

export interface AnnotatedMapResource {
  previewUrl: string;
  editorSource: string;
  download: {
    href: string;
    fileName: typeof ANNOTATED_MAP_FILE_NAME;
  };
}

interface ObjectUrlApi {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
}

export type ImageDecoder = (url: string) => Promise<void>;

export async function decodeBrowserImage(url: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The saved image could not be decoded."));
    image.src = url;
  });
}

export class AnnotatedMapResourceOwner {
  #current: AnnotatedMapResource | null = null;

  constructor(private readonly urlApi: ObjectUrlApi = URL) {}

  get current(): AnnotatedMapResource | null {
    return this.#current;
  }

  async replace(
    payload: EditorSavePayload,
    decode: ImageDecoder = decodeBrowserImage,
  ): Promise<AnnotatedMapResource> {
    assertValidEditorSave(payload);

    const candidateUrl = this.urlApi.createObjectURL(payload.blob);
    try {
      await decode(candidateUrl);
    } catch (error) {
      this.urlApi.revokeObjectURL(candidateUrl);
      throw error;
    }

    const previousUrl = this.#current?.previewUrl;
    const next: AnnotatedMapResource = {
      previewUrl: candidateUrl,
      editorSource: payload.dataUrl,
      download: {
        href: candidateUrl,
        fileName: ANNOTATED_MAP_FILE_NAME,
      },
    };

    this.#current = next;
    if (previousUrl) this.urlApi.revokeObjectURL(previousUrl);
    return next;
  }

  dispose(): void {
    if (this.#current) this.urlApi.revokeObjectURL(this.#current.previewUrl);
    this.#current = null;
  }
}

function assertValidEditorSave(payload: EditorSavePayload): void {
  if (!/^data:image\/png;base64,/i.test(payload.dataUrl)) {
    throw new Error("The editor did not return a PNG data URL.");
  }

  if (payload.blob.size === 0 || payload.blob.type.toLowerCase() !== "image/png") {
    throw new Error("The editor did not return a valid PNG Blob.");
  }
}
