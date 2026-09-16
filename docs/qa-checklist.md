# Heistboard QA checklist

## Critical path

- [x] Start from a clean browser session and complete all five stages without developer tools.
- [x] Submit a place search, select an unambiguous result, compose the 3D Territory view, lock it, and confirm the same camera framing becomes the raster Map Base.
- [x] Draw a route, add a shape, add text, save, and confirm the exact Annotated Map appears outside the editor.
- [x] Edit a second time, cancel once, save again, and confirm prior valid output is not lost unexpectedly.
- [x] Download the final image and open it independently of the application.

## Output inspection

- [x] Confirm the downloaded format and expected pixel dimensions.
- [x] Compare the locked Territory Shot, captured Map Base, editor input, Annotated Map, and final Dossier for framing, scale, pitch, bearing, labels, and missing tiles.
- [x] Inspect full size for clipped or missing regions, unexpected transparency, color shifts, and readable text.
- [x] Inspect at a reduced social-feed size for hierarchy and attribution legibility.
- [x] Confirm interactive-map and downloaded-artifact attribution names OpenFreeMap, OpenMapTiles, and OpenStreetMap as required, and that the digital view links to `openstreetmap.org/copyright`.
- [x] Confirm preview and download were produced from the same final encoded image.

## Browser and responsive coverage

- [x] Run the critical path in current Chromium and Firefox.
- [x] In Chromium and Firefox, verify WebGL support, OpenFreeMap style/tile loading, building extrusions where source data exists, fixed-ratio canvas capture, PNG Blob encoding, and React Image Editor ingestion.
- [x] Check Safari and a real mobile browser where available; record unavailable coverage honestly.
- [x] On a mid-range mobile device or honest equivalent, record Territory interaction and capture duration, memory pressure, blank/black captures, WebGL context loss, and orientation changes.
- [x] At narrow and short viewports, verify editor space and persistent access to save, cancel, retry, and navigation.

## Accessibility

- [x] Complete non-canvas controls by keyboard with visible focus and meaningful labels.
- [x] Check headings, landmarks, status announcements, contrast, zoom, and target sizes.
- [x] Confirm errors include text and recovery actions; confirm reduced-motion behavior and no sound dependency.

## Recovery and privacy

- [x] Force editor-load, Map-Base-load, provider, invalid-output, and download failures where applicable; retry each.
- [x] Force geocoder rate-limit/error, map style error, tile timeout, WebGL unavailability/context loss, tainted or blank canvas, and capture timeout; verify retry and sample fallback.
- [x] Confirm the sample-map path completes when external services fail.
- [x] Confirm raw place queries, exact coordinates, portraits, data URLs, Blobs, and tokens do not appear in logs, analytics, persistence, or public URLs.
- [x] Confirm search fires only on explicit submit, never as autocomplete, and app-wide public Nominatim traffic stays at or below one request per second with repeated queries deduplicated.
- [x] Confirm replaced/restarted object URLs, MapLibre instances, WebGL contexts, temporary capture containers, and large canvas resources are released.

## Pre-submission

- [ ] Run lint, typecheck, tests, and production build from a clean install.
- [ ] Verify public deployment, repository, demo, licenses, credits, attribution, quota, and rollback notes.
- [ ] Recheck links from a signed-out browser and retain submission confirmation.
- [ ] Record known limitations and reserve 24 September for availability checks and critical fixes only.
