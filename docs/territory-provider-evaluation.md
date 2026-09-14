# Territory Provider Evaluation & Primary Documentation

This document records the primary policies, legal obligations, and technical API contracts for the zero-cost Territory provider stack proven in **HB-003**.

---

## 1. Nominatim (Place Search)

- **Source**: [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/)
- **Service Type**: Public OpenStreetMap geocoding service.
- **Application Policies**:
  - **Rate Limit**: Maximum **1 request per second** strictly enforced across the application.
  - **Interaction Mode**: Explicit submission only. Real-time autocomplete, typeahead, or systematic bulk queries against the public endpoint are strictly forbidden.
  - **Identification**: Requests must identify the application via an HTTP `User-Agent` or `Referer` header or identifiable parameters.
  - **Caching**: Applications must cache search results locally where possible to minimize duplicate requests.
  - **Replaceable Endpoint**: The public service is provided for light testing and personal use with no SLA. The codebase must make the geocoder endpoint configurable so that self-hosted Nominatim, Photon, or alternative providers can be swapped in without code changes.
  - **Attribution**: Geocoding results derived from OpenStreetMap data require OpenStreetMap attribution.
- **Implementation in Heistboard**:
  - `src/lib/place-search.ts` enforces an in-memory 1-second delay queue between outbound fetches.
  - Repeated identical queries in a session return cached results without contacting the network.
  - Endpoint configured via `NEXT_PUBLIC_NOMINATIM_URL` (defaulting to `https://nominatim.openstreetmap.org/search`).

---

## 2. OpenFreeMap (Vector Tiles & Styles)

- **Source**: [OpenFreeMap Documentation](https://openfreemap.org/) and [Quick Start](https://openfreemap.org/quick_start/)
- **Service Type**: Free, open-source vector tile hosting powered by OpenMapTiles schema and Btrfs/Cloudflare distribution.
- **Key Terms & Conditions**:
  - **Cost**: 100% free; no API keys, accounts, credit cards, or rate limiting tokens required.
  - **Commercial Use**: Permitted without restriction under open licences.
  - **CORS Headers**: Public permissive `Access-Control-Allow-Origin: *` headers are served on style JSON, vector tiles (PBF), glyphs (fonts), and sprites. This allows WebGL rendering and canvas image extraction without CORS tainting.
  - **Styles Provided**:
    - `liberty`: High-detail map style with built-in 3D building layers (`https://tiles.openfreemap.org/styles/liberty`).
    - `bright`: Clean, high-contrast map style.
    - `positron`: Minimal light map style.
  - **SLA**: No formal SLA or uptime guarantee. Applications must handle network errors gracefully and provide local fallbacks.
- **Implementation in Heistboard**:
  - Uses OpenFreeMap's `liberty` style as the primary Territory preview theme.
  - An original fictional SVG map (`/maps/sample-territory.svg`) is retained as an offline/failure fallback.

---

## 3. OpenStreetMap & OpenMapTiles Legal Obligations

- **Sources**:
  - [OpenStreetMap Licence & Legal FAQ](https://osmfoundation.org/wiki/License/Licence_and_Legal_FAQ)
  - [OSMF Produced Work Guideline](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline)
  - [OSMF Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)
  - [OpenMapTiles Documentation & Attribution](https://openmaptiles.org/docs/)

### Produced Work Determination
- Vector tile data from OpenStreetMap is governed by the Open Database License (ODbL 1.0).
- When map data is rasterized into a static image (PNG/JPEG) through MapLibre WebGL rendering, the resulting image constitutes a **"Produced Work"** under ODbL Section 4.3.
- **Key Legal Implication**: A Produced Work does **not** trigger the Share-Alike (copyleft) requirement on user-drawn creative additions (such as routes, marks, mission notes, or portraits authored in React Image Editor). The user's creative annotations remain their own.
- **Reverse-Engineering Constraint**: The Produced Work must not make the underlying database extractable in a machine-readable form. A flattened raster PNG fully satisfies this condition.

### Mandatory Attribution Notice
- Attribution must be prominently visible on both the interactive map and any final exported artifacts:
  - Interactive map: An active attribution widget linking to OSM and providers.
  - Exported Dossier / raster PNG: A permanent, legible line reading:
    ```
    OpenFreeMap · © OpenMapTiles · Data from OpenStreetMap · openstreetmap.org/copyright
    ```
  - Digital previews must provide clickable links to:
    - `https://openfreemap.org/`
    - `https://openmaptiles.org/`
    - `https://www.openstreetmap.org/copyright`

---

## 4. MapLibre GL JS (Client Rendering & Canvas Capture)

- **Source**: [MapLibre GL JS API](https://maplibre.org/maplibre-gl-js/docs/API/)
- **Renderer Architecture**:
  - Client-side WebGL vector map rendering.
  - 3D building extrusions are achieved using `fill-extrusion` layers referencing OpenMapTiles `building` data, styled with `fill-extrusion-height` and `fill-extrusion-base`.
- **Capture Strategy (`preserveDrawingBuffer`)**:
  - Interactive maps default to `preserveDrawingBuffer: false` for maximum performance and GPU buffer clearing.
  - To produce an exact raster snapshot without compromising interactive framerates, capture is performed via a dedicated, short-lived offscreen `maplibregl.Map` instance initialized with `canvasContextAttributes: { preserveDrawingBuffer: true, antialias: true }`.
  - Capture synchronization:
    1. Recreate the exact `TerritoryCameraState` (center, zoom, pitch, bearing).
    2. Wait for `map.on('load')`.
    3. Wait for `map.areTilesLoaded() === true` and the `map.on('idle')` event.
    4. Call `canvas.toBlob('image/png')`.
    5. Verify the blob is non-empty and decodable.
    6. Destroy the capture map instance immediately (`map.remove()`) and unmount its container to free WebGL contexts and GPU memory.
