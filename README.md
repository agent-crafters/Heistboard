# Heistboard

> **Your neighborhood. Your next fictional mission.**

Heistboard transforms streets you recognize and your chosen Operative Identity into an original cinematic mission file. It brings neighborhood-scale 3D vector maps into **React Image Editor** as a locked authoring surface, allowing operatives to plot getaway routes, mark tactical drop zones, and produce an authentic 2400 × 1600 mission Dossier PNG.

---

## 🎯 The Five-Stage Journey

```
[01. Case File] ──► [02. Territory] ──► [03. Identity] ──► [04. Mission Plan] ──► [05. Dossier]
 Briefing &          Search, Compose     Callsign &          Draw Route &        Cinematic Reveal &
 Premise             & Lock 3D Map       Portrait Filter     React Image Editor  2400×1600 Export
```

1. **Case File Briefing (`01`):** Review the operational directive for *"The Last Delivery"*—a high-stakes courier run before sunrise.
2. **Territory Composition (`02`):** Search any real-world city, neighborhood, or street. Compose your 3D tactical angle using pitch presets (Top-Down, Street, Isometric, Cinematic) and building extrusions powered by OpenFreeMap and OpenStreetMap, then lock the shot into a stable 3:2 raster Map Base.
3. **Operative Field Identity (`03`):** Select an operative callsign, assign an operational role, choose a stylized vector silhouette archetype, or upload a custom portrait with local surveillance and CCTV filters.
4. **Mission Plan Editor (`04`):** Author your route directly onto the locked raster Map Base using React Image Editor. Trace delivery routes with Draw, place pickup and safehouse markers with Shapes, and stamp tactical courier notes with Text.
5. **Cinematic Reveal & Dossier Export (`05`):** Watch the authored map pull back in an authentic ~2s cinematic reveal directly into the final 2400 × 1600 landscape Dossier PNG, complete with fictional-use labels, operative badges, and verified legal attribution.

---

## 🎬 30–60 Second Demo Walkthrough (Understandable When Muted)

The application flow and trailer are designed to be understood with audio muted:

| Timestamp | Screen Action | Visual Overlay / Subtitle |
| :--- | :--- | :--- |
| **00:00 – 00:08** | Case File briefing opens; courier directive displayed. Click *"Start Operation"*. | `OPERATION: THE LAST DELIVERY // EYES ONLY` |
| **00:08 – 00:20** | Type neighborhood into Territory Search; 3D map flies to location with extruded buildings; adjust pitch to 45° Isometric; click *"Lock Territory Shot"*. | `SEARCHING LOCAL THEATRE... 3D CAMERA LOCKED` |
| **00:20 – 00:30** | Configure Operative Callsign (`CIPHER`), select *"Infiltrator"* archetype badge, apply Surveillance filter; click *"Confirm Identity"*. | `OPERATIVE CALLSIGN ESTABLISHED` |
| **00:30 – 00:45** | React Image Editor loads locked Map Base; user traces courier route in bold coral; adds rendezvous marker and courier note; clicks *"Save"*. | `AUTHORING TACTICAL ROUTE // REACT IMAGE EDITOR` |
| **00:45 – 00:55** | Smooth ~2s pullback reveal transitions map into full 2400 × 1600 Dossier framing with protected legal attribution; click *"Download Dossier PNG"*. | `DOSSIER LOCKED & VERIFIED // 2400 × 1600 ARTIFACT` |

*A complete storyboard and frame-by-frame demo guide is available in [`docs/demo-presentation.md`](docs/demo-presentation.md).*

---

## 🏛️ Architecture & Key Technologies

- **Core Editor Surface:** React Image Editor (`@unlayer/react-image-editor`) running on client-side Fabric.js canvases.
- **3D Vector Territory Engine:** MapLibre GL JS (`maplibre-gl`) utilizing OpenFreeMap Liberty vector styles and 3D building extrusions.
- **Zero-Cost Geocoding:** OpenStreetMap Nominatim with client-side 1 req/sec application-wide throttling, bounded LRU caching (50 entries), and explicit submit-only execution.
- **Artifact Composition Engine:** Deterministic HTML5 Canvas 2D pipeline rendering the final 2400 × 1600 landscape PNG with protected attribution zones.
- **Responsive & Accessible Design:** Touch-optimized 44px+ tap targets, high-contrast focus rings, keyboard skip links, collapsible mobile briefings, and reduced-motion static transitions.

---

## 🔒 Privacy, Security & Resource Boundaries

- **Zero Data Persistence:** No user accounts, databases, cloud storage, tracking scripts, or cookies. All search queries, coordinates, and portraits exist purely in ephemeral browser memory.
- **Client-Side Image Processing:** Portrait crop, zoom, and surveillance filters operate locally in browser canvas memory. Uploads are strictly bounded to 5MB and 4096×4096 pixels.
- **Aggressive Resource Teardown:** Object URLs are explicitly revoked upon replacement or reset; MapLibre instances and temporary offscreen capture DOM containers are torn down in `finally` handlers.
- **Replaceable Providers:** Geocoder and vector tile endpoints are configured via environment variables and can be swapped without client releases.

---

## 🛠️ Local Development & Setup

### Prerequisites
- Node.js 20.9.0 or later
- pnpm 9+ (or corepack enabled)

### Installation
```bash
# Clone repository
git clone https://github.com/agent-crafters/Heistboard.git
cd Heistboard

# Install dependencies
pnpm install
```

### Running Locally
```bash
# Start Next.js development server
pnpm dev

# Open in browser
http://localhost:3000
```

### Verification & Testing
```bash
# Run complete Vitest suite (89 unit and integration tests)
pnpm test

# Run TypeScript typecheck
pnpm typecheck

# Run ESLint validation (zero warnings enforced)
pnpm lint

# Build production bundle
pnpm build
```

---

## ⚖️ Legal Attribution & Credits

- **Map Data & Cartography:** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Map tiles served via [OpenFreeMap](https://openfreemap.org) and [OpenMapTiles](https://openmaptiles.org).
- **Editor:** [React Image Editor](https://github.com/unlayer/react-image-editor) by Unlayer.
- **Disclaimer:** Heistboard is an original creative application for fictional intelligence and heist scenarios. Stylized 3D building extrusions and maps are approximate artistic models and are not intended for real-world navigation, surveillance, or safety claims. All trademarks, service marks, and company names are the property of their respective owners.

---

## 📋 Release Checklist & QA Status

- ✅ Five-stage mission journey verified across Chromium, Firefox, Safari, and mobile browsers.
- ✅ 89 automated tests passing across 17 test files.
- ✅ Usability testing completed (100% completion rate under 5 minutes).
- ✅ Production build verified with Next.js Turbopack optimization.
- ✅ Comprehensive QA report recorded in [`docs/browser-and-export-qa-report.md`](docs/browser-and-export-qa-report.md).
