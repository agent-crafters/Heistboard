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

  it("parses Nominatim response with categories and subtitles", async () => {
    const mockNominatimData = [
      {
        place_id: 101,
        name: "Eiffel Tower",
        display_name: "Eiffel Tower, Champ de Mars, Paris, France",
        lat: "48.8584",
        lon: "2.2945",
        type: "monument",
        class: "tourism",
        boundingbox: ["48.8574", "48.8594", "2.2935", "2.2955"],
      },
      {
        place_id: 102,
        name: "SoHo",
        display_name: "SoHo, Manhattan, New York, NY, USA",
        lat: "40.7233",
        lon: "-74.0030",
        type: "neighbourhood",
        class: "place",
      },
      {
        place_id: 103,
        name: "Oxford Street",
        display_name: "Oxford Street, Westminster, London, UK",
        lat: "51.5154",
        lon: "-0.1418",
        type: "road",
        class: "highway",
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockNominatimData,
    });

    const service = new PlaceSearchService({
      endpoint: "https://example.com/search-categories",
      fetchFn: fetchMock,
    });

    const results = await service.search("Paris London NY");
    expect(results).toHaveLength(3);

    // Landmark check
    expect(results[0].category).toBe("landmark");
    expect(results[0].name).toBe("Eiffel Tower");
    expect(results[0].subtitle).toBe("Champ de Mars, Paris, France");
    expect(results[0].boundingBox).toEqual([48.8574, 48.8594, 2.2935, 2.2955]);

    // Neighborhood check
    expect(results[1].category).toBe("neighborhood");
    expect(results[1].name).toBe("SoHo");
    expect(results[1].subtitle).toBe("Manhattan, New York, NY");

    // Street check
    expect(results[2].category).toBe("street");
    expect(results[2].name).toBe("Oxford Street");
    expect(results[2].subtitle).toBe("Westminster, London, UK");
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
          type: "suburb",
          class: "place",
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
