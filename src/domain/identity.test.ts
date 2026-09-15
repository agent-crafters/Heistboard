import { describe, expect, it } from "vitest";
import {
  DEFAULT_IDENTITY_STATE,
  SILHOUETTE_ARCHETYPES,
  getSilhouetteArchetype,
  validateAlias,
  validatePortraitFile,
} from "./identity";

describe("Identity Domain Model", () => {
  describe("validateAlias", () => {
    it("accepts valid bounded callsigns and aliases", () => {
      expect(validateAlias("CIPHER").valid).toBe(true);
      expect(validateAlias("ECHO-7").valid).toBe(true);
      expect(validateAlias("Agent 47").valid).toBe(true);
      expect(validateAlias("ROOK_NINE").valid).toBe(true);
      expect(validateAlias("X1").valid).toBe(true);
      expect(validateAlias("  CIPHER-99  ").sanitized).toBe("CIPHER-99");
    });

    it("rejects empty or whitespace-only aliases", () => {
      const empty = validateAlias("");
      expect(empty.valid).toBe(false);
      expect(empty.error).toMatch(/required/i);

      const whitespace = validateAlias("   ");
      expect(whitespace.valid).toBe(false);
      expect(whitespace.error).toMatch(/required/i);
    });

    it("rejects aliases shorter than 2 characters", () => {
      const single = validateAlias("A");
      expect(single.valid).toBe(false);
      expect(single.error).toMatch(/at least 2 characters/i);
    });

    it("rejects aliases longer than 32 characters", () => {
      const long = validateAlias("A".repeat(33));
      expect(long.valid).toBe(false);
      expect(long.error).toMatch(/cannot exceed 32 characters/i);
      expect(long.sanitized.length).toBe(32);
    });

    it("rejects special characters not in whitelist", () => {
      const invalid = validateAlias("<script>alert(1)</script>");
      expect(invalid.valid).toBe(false);
      expect(invalid.error).toMatch(/letters, numbers, spaces/i);
    });

    it("rejects punctuation-only aliases with no alphanumeric character", () => {
      const dashes = validateAlias("---");
      expect(dashes.valid).toBe(false);
      expect(dashes.error).toMatch(/at least one letter or number/i);
    });
  });

  describe("validatePortraitFile", () => {
    it("accepts supported image MIME types within size limit", () => {
      const pngFile = new File(["dummy content"], "portrait.png", { type: "image/png" });
      expect(validatePortraitFile(pngFile).valid).toBe(true);

      const jpegFile = new File(["dummy content"], "portrait.jpg", { type: "image/jpeg" });
      expect(validatePortraitFile(jpegFile).valid).toBe(true);

      const webpFile = new File(["dummy content"], "portrait.webp", { type: "image/webp" });
      expect(validatePortraitFile(webpFile).valid).toBe(true);
    });

    it("rejects unsupported MIME types", () => {
      const gifFile = new File(["dummy"], "avatar.gif", { type: "image/gif" });
      const gifResult = validatePortraitFile(gifFile);
      expect(gifResult.valid).toBe(false);
      expect(gifResult.error).toMatch(/unsupported file format/i);

      const svgFile = new File(["<svg></svg>"], "avatar.svg", { type: "image/svg+xml" });
      expect(validatePortraitFile(svgFile).valid).toBe(false);

      const pdfFile = new File(["%PDF"], "doc.pdf", { type: "application/pdf" });
      expect(validatePortraitFile(pdfFile).valid).toBe(false);
    });

    it("rejects files exceeding 5MB size limit", () => {
      // 6MB dummy content
      const largeBlob = new Blob([new Uint8Array(6 * 1024 * 1024)]);
      const largeFile = new File([largeBlob], "huge.png", { type: "image/png" });

      const result = validatePortraitFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/too large/i);
    });
  });

  describe("Silhouette Archetypes", () => {
    it("provides 4 distinct authored silhouettes", () => {
      expect(SILHOUETTE_ARCHETYPES.length).toBe(4);
      const ids = SILHOUETTE_ARCHETYPES.map((s) => s.id);
      expect(ids).toContain("courier");
      expect(ids).toContain("infiltrator");
      expect(ids).toContain("ghost");
      expect(ids).toContain("specialist");
    });

    it("retrieves silhouette by ID with fallback", () => {
      const courier = getSilhouetteArchetype("courier");
      expect(courier.name).toBe("The Courier");

      const ghost = getSilhouetteArchetype("ghost");
      expect(ghost.name).toBe("The Ghost");

      // Fallback for unknown
      const fallback = getSilhouetteArchetype("unknown" as any);
      expect(fallback.id).toBe("courier");
    });

    it("has a valid default identity state", () => {
      expect(DEFAULT_IDENTITY_STATE.alias).toBe("CIPHER");
      expect(DEFAULT_IDENTITY_STATE.portraitSource).toBe("silhouette");
      expect(DEFAULT_IDENTITY_STATE.silhouetteId).toBe("courier");
    });
  });
});
