# Heistboard QA checklist

## Critical path

- [ ] Start from a clean browser session and complete all five stages without developer tools.
- [ ] Submit a place search, select an unambiguous result, compose the 3D Territory view, lock it, and confirm the same camera framing becomes the raster Map Base.
- [ ] Draw a route, add a shape, add text, save, and confirm the exact Annotated Map appears outside the editor.
- [ ] Edit a second time, cancel once, save again, and confirm prior valid output is not lost unexpectedly.
- [ ] Download the final image and open it independently of the application.

## Output inspection

- [ ] Confirm the downloaded format and expected pixel dimensions.
- [ ] Compare the locked Territory Shot, captured Map Base, editor input, Annotated Map, and final Dossier for framing, scale, pitch, bearing, labels, and missing tiles.
- [ ] Inspect full size for clipped or missing regions, unexpected transparency, color shifts, and readable text.
- [ ] Inspect at a reduced social-feed size for hierarchy and attribution legibility.
- [ ] Confirm interactive-map and downloaded-artifact attribution names OpenFreeMap, OpenMapTiles, and OpenStreetMap as required, and that the digital view links to `openstreetmap.org/copyright`.
- [ ] Confirm preview and download were produced from the same final encoded image.

## Browser and responsive coverage

- [ ] Run the critical path in current Chromium and Firefox.
- [ ] In Chromium and Firefox, verify WebGL support, OpenFreeMap style/tile loading, building extrusions where source data exists, fixed-ratio canvas capture, PNG Blob encoding, and React Image Editor ingestion.
- [ ] Check Safari and a real mobile browser where available; record unavailable coverage honestly.
- [ ] On a mid-range mobile device or honest equivalent, record Territory interaction and capture duration, memory pressure, blank/black captures, WebGL context loss, and orientation changes.
- [ ] At narrow and short viewports, verify editor space and persistent access to save, cancel, retry, and navigation.

## Accessibility

- [ ] Complete non-canvas controls by keyboard with visible focus and meaningful labels.
- [ ] Check headings, landmarks, status announcements, contrast, zoom, and target sizes.
- [ ] Confirm errors include text and recovery actions; confirm reduced-motion behavior and no sound dependency.

## Recovery and privacy

- [ ] Force editor-load, Map-Base-load, provider, invalid-output, and download failures where applicable; retry each.
- [ ] Force geocoder rate-limit/error, map style error, tile timeout, WebGL unavailability/context loss, tainted or blank canvas, and capture timeout; verify retry and sample fallback.
- [ ] Confirm the sample-map path completes when external services fail.
- [ ] Confirm raw place queries, exact coordinates, portraits, data URLs, Blobs, and tokens do not appear in logs, analytics, persistence, or public URLs.
- [ ] Confirm search fires only on explicit submit, never as autocomplete, and app-wide public Nominatim traffic stays at or below one request per second with repeated queries deduplicated.
- [ ] Confirm replaced/restarted object URLs, MapLibre instances, WebGL contexts, temporary capture containers, and large canvas resources are released.

## Pre-submission

- [ ] Run lint, typecheck, tests, and production build from a clean install.
- [ ] Verify public deployment, repository, demo, licenses, credits, attribution, quota, and rollback notes.
- [ ] Recheck links from a signed-out browser and retain submission confirmation.
- [ ] Record known limitations and reserve 24 September for availability checks and critical fixes only.
