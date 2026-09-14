import type { PlaceCandidate } from "@/domain/territory";

export interface PlaceSearchOptions {
  endpoint?: string;
  limit?: number;
  fetchFn?: typeof fetch;
}

interface RawNominatimItem {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string];
}

const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const MIN_REQUEST_INTERVAL_MS = 1000;

// Application-wide in-memory rate limiting and cache
let lastRequestTimestamp = 0;
const searchCache = new Map<string, PlaceCandidate[]>();

export class PlaceSearchService {
  private readonly endpoint: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: PlaceSearchOptions = {}) {
    this.endpoint =
      options.endpoint ||
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_NOMINATIM_URL) ||
      DEFAULT_NOMINATIM_URL;
    this.fetchFn = options.fetchFn || fetch;
  }

  async search(query: string, limit = 5): Promise<PlaceCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const cacheKey = `${this.endpoint}::${trimmed.toLowerCase()}::${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    // Enforce 1 req/sec rate limit across the application
    const now = Date.now();
    const elapsed = now - lastRequestTimestamp;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      const waitTime = MIN_REQUEST_INTERVAL_MS - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastRequestTimestamp = Date.now();

    const url = new URL(this.endpoint);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("addressdetails", "1");

    const response = await this.fetchFn(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Search service rate limit reached. Please wait a moment before searching again.");
      }
      throw new Error(`Search service responded with status ${response.status}.`);
    }

    const rawData = (await response.json()) as RawNominatimItem[];
    if (!Array.isArray(rawData)) {
      throw new Error("Invalid response format from search service.");
    }

    const results: PlaceCandidate[] = rawData.map((item) => {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      const boundingBox: [number, number, number, number] | undefined =
        item.boundingbox && item.boundingbox.length === 4
          ? [
              parseFloat(item.boundingbox[0]),
              parseFloat(item.boundingbox[1]),
              parseFloat(item.boundingbox[2]),
              parseFloat(item.boundingbox[3]),
            ]
          : undefined;

      return {
        id: String(item.place_id),
        name: item.name || item.display_name.split(",")[0].trim(),
        displayName: item.display_name,
        lat,
        lon,
        boundingBox,
      };
    });

    searchCache.set(cacheKey, results);
    return results;
  }

  clearCache(): void {
    searchCache.clear();
  }
}

export const defaultPlaceSearchService = new PlaceSearchService();
