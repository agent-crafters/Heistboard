import {
  classifyPlaceCategory,
  type PlaceCandidate,
} from "@/domain/territory";

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
  type?: string;
  class?: string;
  boundingbox?: [string, string, string, string];
  address?: Record<string, string>;
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

  getCooldownRemainingMs(): number {
    const elapsed = Date.now() - lastRequestTimestamp;
    return Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);
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
        throw new Error(
          "Search service rate limit reached. Please wait a moment before searching again.",
        );
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
      const primaryName =
        item.name || item.display_name.split(",")[0].trim();

      // Extract meaningful subtitle by removing the primary name prefix
      const parts = item.display_name.split(",").map((p) => p.trim());
      const subtitleParts =
        parts[0].toLowerCase() === primaryName.toLowerCase()
          ? parts.slice(1)
          : parts;
      const subtitle = subtitleParts.slice(0, 3).join(", ");

      const category = classifyPlaceCategory(item.type, item.class);

      const boundingBox: [number, number, number, number] | undefined =
        item.boundingbox && item.boundingbox.length === 4
          ? [
              parseFloat(item.boundingbox[0]), // south
              parseFloat(item.boundingbox[1]), // north
              parseFloat(item.boundingbox[2]), // west
              parseFloat(item.boundingbox[3]), // east
            ]
          : undefined;

      return {
        id: String(item.place_id),
        name: primaryName,
        displayName: item.display_name,
        subtitle: subtitle || item.display_name,
        category,
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
