# Compose the Dossier in Browser Canvas

- **Status:** Accepted
- **Date:** 2026-09-13

## Context

The final artifact needs deterministic 2400 × 1600 output whose preview and download are identical. DOM screenshots vary with viewport, font timing, browser layout, and hidden UI.

## Decision

Compose the fixed Dossier in Browser Canvas 2D after fonts and image inputs decode. Encode one PNG and use that exact image resource for both preview and download. Keep required attribution in a protected, legible region.

## Alternatives considered

- Screenshot the DOM: convenient but nondeterministic and prone to clipping.
- Server-side composition: adds storage, privacy, operations, and credential complexity.
- Let users freely arrange the Dossier: expands the interaction beyond the deadline.

## Consequences

Composition coordinates, typography, image-fit rules, and attribution placement become testable inputs. Large canvases and object URLs require explicit lifecycle cleanup.

## Risks

Font loading, browser memory, cross-origin image tainting, and PNG encoding can fail. Provider inputs must be compatible with client-side canvas export.

## Reversal trigger

Revisit if supported target browsers cannot reliably allocate and encode the specified canvas or provider terms prevent client-side composition.
