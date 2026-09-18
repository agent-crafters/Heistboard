# Heistboard

> **Your neighborhood. Your next fictional mission.**

Heistboard transforms streets you recognize and your chosen Operative Identity into an original cinematic mission file. It brings neighborhood-scale 3D vector maps into **React Image Editor** as a locked authoring surface, allowing operatives to plot getaway routes, mark tactical drop zones, and produce an authentic 2400 × 1600 mission Dossier PNG.

---

## 🎮 How to Use

Heistboard guides operatives through a five-stage interactive journey:

```
[01. Case File] ──► [02. Territory] ──► [03. Identity] ──► [04. Mission Plan] ──► [05. Dossier]
 Briefing &          Search, Compose     Callsign &          Draw Route &        Cinematic Reveal &
 Premise             & Lock 3D Map       Portrait Filter     Tactical Marks      2400×1600 Export
```

1. **Case File Briefing (`01`):** Review the operational directive for *"The Last Delivery"*—a high-stakes courier run before sunrise.
2. **Territory Composition (`02`):** Search any real-world city, neighborhood, or street. Compose your tactical angle using 3D pitch presets (Top-Down, Street, Isometric, Cinematic) and building extrusions, then click **Lock Territory Shot** to freeze a stable 3:2 raster Map Base.
3. **Operative Field Identity (`03`):** Select an operative callsign, assign a role, choose a vector silhouette archetype, or upload a custom portrait with local surveillance and CCTV camera filters.
4. **Mission Plan Editor (`04`):** Author your tactical route directly onto the locked raster Map Base using React Image Editor. Trace getaway paths with **Draw**, drop drop-zones and safehouses with **Shapes**, stamp tactical directives with **Text**, and add field stickers.
5. **Cinematic Reveal & Dossier Export (`05`):** Watch the authored map pull back in a seamless cinematic reveal into the final 2400 × 1600 landscape Dossier PNG, complete with fictional-use labels, operative badges, and verified legal attribution.

---

## 💻 Tech Stack

- **Framework & Runtime:** [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), Node.js
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Image Editing:** [`@unlayer/react-image-editor`](https://github.com/unlayer/react-image-editor) (Fabric.js canvas authoring engine)
- **3D Vector Mapping:** [MapLibre GL JS](https://maplibre.org/) (WebGL vector tile rendering & 3D building extrusions)
- **Artifact Composition:** HTML5 Canvas 2D deterministic compositing engine
- **Styling:** Vanilla CSS design system with custom CSS variables and responsive layout tokens (`src/app/tailwind.css`)
- **Testing & Quality:** [Vitest](https://vitest.dev/), [ESLint](https://eslint.org/)

---

## 🌐 What It Uses

- **3D Vector Tiles & Cartography:** [OpenFreeMap](https://openfreemap.org/) and [OpenMapTiles](https://openmaptiles.org/) providing open vector map tiles with 3D building geometry.
- **Geocoding & Place Search:** [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/) featuring client-side rate throttling (1 req/sec) and in-memory LRU caching.
- **Annotation & Canvas Engine:** React Image Editor by Unlayer for client-side drawing, brush strokes, text stamps, geometric shapes, and image transformation.
- **Fallback Assets:** Built-in offline sample maps and vector archetypes ensuring zero-blocker usability when offline or upon third-party service interruptions.

---

## 🛠️ How to Build & Run

### Prerequisites

- **Node.js:** `>= 20.9.0`
- **Package Manager:** `pnpm` (v9+ or corepack enabled)

### Installation

```bash
# Clone the repository
git clone https://github.com/agent-crafters/Heistboard.git
cd Heistboard

# Install dependencies
pnpm install
```

### Development

```bash
# Start the local development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Production Build

```bash
# Compile and optimize for production
pnpm build

# Run the production server
pnpm start
```

### Testing & Verification

```bash
# Run unit and integration tests
pnpm test

# Run TypeScript type validation
pnpm typecheck

# Run code linter
pnpm lint
```

---

## ℹ️ Additional Information

### Privacy & Security
- **Zero Data Persistence:** No user accounts, remote databases, analytics scripts, or tracking cookies.
- **100% In-Memory Processing:** Search queries, coordinates, and custom portrait uploads are processed solely in local browser memory and never sent to a remote application server.
- **Resource Cleanup:** WebGL contexts, canvas instances, and object URLs are actively torn down upon navigation or mission reset to prevent memory leaks.

### Legal Attribution & Disclaimer
- **Map Data:** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors. Map tiles served via [OpenFreeMap](https://openfreemap.org).
- **Editor:** [React Image Editor](https://github.com/unlayer/react-image-editor) by Unlayer.
- **Disclaimer:** Heistboard is an original creative application built for fictional storytelling and entertainment. Stylized 3D maps and building extrusions are artistic approximations and are not designed or certified for real-world navigation, tactical operations, or security assessments.
