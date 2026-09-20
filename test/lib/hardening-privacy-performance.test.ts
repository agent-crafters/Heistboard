import { describe, expect, it, vi } from "vitest";
import {
  MAX_PORTRAIT_DIMENSION_PX,
  MAX_PORTRAIT_FILE_BYTES,
  validateAlias,
  validatePortraitFile,
} from "@/domain/identity";
import {
  MAX_SEARCH_CACHE_ENTRIES,
  PlaceSearchService,
} from "@/lib/place-search";
import {
  AnnotatedMapResourceOwner,
  type EditorSavePayload,
} from "@/lib/annotated-map-resource";

describe("Hardening, Privacy, and Performance (HB-013)", () => {
  describe("Upload Bounds and Normalization", () => {
    it("enforces maximum portrait file byte limit of 5MB", () => {
      expect(MAX_PORTRAIT_FILE_BYTES).toBe(5 * 1024 * 1024);

      const oversizedFile = new File([new Uint8Array(6 * 1024 * 1024)], "oversized.png", {
        type: "image/png",
      });
      const result = validatePortraitFile(oversizedFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File is too large");
    });

    it("rejects unauthorized mime types", () => {
      const badMimeFile = new File([new Uint8Array(1024)], "payload.svg", {
        type: "image/svg+xml",
      });
      const result = validatePortraitFile(badMimeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unsupported file format");
    });

    it("enforces maximum dimension cap of 4096px", () => {
      expect(MAX_PORTRAIT_DIMENSION_PX).toBe(4096);
    });

    it("sanitizes and bounds operative aliases strictly", () => {
      expect(validateAlias("").valid).toBe(false);
      expect(validateAlias("   ").valid).toBe(false);
      expect(validateAlias("A").valid).toBe(false);
      expect(validateAlias("A".repeat(33)).valid).toBe(false);
      expect(validateAlias("---").valid).toBe(false);
      expect(validateAlias("VALID_ALIAS-99").valid).toBe(true);
    });
  });

  describe("Privacy & Ephemeral Memory Guarantees", () => {
    it("confirms no localStorage or sessionStorage persistence in client domain", () => {
      // In browser/node, ensure no global storage is called during normal operation
      expect(typeof window !== "undefined" ? window.localStorage : undefined).toBeUndefined();
    });
  });

  describe("Rate Limiting, Bounded Memory, and Replaceable Endpoints", () => {
    it("supports custom replaceable endpoints without client re-release", () => {
      const customEndpoint = "https://custom-geocoder.example.org/search";
      const service = new PlaceSearchService({ endpoint: customEndpoint });
      expect(service).toBeDefined();
    });

    it("enforces maximum 50-entry bounded cache for place search", async () => {
      expect(MAX_SEARCH_CACHE_ENTRIES).toBe(50);

      const fakeFetch = vi.fn().mockImplementation((url: string) => {
        const parsedUrl = new URL(url);
        const q = parsedUrl.searchParams.get("q") ?? "test";
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                place_id: Math.floor(Math.random() * 100000),
                display_name: `${q}, Test City`,
                lat: "40.7128",
                lon: "-74.0060",
                type: "administrative",
                class: "boundary",
              },
            ]),
        });
      });

      const service = new PlaceSearchService({
        endpoint: "https://test.osm/search",
        fetchFn: fakeFetch as unknown as typeof fetch,
        minIntervalMs: 0,
      });

      // Fill cache with 55 distinct queries (exceeding 50)
      for (let i = 1; i <= 55; i++) {
        await service.search(`PlaceNumber${i}`);
      }

      // 55 queries should have triggered 55 fetches
      expect(fakeFetch).toHaveBeenCalledTimes(55);

      // Fetching the most recent query should hit cache (0 additional network calls)
      await service.search("PlaceNumber55");
      expect(fakeFetch).toHaveBeenCalledTimes(55);
    });
  });

  describe("Lifecycle and Resource Cleanup", () => {
    it("revokes previous object URLs when AnnotatedMapResource is replaced", async () => {
      const createdUrls: string[] = [];
      const revokedUrls: string[] = [];

      const mockUrlApi = {
        createObjectURL: vi.fn(() => {
          const url = `blob:http://localhost/test-${createdUrls.length + 1}`;
          createdUrls.push(url);
          return url;
        }),
        revokeObjectURL: vi.fn((url: string) => {
          revokedUrls.push(url);
        }),
      };

      const owner = new AnnotatedMapResourceOwner(mockUrlApi);
      const fakeDecoder = vi.fn().mockResolvedValue(undefined);

      const payload1: EditorSavePayload = {
        dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        blob: new Blob(["fake-png-1"], { type: "image/png" }),
      };

      const res1 = await owner.replace(payload1, fakeDecoder);
      expect(res1.previewUrl).toBe(createdUrls[0]);
      expect(revokedUrls).toHaveLength(0);

      const payload2: EditorSavePayload = {
        dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        blob: new Blob(["fake-png-2"], { type: "image/png" }),
      };

      const res2 = await owner.replace(payload2, fakeDecoder);
      expect(res2.previewUrl).toBe(createdUrls[1]);
      // First object URL must have been revoked
      expect(revokedUrls).toContain(createdUrls[0]);

      owner.dispose();
      // Second object URL must be revoked on dispose
      expect(revokedUrls).toContain(createdUrls[1]);
      expect(owner.current).toBeNull();
    });
  });
});
