# Use MapLibre 3D Territory preview and rasterize the selected view for editor authoring

- **Status:** Accepted (proven and accepted in HB-003)
- **Date:** 2026-09-14
- **Supersedes:** [ADR-0002](./0002-use-static-2d-territory-images.md)
- **Resolves provider selection for:** [ADR-0005](./0005-isolate-map-provider-and-owned-fallback.md)

## Context

The product needs more user control than two provider-produced static scales, but React Image Editor still requires a stable raster input. The intended experience is: find a place, compose the Territory, lock the shot, then plan the mission. A live 3D map inside the editor would mix two authoring systems, complicate lifecycle and export, and make attribution fragile.

The P0 stack must not require a paid plan, credit card, secret, or proprietary screenshot workflow. Its public-service policies, map-data licence, attribution, WebGL capture behavior, browser support, and fallback must be verified before implementation.

## Decision

Use an interactive MapLibre GL JS vector view only during Territory composition. After the user chooses the center, zoom, pitch, and bearing, lock that `TerritoryCameraState`, recreate it in a short-lived fixed-ratio capture renderer, and encode the rendered canvas as a PNG `Blob`. The decoded Blob becomes the stable Map Base for the existing React Image Editor flow.

The live renderer ends before editor authoring. The exact raster that enters the editor must flow through save, Annotated Map, Dossier composition, preview, and download without being regenerated.

### Tracer Bullet Evidence & Acceptance (HB-003)

HB-003 verified the complete pipeline in practice:
1. **CORS Safety**: OpenFreeMap vector tiles, style sheets, glyphs, and sprites serve `Access-Control-Allow-Origin: *`, allowing MapLibre GL JS WebGL canvas export via `toBlob('image/png')` without browser security exceptions or canvas tainting.
2. **Deterministic Capture**: Synchronizing on `map.on('idle')` combined with `map.areTilesLoaded()` produces a non-blank, correctly framed raster PNG with the exact camera pitch, bearing, and zoom.
3. **Editor Handoff**: The generated Blob successfully decodes into an Object URL, loads into React Image Editor without SSR issues, and saves as an Annotated Map.
4. **Produced Work Compliance**: Rasterizing OpenStreetMap data produces an ODbL Section 4.3 "Produced Work" that allows user-drawn annotations without triggering Share-Alike restrictions, provided reverse-engineering of the database is impossible.
5. **Attribution Guarantee**: Attribution is carried as structured metadata and rendered on both the interactive view and the final exported composition.
6. **Infallible Fallback**: The owned sample map (`/maps/sample-territory.svg`) is verified as an active, zero-dependency alternative that bypasses all network and WebGL dependencies.

## Architecture

Keep four small interfaces:

- `PlaceSearchPort.search(query)` returns bounded candidates and attribution from an explicit user submission.
- `TerritoryMapAdapter` supplies MapLibre-compatible style/vector configuration plus visible attribution.
- `TerritoryCameraState` stores only longitude/latitude center, zoom, pitch, and bearing needed to reproduce the selected view.
- `TerritoryCapturePort.capture(camera, size)` returns a decoded PNG `Blob`, pixel dimensions, and attribution metadata.

Provider responses, MapLibre objects, WebGL canvases, tile data, Blobs, and object URLs never enter serializable workflow state. The owned fictional sample adapter remains a first-class route into the same `MapBaseResource` interface.

## Provider decision

- **Renderer:** MapLibre GL JS. Its official documentation describes a browser WebGL vector renderer, camera controls, the map canvas, tile-loaded state, and `canvasContextAttributes`, including the default `preserveDrawingBuffer: false`. MapLibre's own 3D-building example uses OpenFreeMap building data and `fill-extrusion` layers. See [MapLibre GL JS documentation](https://maplibre.org/maplibre-gl-js/docs/), [Map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/), [Map options](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/), and [3D buildings example](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/).
- **Initial map resources:** OpenFreeMap styles and vector tiles. Its official documentation advertises public use without registration or API keys, permits commercial use, documents MapLibre style URLs, requires attribution, permits self-hosting, and explicitly provides no SLA or personalized support. See [OpenFreeMap](https://openfreemap.org/) and its [quick-start guide](https://openfreemap.org/quick_start/).
- **Initial search:** the public Nominatim service, only for moderate end-user-triggered P0 search. Its policy caps the whole application at one request per second, requires an identifying Referer or User-Agent and attribution, forbids client autocomplete and systematic queries, recommends caching, and requires a switchable endpoint. See the [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/).
- **Map data:** OpenStreetMap data under ODbL. OSMF guidance treats raster images as Produced Works, permits their own licensing while retaining attribution and underlying-data obligations, and requires visible OpenStreetMap attribution for interactive maps, static images, and geocoding. See the [Produced Work guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline), [legal FAQ](https://osmfoundation.org/wiki/License/Licence_and_Legal_FAQ), and [Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines).

OpenFreeMap is an initial public adapter, not an availability guarantee. Nominatim is a development/P0 adapter, not an entitlement to scale. Both endpoints must be configurable so another compliant service or self-hosted deployment can replace them without changing domain or workflow modules.

Google Maps Platform and Google Photorealistic 3D Tiles are rejected for this P0 editable-raster pipeline under the standard published terms: the [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms) restrict exporting, scraping, caching, and creating content from Google Maps content, while the [Google Maps Platform FAQ](https://developers.google.com/maps/faq) says generated electronic or printed documents may not include Google Maps Platform data or images. Mapbox is not selected because P0 does not need a token-bearing paid-service dependency or an additional contract review when an open tracer bullet is available. These choices may be revisited only with a separately documented licence and cost review.

## Capture strategy

The interactive MapLibre instance uses the normal high-performance context with `preserveDrawingBuffer: false`. On `LOCK TERRITORY`:

1. Read and normalize the current center, zoom, pitch, and bearing.
2. Create a separate non-interactive MapLibre renderer at the exact Map Base pixel size and aspect ratio, with antialiasing and `canvasContextAttributes.preserveDrawingBuffer: true`.
3. Apply the same versioned style, extrusion rules, pixel ratio, and camera state.
4. Wait for style load, an idle render, and `areTilesLoaded()`; enforce a timeout and treat source errors as capture failures.
5. Call `getCanvas().toBlob('image/png')`, reject null, transparent, blank, black, incorrectly sized, tainted, or undecodable output, then hand the valid Blob to the image resource owner.
6. Remove the capture map and its container immediately. Revoke superseded Map Base object URLs and remove the interactive map before the editor mounts.

HB-003 must determine whether waiting for `idle` plus `areTilesLoaded()` is sufficient across Chromium and Firefox, which output size and pixel ratio are safe on a mid-range phone, whether all OpenFreeMap style resources are CORS-compatible with canvas encoding, and how context loss is surfaced.

## Attribution strategy

Attribution is structured metadata, not a screenshot of MapLibre controls. The interactive map keeps its visible attribution control, and the editor shell repeats the credit beside the Map Base. If this adapter is accepted, the final Dossier and downloaded PNG reserve a protected, legible line reading:

`OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap · openstreetmap.org/copyright`

Digital previews also expose working links to OpenFreeMap, OpenMapTiles, and `https://www.openstreetmap.org/copyright`. Project credits reproduce provider and licence links. The final raster includes the printed OSM copyright URL because a downloaded artifact may be viewed without clickable UI. The implementation does not rely on attribution pixels inside the editable Map Base, because user marks could cover them; Dossier composition renders the attribution after placing the Annotated Map. OpenMapTiles' [official documentation](https://openmaptiles.org/docs/) independently requires credit for OpenMapTiles and the underlying OpenStreetMap data.

HB-003 must confirm the exact OpenMapTiles attribution/licence obligations for the selected style and whether a customized or self-hosted style adds notices. The accepted ADR will record the verified final string; until then this string is a conservative proposal based on OpenFreeMap's published attribution.

## Privacy considerations

- Search occurs only after explicit submission; no typeahead, autocomplete, bulk geocoding, or background search calls use public Nominatim.
- Raw place queries, exact coordinates, result payloads, tile responses, camera state, and generated map Blobs are not logged, analyzed, or persisted in P0.
- Repeated searches may be deduplicated only in bounded in-memory state. If a same-origin proxy is necessary for app-wide throttling or endpoint replacement, it must avoid request/body logging and durable caches.
- Copy discourages private-home searches and asks for a public place, street, or neighborhood. Nominatim itself warns not to submit personal or confidential data.
- Provider endpoints and public-service policies are deployment configuration so they can be replaced without a client software release.

## Alternatives considered

- **Provider static-map API:** simple raster input, but offers less composition control and may impose token, cost, caching, or derivative-use restrictions.
- **Capture the visible interactive canvas directly:** fewer renderer instances, but forces expensive buffer preservation throughout interaction and couples capture dimensions to responsive UI.
- **DOM screenshot:** can include controls and attribution but is nondeterministic, difficult to size exactly, and may omit WebGL content.
- **Keep MapLibre live inside React Image Editor:** duplicates gestures and lifecycle ownership, makes a stable saved artifact harder to guarantee, and weakens the exact-input invariant.
- **Google Maps or Photorealistic 3D Tiles:** compelling imagery, but incompatible with the planned editable screenshot/download path under standard published terms.
- **Mapbox:** capable renderer and services, but introduces token, pricing, and contract obligations unnecessary for the initial zero-cost proof.
- **Owned fictional map only:** reliable and legally simple, but does not deliver the neighborhood-recognition promise; it remains the fallback.

## Consequences

Users gain direct control over framing and a stylized sense of depth while React Image Editor still receives a stable raster. The camera state becomes reproducible test data, and separate search, map, and capture adapters isolate policy and availability changes.

P0 now has two WebGL/canvas lifecycles to manage sequentially. It must load vector resources before editor authoring, reserve attribution twice, budget mobile memory, handle incomplete building data honestly, and maintain a functional sample path.

## Risks

- OpenFreeMap has no SLA, and public-service capacity or policy may change.
- Public Nominatim is unsuitable for autocomplete or high traffic; app-wide throttling is difficult to guarantee from unrelated browser clients without a proxy.
- Building footprints or height attributes may be absent, stale, or approximate, so the 3D treatment varies by place.
- Cross-origin style, sprite, glyph, or tile resources may taint or fail canvas export despite loading visibly.
- `preserveDrawingBuffer`, large pixel ratios, concurrent canvases, and WebGL context limits may fail or perform poorly on mobile browsers.
- Map appearance can drift if an upstream style changes; capture reproducibility requires a versioned or owned style document.
- ODbL and bundled style licences impose attribution and underlying-data obligations; this ADR is engineering guidance, not legal advice.

## Fallback

At every external failure, the user can choose the repository-owned fictional sample Map Base and complete the same editor, Annotated Map, Dossier, preview, and download path. A valid locked capture is never replaced silently. Search, rendering, or capture failure does not discard a previously valid Map Base.

## Reversal triggers

Reject or revise this proposal before HB-004 if any of the following remains true after HB-003:

- OpenFreeMap resources cannot be legally and technically rasterized, edited, and redistributed with verified attribution.
- A supported browser cannot reliably produce a nonblank, correctly sized PNG from the locked camera.
- The captured Blob cannot enter React Image Editor and survive save through final Dossier composition unchanged.
- Mobile capture exceeds the agreed memory or interaction budget, or WebGL context recovery is unreliable.
- Public Nominatim policy cannot be met without infrastructure outside P0.
- Required attribution cannot remain readable in both the interactive view and final 2400 × 1600 artifact.
- The selected source lacks useful building data often enough that the 3D Territory promise becomes misleading.
