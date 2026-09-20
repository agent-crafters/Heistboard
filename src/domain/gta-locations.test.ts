import { describe, expect, it } from "vitest";
import {
  GTA_LOCATIONS_POOL,
  getRandomGtaLocation,
  getGtaLocationById,
} from "./gta-locations";

describe("GTA VI Locations Domain", () => {
  it("provides an extensive pool of curated GTA VI locations", () => {
    expect(GTA_LOCATIONS_POOL.length).toBeGreaterThanOrEqual(18);
    for (const loc of GTA_LOCATIONS_POOL) {
      expect(loc.id).toBeTruthy();
      expect(loc.name).toBeTruthy();
      expect(loc.codename).toMatch(/^LEONIDA (SECTOR|VENUE|LANDMARK|RESORT|ARENA|ENCLAVE)/);
      expect(loc.camera.center[0]).toBeLessThan(0); // Longitude in Americas (FL)
      expect(loc.camera.center[1]).toBeGreaterThan(20); // Latitude in Florida
      expect(loc.camera.zoom).toBeGreaterThan(12);
      expect(loc.camera.pitch).toBeGreaterThanOrEqual(0);
      expect(loc.camera.bearing).toBeDefined();
    }

    // Verify key user-requested iconic landmarks exist
    const names = GTA_LOCATIONS_POOL.map((l) => l.name);
    expect(names).toContain("Ocean Beach");
    expect(names).toContain("Little Cuba");
    expect(names).toContain("Tisha-Wocka");
    expect(names).toContain("VC Port");
    expect(names).toContain("Southside");
    expect(names).toContain("Vice Beach");
    expect(names).toContain("The Malibu Club");
    expect(names).toContain("Ocean View Hotel");
    expect(names).toContain("Jack of Hearts Strip Club");
  });

  it("returns a valid random location from the pool", () => {
    const randomLoc = getRandomGtaLocation();
    expect(GTA_LOCATIONS_POOL).toContainEqual(randomLoc);
  });

  it("excludes specific location when requested during re-randomization", () => {
    const excludeId = GTA_LOCATIONS_POOL[0]!.id;
    for (let i = 0; i < 20; i++) {
      const loc = getRandomGtaLocation(excludeId);
      expect(loc.id).not.toBe(excludeId);
    }
  });

  it("finds location by ID", () => {
    const found = getGtaLocationById("vice-city-downtown");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Vice City Downtown");

    const missing = getGtaLocationById("non-existent-sector");
    expect(missing).toBeUndefined();
  });
});
