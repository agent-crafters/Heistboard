import { describe, expect, it, vi } from "vitest";

import {
  AnnotatedMapResourceOwner,
  ANNOTATED_MAP_FILE_NAME,
} from "./annotated-map-resource";

const firstPayload = {
  dataUrl: "data:image/png;base64,Zmlyc3Q=",
  blob: new Blob(["first"], { type: "image/png" }),
};

describe("Annotated Map resource", () => {
  it("uses one prepared image resource for preview and download", async () => {
    const urlApi = {
      createObjectURL: vi.fn(() => "blob:annotated-map-1"),
      revokeObjectURL: vi.fn(),
    };
    const owner = new AnnotatedMapResourceOwner(urlApi);

    const resource = await owner.replace(firstPayload, async () => undefined);

    expect(resource).toEqual({
      previewUrl: "blob:annotated-map-1",
      editorSource: firstPayload.dataUrl,
      download: {
        href: "blob:annotated-map-1",
        fileName: ANNOTATED_MAP_FILE_NAME,
      },
    });
  });

  it("revokes the previous object URL only after its replacement decodes", async () => {
    const urlApi = {
      createObjectURL: vi
        .fn<() => string>()
        .mockReturnValueOnce("blob:first")
        .mockReturnValueOnce("blob:second"),
      revokeObjectURL: vi.fn(),
    };
    const owner = new AnnotatedMapResourceOwner(urlApi);
    await owner.replace(firstPayload, async () => undefined);

    await owner.replace(
      {
        dataUrl: "data:image/png;base64,c2Vjb25k",
        blob: new Blob(["second"], { type: "image/png" }),
      },
      async () => undefined,
    );

    expect(urlApi.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:first");
    expect(owner.current?.previewUrl).toBe("blob:second");
  });

  it("revokes an invalid candidate and preserves the last valid save", async () => {
    const urlApi = {
      createObjectURL: vi
        .fn<() => string>()
        .mockReturnValueOnce("blob:first")
        .mockReturnValueOnce("blob:broken"),
      revokeObjectURL: vi.fn(),
    };
    const owner = new AnnotatedMapResourceOwner(urlApi);
    await owner.replace(firstPayload, async () => undefined);

    await expect(
      owner.replace(firstPayload, async () => {
        throw new Error("decode failed");
      }),
    ).rejects.toThrow("decode failed");

    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:broken");
    expect(owner.current?.previewUrl).toBe("blob:first");
  });

  it("rejects a non-PNG result instead of assigning a PNG filename", async () => {
    const urlApi = {
      createObjectURL: vi.fn(() => "blob:not-png"),
      revokeObjectURL: vi.fn(),
    };
    const owner = new AnnotatedMapResourceOwner(urlApi);

    await expect(
      owner.replace(
        {
          dataUrl: "data:image/jpeg;base64,bm90LXBuZw==",
          blob: new Blob(["not-png"], { type: "image/jpeg" }),
        },
        async () => undefined,
      ),
    ).rejects.toThrow("PNG data URL");

    expect(urlApi.createObjectURL).not.toHaveBeenCalled();
    expect(owner.current).toBeNull();
  });

  it("releases the current object URL on disposal", async () => {
    const urlApi = {
      createObjectURL: vi.fn(() => "blob:annotated-map-1"),
      revokeObjectURL: vi.fn(),
    };
    const owner = new AnnotatedMapResourceOwner(urlApi);
    await owner.replace(firstPayload, async () => undefined);

    owner.dispose();

    expect(urlApi.revokeObjectURL).toHaveBeenCalledWith("blob:annotated-map-1");
    expect(owner.current).toBeNull();
  });
});
