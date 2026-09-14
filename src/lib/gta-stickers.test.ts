import { describe, expect, it } from "vitest";
import {
  GTA_STICKERS,
  getStickersByCategory,
} from "./gta-stickers";

describe("GTA Stickers Catalog", () => {
  it("contains all 30 sticker assets", () => {
    expect(GTA_STICKERS).toHaveLength(30);
  });

  it("filters stickers by category", () => {
    const waypoints = getStickersByCategory("waypoints");
    expect(waypoints).toHaveLength(6);
    expect(waypoints.every((s) => s.category === "waypoints")).toBe(true);

    const tactical = getStickersByCategory("tactical");
    expect(tactical.length).toBeGreaterThan(10);
    expect(tactical.every((s) => s.category === "tactical")).toBe(true);

    const tools = getStickersByCategory("tools");
    expect(tools.length).toBeGreaterThan(5);
    expect(tools.every((s) => s.category === "tools")).toBe(true);
  });

  it("filters stickers by search query", () => {
    const searchCar = getStickersByCategory("all", "car");
    expect(searchCar.some((s) => s.id === "car")).toBe(true);

    const searchWaypoint = getStickersByCategory("all", "1");
    expect(searchWaypoint.some((s) => s.id === "waypoint-1")).toBe(true);
  });
});
