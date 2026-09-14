# Isolate map provider and owned fallback

- **Status:** Accepted; provider selection resolved by [ADR-0006](./0006-use-maplibre-3d-territory-preview-and-rasterize-selected-view.md)
- **Date:** 2026-09-13

## Context

Heistboard needs place search and stylized neighborhood imagery, but geocoding, vector-resource, attribution, capture, download, and public-sharing rules vary independently. External availability must not block the experience.

## Decision

Use separate replaceable seams for place search, map resources, and raster capture. Keep provider response shapes outside workflow state and keep an original fictional sample-map adapter as the owned fallback. ADR-0006 records the initial provider candidates and the proposed capture architecture; no external provider reaches the P0 path until HB-003 proves that decision.

## Alternatives considered

- Couple UI directly to one commercial provider: faster initially but spreads contract, cost, token, and failure behavior.
- Use public map tiles without verification: unacceptable licensing and export risk.
- Use only fictional maps: reliable, but weakens the familiar-neighborhood fantasy.

## Consequences

HB-001 proves editing with owned imagery. HB-003 must prove the proposed geocoder, renderer, map-resource, and raster-capture contracts before Territory implementation, and attribution remains structured data through final composition.

## Risks

Terms may prohibit or constrain transformed downloads, caching, or token use. Cross-origin behavior may taint Canvas 2D output, and quota failures may occur in production.

## Reversal trigger

Revisit the seam only if a single accepted provider contract reliably owns search, rendering, raster output, attribution, privacy, fallback, and replacement behavior without coupling the workflow to that provider.
