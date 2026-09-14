# Heistboard architecture

## Shape

Heistboard is a client-led Next.js App Router application. Keep deep modules small at their interfaces:

- **Workflow module:** a typed reducer owns stage and recovery transitions; form data stays serializable.
- **Mission editor module:** owns the React Image Editor lifecycle behind `onSave`, `onCancel`, and recovery behavior. Tool configuration is fixed before mount.
- **Image resource module:** validates saved output, converts data URLs when needed, creates download resources, and releases object URLs.
- **Dossier composition module (later):** accepts loaded, decoded inputs and renders one deterministic 2400 × 1600 Canvas 2D image.
- **Place-search module (later):** accepts an explicit user query through a replaceable geocoder port and returns bounded, disambiguated candidates. Provider policy and rate limiting stay behind the adapter.
- **Territory-view module (later):** owns one interactive MapLibre instance, the selected candidate, and a serializable `TerritoryCameraState` containing center, zoom, pitch, and bearing.
- **Territory-capture module (later):** accepts a locked camera state plus provider/style configuration and returns one decoded, fixed-ratio raster `MapBaseResource` with attribution metadata.
- **Territory provider adapters (later):** supply geocoding, map style/vector resources, and an owned sample fallback without leaking provider-specific response shapes into workflow state.

The place-search, map-resource, and capture interfaces are separate seams because they fail, change, and carry policy independently. Provider and sample adapters make those seams real; React Image Editor remains a concrete dependency inside the mission editor module.

## Territory acquisition and raster handoff

The proposed P0 pipeline is:

1. A user explicitly submits a place query. The search adapter returns a small candidate list with a display label, longitude/latitude, result identifier, and provider attribution. There is no public-geocoder autocomplete.
2. Selecting a candidate moves the interactive MapLibre camera to a neighborhood-scale view. The user pans, zooms, pitches, and rotates a stylized vector map with approximate building extrusions.
3. `LOCK TERRITORY` records the current `TerritoryCameraState`. This value is serializable workflow data; the MapLibre instance, canvas, tile responses, and search response are not.
4. A dedicated, non-interactive capture renderer recreates the locked camera at the editor's fixed Map Base aspect ratio. It waits for the style and all visible tiles to settle, then encodes the renderer canvas to a PNG `Blob`.
5. The image resource module decodes and validates that exact Blob, owns its object URL, and passes it to React Image Editor as the stable Map Base.
6. MapLibre is removed before Mission Plan authoring. The editor never contains a live map. Saving produces the Annotated Map through the existing editor interface.
7. Final Canvas 2D composition uses that exact Annotated Map and renders a protected, legible attribution line supplied by the accepted map adapter.

The interactive renderer keeps MapLibre's default `preserveDrawingBuffer: false`. The short-lived capture renderer may use `canvasContextAttributes.preserveDrawingBuffer: true` and antialiasing solely for the locked export. This limits the performance cost and keeps capture behavior isolated. HB-003 must prove that provider resources are canvas-safe in supported browsers before this proposal becomes accepted.

The initial candidates are public Nominatim for search, MapLibre GL JS for browser rendering, and OpenFreeMap styles/vector tiles backed by OpenStreetMap data. They are configuration behind interfaces, not permanent domain concepts. Public Nominatim requests must be end-user-triggered, globally throttled to at most one request per second, deduplicated in memory, identifiable by HTTP Referer or an allowed application identifier, and switchable to another endpoint without a software release. OpenFreeMap has no SLA, so retry and owned fallback are normal product states.

The map's 3D effect is a styled extrusion of available building attributes. Missing or approximate heights are expected and must never be described as photorealistic, current, complete, survey-accurate, or suitable for navigation.

Attribution is data carried through the whole pipeline, not pixels scraped from the interactive control. The interactive map displays provider-supplied attribution, and the editor shell keeps the same credit visible beside its Map Base. The final Dossier and downloaded PNG reserve a readable line for `OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap · openstreetmap.org/copyright` if the proposed adapter is accepted. Links remain available adjacent to digital previews and in project credits; the printed URL remains in the raster artifact.

## HB-001 data flow

1. The browser loads the owned Map Base from `/maps/sample-territory.svg` and verifies it can decode.
2. A client-only mission editor mounts once with the fixed draw, shapes, and text configuration.
3. Save returns the editor's flattened image payload. The app validates that payload and stores the exact Annotated Map outside serializable reducer state.
4. Preview renders that same saved image. Download uses the same payload and a deterministic filename.
5. Edit again reuses the saved Annotated Map as input when supported without changing tool configuration.

Cancel leaves the last valid Annotated Map intact. Editor-load and Map-Base-load failures enter visible retry states; retry remounts only when recovery requires it.

## Editor lifecycle

`@unlayer/react-image-editor` is browser-only and loaded through a client boundary with SSR disabled. Initialization configuration is stable before mount so React re-renders do not erase work. The package's supported save callback defines the flattened-output interface; Heistboard does not promise layer serialization, editable restoration, or custom stickers until installed APIs prove them.

HB-001 resolved version `1.0.2`. Its peer contract accepts React 18 or newer; the save callback provides both a PNG-capable `Blob` and data URL, image changes use a serialized reset, and feature changes force a remount. The wrapper exposes separate `onError` and `onLoadError` channels, which map to distinct recovery copy. The editor loads its embed at runtime, so offline and CDN behavior remain an explicitly tested availability risk rather than a local-processing claim.

## Image and Blob lifecycle

Image data and `Blob` objects stay out of reducer/form state. A resource owner creates an object URL only when a Blob is required, installs it only after decode succeeds, then revokes the previous URL. It revokes the current URL on teardown or restart. Data URLs are never logged. Decode completion is required before an image becomes previewable or composable.

## Final composition pipeline

HB-007 will wait for fonts and all image inputs, render fixed coordinates into an offscreen Canvas 2D surface, retain a protected attribution region supplied by the Territory adapter, and encode one PNG. The preview and download will reference the same encoded final image; DOM screenshots are excluded.

## Failure states

- **Editor unavailable:** explain the failure and provide retry without discarding a valid save.
- **Map Base unavailable:** offer retry and retain an owned sample path.
- **Invalid editor output:** keep editing available and explain that save did not complete.
- **Download unavailable:** keep preview visible and allow retry.
- **Search unavailable or rate-limited (later):** explain the failure, preserve a valid selection, allow a deliberate retry, and offer the sample path.
- **Map style, tile, WebGL, or capture failure (later):** tear down the failed renderer, preserve recoverable camera state, and offer retry or the owned sample Map Base.
- **Blank, tainted, incomplete, or undecodable capture (later):** do not enter the editor; discard the invalid resource and offer retry or sample recovery.

## Deployment assumptions

The P0 app requires no persistent backend. Client assets are same-origin, and public provider configuration must work on the chosen HTTPS host without exposing server secrets. A lightweight same-origin search proxy is permitted only if HB-003 proves it is required for policy-compliant identification, shared throttling, caching, or endpoint replacement; it must not log or persist raw queries or coordinates. Hosting selection and smoke deployment belong to HB-002; map contract and capture verification belong to HB-003.
