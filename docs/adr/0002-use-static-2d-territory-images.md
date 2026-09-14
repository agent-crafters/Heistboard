# Use static 2D Territory images

- **Status:** Superseded by [ADR-0006](./0006-use-maplibre-3d-territory-preview-and-rasterize-selected-view.md)
- **Date:** 2026-09-13

## Context

React Image Editor authors raster-oriented images, while interactive maps and 3D captures introduce state, attribution, browser, and export complexity that does not improve the short Mission Plan interaction.

## Decision

Confirm Territory first, then load a stable-aspect static 2D Map Base into the editor. HB-001 uses an original repository-owned fictional map. Provider-produced static images are deferred until contract verification.

## Alternatives considered

- Capture an interactive map DOM: nondeterministic and attribution-sensitive.
- Use an interactive 3D map during authoring: high implementation and mobile-performance cost.
- Build vector-map editing: duplicates editor capability and exceeds P0.

## Consequences

Territory navigation happens before editing. Changing Territory resets the Mission Plan after an explicit warning. Static inputs make editor behavior and later composition easier to verify.

## Risks

A static view may show the wrong scale or omit useful context. Search confirmation must offer two useful area scales later.

## Reversal trigger

Revisit only if a required provider cannot supply legally editable static images or user testing shows static scale selection blocks mission authoring.

## Supersession note

ADR-0006 preserves the stable raster handoff into React Image Editor, but replaces provider-supplied static imagery and two preset scales with a user-composed MapLibre view that is rasterized only after the camera is locked.
