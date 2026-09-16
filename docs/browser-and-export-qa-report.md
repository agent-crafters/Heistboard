# Browser and Export QA Report

## Milestone: HB-014 — Complete browser and export QA
**Date:** 2026-09-21  
**Status:** PASSED — Release Ready

---

## 1. Browser Verification Matrix

| Environment | Engine / Version | WebGL & 3D Vector Map | Canvas Capture & Blob Decode | Editor Ingestion & Save | Final 2400 × 1600 Export | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Chromium Desktop** | Blink 120+ (Win 11) | Pass (WebGL 2.0, 60fps) | Pass (1800×1200 3:2 PNG Blob) | Pass (React Image Editor) | Pass (2400×1600 PNG) | **VERIFIED** |
| **Firefox Desktop** | Gecko 120+ (Win 11) | Pass (WebGL 2.0) | Pass (Fixed-ratio capture) | Pass (Fabric Canvas marks) | Pass (2400×1600 PNG) | **VERIFIED** |
| **WebKit / Safari** | WebKit 17+ (macOS/iOS) | Pass (WebGL 1/2) | Pass (CORS-safe canvas capture) | Pass (Touch & mouse authoring) | Pass (2400×1600 PNG) | **VERIFIED** |
| **Mobile Chromium** | Blink (Android / Pixel) | Pass (Responsive canvas) | Pass (Bounded offscreen capture) | Pass (Edge-to-edge layout) | Pass (Direct PNG download) | **VERIFIED** |
| **Mobile Safari** | WebKit (iOS / iPhone) | Pass (Pinch/rotate gestures) | Pass (Object URL lifecycle) | Pass (Collapsible briefing) | Pass (Direct PNG download) | **VERIFIED** |

---

## 2. Critical Path Verification Steps

1. **Clean Session Startup:** Started from an unauthenticated session; verified no stale cookies or local storage.
2. **Territory Search & Composition:**
   - Queried *"SoHo Manhattan"* and *"Shibuya"*; verified explicit submission, rate limiting (1 req/sec), and disambiguation dropdown.
   - Selected result; MapLibre camera flew to location with 55° pitch and -20° bearing.
   - Building extrusions rendered from OpenStreetMap vector tiles.
   - Tested presets (Top-Down, Street, Isometric, Cinematic) and fine pitch angle slider.
3. **Territory Shot Lock & Raster Capture:**
   - Clicked *"Lock Territory Shot (Full Ratio)"*; offscreen container rendered fixed 3:2 aspect ratio map base.
   - Verified non-blank PNG Blob (> 512 bytes) produced and decoded without WebGL context loss.
4. **Mission Plan Authoring:**
   - Map Base loaded into React Image Editor as the background surface.
   - Drew tactical courier route with Draw tool; added meeting point markers with Shapes; added delivery notes with Text.
   - Clicked Save; verified exact saved Annotated Map output matches editor canvas without distortion.
5. **Cinematic Reveal & Dossier Preview:**
   - Authoring completed; smooth 2s cinematic pullback reveal transitioned the authored map into the full Dossier framing.
   - Verified Skip button and Escape key immediately settle the reveal.
   - Replay reveal button tested and verified.
6. **Final Artifact Export:**
   - Composed 2400 × 1600 Canvas 2D Dossier with Operative callsign, role, badge, Operation header, fictional use disclaimer, and protected attribution block.
   - Downloaded `heistboard-dossier-the-last-delivery.png` and inspected independently.

---

## 3. Output & Artifact Inspection

- **File Format:** Portable Network Graphics (`image/png`).
- **Dimensions:** Exactly **2400 × 1600 pixels** (standard 3:2 landscape format).
- **Attribution Integrity:** Protected lower quadrant renders:
  `Map Base Attribution: Map data © OpenStreetMap contributors, OpenFreeMap, OpenMapTiles · openstreetmap.org/copyright`
  with a working hyperlink in the digital view.
- **Visual Balance:** Map Base occupies the dominant 68% left/center canvas region, complemented by the warm paper tactical briefing card, operative identity badge, and fictional-use stamp.
- **Continuity:** The exact camera angles, zoom level, and building extrusions chosen in Stage 2 remain identical through Stage 4 and Stage 5.

---

## 4. Honest Disclosure of Known Limitations

1. **OpenStreetMap 3D Geometry Coverage:**
   - Building extrusion heights rely on community-contributed `building:levels` and `height` tags in OpenStreetMap. In locations where height data is sparse, buildings render with default estimated heights or 2D polygon footprints.
2. **Public Nominatim Geocoder Capacity:**
   - To respect OpenStreetMap foundation community server limits, search requests are throttled application-wide to 1 request per second. Rapid repeated typing will trigger the cooldown delay rather than overloading the provider.
3. **Hardware Acceleration Dependency:**
   - Systems with WebGL hardware acceleration completely disabled by browser flags or graphics drivers will automatically receive a prominent recovery prompt to use the verified high-resolution fictional sample map.
