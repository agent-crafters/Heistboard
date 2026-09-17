import {
  classifyPlaceCategory,
  type PlaceCandidate,
} from "@/domain/territory";

export interface PlaceSearchOptions {
  endpoint?: string;
  limit?: number;
  fetchFn?: typeof fetch;
  minIntervalMs?: number;
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
export const MAX_SEARCH_CACHE_ENTRIES = 50;

// Application-wide in-memory rate limiting and bounded cache
let lastRequestTimestamp = 0;
let requestQueue: Promise<void> = Promise.resolve();
const searchCache = new Map<string, PlaceCandidate[]>();
const inFlightSearches = new Map<string, Promise<PlaceCandidate[]>>();

export class PlaceSearchService {
  private readonly endpoint: string;
  private readonly customFetch?: typeof fetch;
  private readonly minIntervalMs: number;
  private readonly defaultLimit: number;

  constructor(options: PlaceSearchOptions = {}) {
    this.endpoint =
      options.endpoint ||
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_NOMINATIM_URL) ||
      DEFAULT_NOMINATIM_URL;
    this.customFetch = options.fetchFn;
    this.minIntervalMs = options.minIntervalMs ?? MIN_REQUEST_INTERVAL_MS;
    this.defaultLimit = options.limit ?? 5;
  }

  getCooldownRemainingMs(): number {
    const elapsed = Date.now() - lastRequestTimestamp;
    return Math.max(0, this.minIntervalMs - elapsed);
  }

  async search(query: string, limit = this.defaultLimit): Promise<PlaceCandidate[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const boundedLimit = Math.max(1, Math.min(10, Math.trunc(limit)));

    const cacheKey = `${this.endpoint}::${trimmed.toLowerCase()}::${boundedLimit}`;
    const cached = searchCache.get(cacheKey);
    if (cached) return cached;

    const pending = inFlightSearches.get(cacheKey);
    if (pending) return pending;

    const request = this.fetchAndCache(trimmed, boundedLimit, cacheKey);
    const shouldTrackRequest = inFlightSearches.size < MAX_SEARCH_CACHE_ENTRIES;
    if (shouldTrackRequest) inFlightSearches.set(cacheKey, request);
    try {
      return await request;
    } finally {
      if (shouldTrackRequest && inFlightSearches.get(cacheKey) === request) {
        inFlightSearches.delete(cacheKey);
      }
    }
  }

  private async fetchAndCache(
    query: string,
    limit: number,
    cacheKey: string,
  ): Promise<PlaceCandidate[]> {
    await reserveRequestSlot(this.minIntervalMs);

    const url = new URL(this.endpoint);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("addressdetails", "1");

    const response = await (this.customFetch
      ? this.customFetch(url.toString(), {
          headers: {
            Accept: "application/json",
          },
        })
      : globalThis.fetch(url.toString(), {
          headers: {
            Accept: "application/json",
          },
        }));

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

    const results: PlaceCandidate[] = rawData.flatMap((item) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180 ||
        !item.display_name?.trim() ||
        !Number.isFinite(item.place_id)
      ) {
        return [];
      }
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

      const parsedBoundingBox = item.boundingbox?.map(Number);
      const boundingBox: [number, number, number, number] | undefined =
        parsedBoundingBox?.length === 4 && parsedBoundingBox.every(Number.isFinite)
          ? (parsedBoundingBox as [number, number, number, number])
          : undefined;

      return [{
        id: String(item.place_id),
        name: primaryName,
        displayName: item.display_name,
        subtitle: subtitle || item.display_name,
        category,
        lat,
        lon,
        boundingBox,
      }];
    });

    if (searchCache.size >= MAX_SEARCH_CACHE_ENTRIES) {
      const oldestKey = searchCache.keys().next().value;
      if (oldestKey) searchCache.delete(oldestKey);
    }
    searchCache.set(cacheKey, results);
    return results;
  }

  clearCache(): void {
    searchCache.clear();
  }
}

export const defaultPlaceSearchService = new PlaceSearchService();

async function reserveRequestSlot(minIntervalMs: number): Promise<void> {
  const reservation = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestTimestamp;
    const waitTime = Math.max(0, minIntervalMs - elapsed);
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    lastRequestTimestamp = Date.now();
  });

  requestQueue = reservation.catch(() => undefined);
  await reservation;
}
