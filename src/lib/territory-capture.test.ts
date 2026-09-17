import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CAPTURE_HEIGHT,
  DEFAULT_CAPTURE_TIMEOUT_MS,
  DEFAULT_CAPTURE_WIDTH,
  captureTerritoryShot,
  waitForMapIdle,
} from "./territory-capture";

describe("territory-capture", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exports expected default 3:2 landscape dimensions and timeout values", () => {
    expect(DEFAULT_CAPTURE_WIDTH).toBe(1200);
    expect(DEFAULT_CAPTURE_HEIGHT).toBe(800);
    expect(DEFAULT_CAPTURE_WIDTH / DEFAULT_CAPTURE_HEIGHT).toBe(1.5);
    expect(DEFAULT_CAPTURE_TIMEOUT_MS).toBe(15_000);
  });

  it("throws a descriptive error when invoked in a non-browser environment", async () => {
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

  it("rejects a timed-out capture while visible tiles are still incomplete", async () => {
    vi.useFakeTimers();
    const map = {
      loaded: () => true,
      areTilesLoaded: () => false,
      once: vi.fn(),
      on: vi.fn(),
    };

    const result = waitForMapIdle(map, 100);
    const assertion = expect(result).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
