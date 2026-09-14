import { describe, expect, it, vi } from "vitest";
import { PlaceSearchService } from "./place-search";

describe("PlaceSearchService", () => {
  it("returns empty array for whitespace query without calling fetch", async () => {
    const fetchMock = vi.fn();
    const service = new PlaceSearchService({ fetchFn: fetchMock });

    const results = await service.search("   ");
    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("parses Nominatim response into disambiguated candidates", async () => {
    const mockNominatimData = [
      {
        place_id: 101,
        name: "Eiffel Tower",
        display_name: "Eiffel Tower, Champ de Mars, Paris, France",
        lat: "48.8584",
        lon: "2.2945",
        boundingbox: ["48.8574", "48.8594", "2.2935", "2.2955"],
      },
      {
        place_id: 102,
        display_name: "Eiffel Tower Restaurant, Las Vegas, NV, USA",
        lat: "36.1126",
        lon: "-115.1702",
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNominatimData,
    });

    const service = new PlaceSearchService({
      endpoint: "https://example.com/search",
      fetchFn: fetchMock,
    });

    const results = await service.search("Eiffel Tower");
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: "101",
      name: "Eiffel Tower",
      displayName: "Eiffel Tower, Champ de Mars, Paris, France",
      lat: 48.8584,
      lon: 2.2945,
      boundingBox: [48.8574, 48.8594, 2.2935, 2.2955],
    });
    expect(results[1].name).toBe("Eiffel Tower Restaurant");
    expect(results[1].boundingBox).toBeUndefined();
  });

  it("returns cached results on repeated queries without repeated network calls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 201,
          display_name: "Shinjuku, Tokyo, Japan",
          lat: "35.6938",
          lon: "139.7034",
        },
      ],
    });

    const service = new PlaceSearchService({
      endpoint: "https://example.com/search-cache",
      fetchFn: fetchMock,
    });

    const first = await service.search("Shinjuku");
    const second = await service.search("Shinjuku");

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("handles 429 rate limit errors with descriptive message", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
    });

    const service = new PlaceSearchService({
      endpoint: "https://example.com/search-429",
      fetchFn: fetchMock,
    });

    await expect(service.search("Rush Hour")).rejects.toThrow(
      /rate limit reached/i,
    );
  });
});
