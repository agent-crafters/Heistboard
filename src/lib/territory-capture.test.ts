import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAPTURE_HEIGHT,
  DEFAULT_CAPTURE_TIMEOUT_MS,
  DEFAULT_CAPTURE_WIDTH,
  captureTerritoryShot,
} from "./territory-capture";

describe("territory-capture", () => {
  it("exports expected default dimensions and timeout values", () => {
    expect(DEFAULT_CAPTURE_WIDTH).toBe(1200);
    expect(DEFAULT_CAPTURE_HEIGHT).toBe(800);
    expect(DEFAULT_CAPTURE_TIMEOUT_MS).toBe(15_000);
  });

  it("throws a descriptive error when invoked in a non-browser environment", async () => {
    // In node environment, window or document may be undefined
    const mockCamera = {
      center: [-0.1195, 51.5033] as [number, number],
      zoom: 15,
      pitch: 45,
      bearing: 0,
    };

    if (typeof window === "undefined") {
      await expect(captureTerritoryShot(mockCamera)).rejects.toThrow(
        /browser environment/i,
      );
    }
  });
});
