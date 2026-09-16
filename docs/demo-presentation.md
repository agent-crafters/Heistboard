# Heistboard Demo Presentation & Video Storyboard

## Overview
This document specifies the official 30–60 second video demonstration trailer and developer presentation for **Heistboard**.

The presentation is designed to be **completely understandable when muted**, utilizing high-contrast cinematic title cards, clear interface highlights, and authentic user interactions without fake loaders or synthetic effects.

---

## 🎬 Video Storyboard (45 Seconds Total Duration)

```
[00:00 - 00:07] Title Card & Case File Briefing
[00:07 - 00:18] Stage 02: Territory Search, 3D Pitch Angle & Camera Lock
[00:18 - 00:26] Stage 03: Operative Identity & Surveillance Portrait Filter
[00:26 - 00:36] Stage 04: Mission Plan Authoring in React Image Editor
[00:36 - 00:41] Stage 05: Cinematic Pullback Reveal Transition
[00:41 - 00:45] Final 2400 × 1600 Dossier Inspection & PNG Download
```

### Scene Breakdown

#### Scene 1: Operation Briefing (00:00 – 00:07)
- **Visual:** Browser opens to `http://localhost:3000`. Masthead displays `HEISTBOARD // TACTICAL INTELLIGENCE`. Case File panel displays *"Operation: The Last Delivery"*, *"Objective: Package before sunrise"*, and *"Fictional use only"*.
- **Action:** Cursor clicks the primary call-to-action button: `Start Operation: Select Territory →`.
- **On-Screen Text Overlay:** `STAGE 01 // CASE FILE BRIEFING`
- **Subtitles (for muted viewing):** *"A high-priority courier package must be routed across your neighborhood before sunrise."*

#### Scene 2: 3D Territory Composition & Lock (00:07 – 00:18)
- **Visual:** MapLibre 3D vector map loads with OpenFreeMap Liberty style. Tactical crosshairs and reticle frame the center region.
- **Action:** Operative types `"SoHo Manhattan"` into the search bar. Search returns disambiguated neighborhood candidates. User clicks the candidate; 3D camera smoothly flies to coordinates. Extruded 3D buildings appear.
- **Action:** User clicks preset angle `Isometric (45°)`, then fine-tunes pitch slider to 52°.
- **Action:** User clicks `Lock Territory Shot (Full Ratio)`.
- **On-Screen Text Overlay:** `STAGE 02 // 3D VECTOR TERRITORY COMPOSITION`
- **Subtitles:** *"Explore any neighborhood in 3D. Compose tactical camera angle with OSM building extrusions and lock the shot."*

#### Scene 3: Operative Field Identity (00:18 – 00:26)
- **Visual:** Identity stage opens. Catalog of tactical archetype badges and surveillance filters.
- **Action:** User enters callsign `"CIPHER"`, selects role `"THE INFILTRATOR"`, and applies `"Surveillance (CCTV)"` filter.
- **Action:** User clicks `Confirm Identity & Plan Route →`.
- **On-Screen Text Overlay:** `STAGE 03 // OPERATIVE IDENTITY & SURVEILLANCE BADGE`
- **Subtitles:** *"Establish field callsign and apply local surveillance filters to operative identity."*

#### Scene 4: Mission Plan Authoring in React Image Editor (00:26 – 00:36)
- **Visual:** React Image Editor initializes with the exact locked 3D territory raster as the authoring Map Base.
- **Action:** User clicks Step 1 `"Draw the route"` in the briefing; Draw tool activates; user sketches bold courier route across the avenues.
- **Action:** User places meeting point marker using Shapes; adds delivery note with Text tool (`"Rendezvous 04:30 AM"`).
- **Action:** User clicks `Save`.
- **On-Screen Text Overlay:** `STAGE 04 // REACT IMAGE EDITOR CORE AUTHORING`
- **Subtitles:** *"Plot delivery routes, mark drop points, and author notes directly onto the locked Map Base."*

#### Scene 5: Cinematic Pullback Reveal (00:36 – 00:41)
- **Visual:** Authored map pulls back smoothly in a ~2s cubic-bezier cinematic reveal animation directly into the complete final Dossier layout.
- **Action:** Skip button and countdown timer display. Dossier borders, operative card, and protected attribution seamlessly integrate with the authored map.
- **On-Screen Text Overlay:** `STAGE 05 // CINEMATIC DOSSIER REVEAL`
- **Subtitles:** *"Authentic pullback sequence reveals the complete tactical mission file."*

#### Scene 6: Final Artifact Inspection & Download (00:41 – 00:45)
- **Visual:** Final 2400 × 1600 landscape Dossier displayed. Cursor points to protected legal attribution block in lower right quadrant.
- **Action:** User clicks `Download Dossier PNG`. File `heistboard-dossier-the-last-delivery.png` downloads instantly.
- **On-Screen Text Overlay:** `FINAL ARTIFACT // DETERMINISTIC 2400 × 1600 PNG`
- **Subtitles:** *"Instant download of verified 2400 × 1600 final mission Dossier. Zero cloud storage. Zero tracking."*

---

## 🏆 Presentation Highlights for Hackathon Judges

1. **Authentic Authoring at the Core:** Unlike apps that produce generic AI hallucinations, Heistboard empowers users to physically create tactical marks on real-world vector maps using React Image Editor.
2. **Zero-Cost, Privacy-First Architecture:** Utilizes OpenFreeMap, OpenStreetMap Nominatim, and client-side Canvas 2D without requiring paid API keys, credit cards, user logins, or backend databases.
3. **Deterministic Continuity:** The exact 3D camera angles composed in Stage 2 carry through the editor into the final 2400 × 1600 exported artifact without resolution loss or reprojection artifacts.
4. **Accessible & Responsive:** Verified on mobile viewports (390px) up to 4K displays, with 44px tap targets, high-contrast focus indicators, keyboard skip links, and full reduced-motion support.
