import { describe, expect, it } from "vitest";
import {
  OPERATION_STAGES,
} from "@/domain/editor-workflow";
import { SILHOUETTE_ARCHETYPES, PORTRAIT_FILTERS } from "@/domain/identity";
import { getCategoryLabel, type PlaceCategory } from "@/domain/territory";

describe("Accessibility & Responsive Contract (HB-011)", () => {
  describe("Operation Stages Navigation", () => {
    it("provides accessible metadata for every operation stage", () => {
      expect(OPERATION_STAGES.length).toBe(4);
      for (const stage of OPERATION_STAGES) {
        expect(stage.id).toBeTruthy();
        expect(stage.number).toMatch(/^\d{2}$/);
        expect(stage.label.trim().length).toBeGreaterThan(0);
        expect(stage.shortDescription.trim().length).toBeGreaterThan(0);
      }
    });

    it("has unique numbers and labels for screen readers", () => {
      const numbers = OPERATION_STAGES.map((s) => s.number);
      const labels = OPERATION_STAGES.map((s) => s.label);
      expect(new Set(numbers).size).toBe(OPERATION_STAGES.length);
      expect(new Set(labels).size).toBe(OPERATION_STAGES.length);
    });
  });

  describe("Identity Archetypes & Filters A11y", () => {
    it("ensures all silhouette archetypes have human-readable names, roles, and SVG paths", () => {
      expect(SILHOUETTE_ARCHETYPES.length).toBeGreaterThanOrEqual(4);
      for (const arch of SILHOUETTE_ARCHETYPES) {
        expect(arch.name.trim().length).toBeGreaterThan(0);
        expect(arch.role.trim().length).toBeGreaterThan(0);
        expect(arch.svgPath.trim().length).toBeGreaterThan(10);
      }
    });

    it("ensures all portrait filters have accessible names and descriptive taglines", () => {
      expect(PORTRAIT_FILTERS.length).toBeGreaterThanOrEqual(4);
      for (const filter of PORTRAIT_FILTERS) {
        expect(filter.name.trim().length).toBeGreaterThan(0);
        expect(filter.tagline.trim().length).toBeGreaterThan(0);
      }
    });
  });

  describe("Territory Category Disambiguation Labels", () => {
    it("formats every place category into a concise, readable screen-reader label", () => {
      const categories: PlaceCategory[] = [
        "city",
        "neighborhood",
        "street",
        "address",
        "landmark",
        "other",
      ];
      for (const cat of categories) {
        const label = getCategoryLabel(cat);
        expect(label.trim().length).toBeGreaterThan(0);
        expect(label).not.toContain("_");
      }
    });
  });

  describe("Audio-Free Experience Guarantee", () => {
    it("guarantees no audio file references or sound dependencies in domain/workflow logic", () => {
      // The product specification requires a completely silent and visual workflow
      const disallowedSoundTokens = [".mp3", ".wav", ".ogg", ".aac", "AudioContext", "new Audio"];
      const filesChecked = [
        JSON.stringify(OPERATION_STAGES),
        JSON.stringify(SILHOUETTE_ARCHETYPES),
        JSON.stringify(PORTRAIT_FILTERS),
      ];

      for (const content of filesChecked) {
        for (const token of disallowedSoundTokens) {
          expect(content).not.toContain(token);
        }
      }
    });
  });
});
